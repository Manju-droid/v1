import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, RemoteParticipant, Track, TrackPublication, Participant, DisconnectReason } from 'livekit-client';
import { connectToLiveKitRoom } from '@/lib/livekitClient';

export type DebateRole = 'host' | 'agree' | 'disagree';

export type PeerInfo = {
  userId: string;
  role: DebateRole;
  stream: MediaStream | null;
  isMuted: boolean;
};

type UseDebateWebRTCParams = {
  currentUserId: string;
  currentRole: DebateRole;
  roomName: string;
};

type UseDebateWebRTCResult = {
  peers: PeerInfo[];
  isConnected: boolean;
  toggleLocalMute: () => void;
  localIsMuted: boolean;
  cleanupWebRTC: () => void; // Cleanup function for explicit cleanup
};

export function useDebateWebRTC(params: UseDebateWebRTCParams): UseDebateWebRTCResult {
  const { currentUserId, currentRole, roomName } = params;
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [localIsMuted, setLocalIsMuted] = useState(true); // Start muted by default
  const roomRef = useRef<Room | null>(null);
  const userInitiatedMuteRef = useRef<boolean>(false); // Track if user manually muted/unmuted
  const lastToggleTimeRef = useRef<number>(0); // Track when user last toggled (to prevent event interference)
  const isTogglingRef = useRef<boolean>(false); // Prevent concurrent toggles
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce timeout

  // Helper to get role from participant metadata or default
  const getRoleFromParticipant = (participant: RemoteParticipant): DebateRole => {
    // Try to read from metadata if available
    const metadata = participant.metadata;
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata);
        if (parsed.role === 'host' || parsed.role === 'agree' || parsed.role === 'disagree') {
          return parsed.role;
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    // Default to 'agree' for now
    return 'agree';
  };

  // Helper to create MediaStream from audio track
  const createStreamFromTrack = (track: Track): MediaStream => {
    const stream = new MediaStream();
    stream.addTrack(track.mediaStreamTrack);
    return stream;
  };

  // Update peer in the list
  const updatePeer = useCallback((userId: string, update: Partial<PeerInfo>) => {
    setPeers(prev => {
      const existing = prev.find(p => p.userId === userId);
      if (existing) {
        return prev.map(p => p.userId === userId ? { ...p, ...update } : p);
      } else if (update.userId) {
        return [...prev, { userId, role: 'agree', stream: null, isMuted: false, ...update }];
      }
      return prev;
    });
  }, []);

  // Remove peer from the list
  const removePeer = useCallback((userId: string) => {
    setPeers(prev => {
      const peer = prev.find(p => p.userId === userId);
      if (peer?.stream) {
        // Clean up the stream
        peer.stream.getTracks().forEach(track => track.stop());
      }
      return prev.filter(p => p.userId !== userId);
    });
  }, []);

  // Connect to LiveKit room
  const previousRoleRef = useRef<DebateRole | null>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const previousRoomNameRef = useRef<string | null>(null);
  const isUpdatingMetadataRef = useRef<boolean>(false); // Flag to prevent concurrent metadata updates
  
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL;
    if (!wsUrl) {
      console.error('[LiveKit] NEXT_PUBLIC_LIVEKIT_WS_URL not set');
      return;
    }

    // Check if only role changed (not user or room) - if so, just update metadata
    // IMPORTANT: Only skip reconnection if room is already connected
    // If room is not connected yet, we need to connect first
    const onlyRoleChanged = 
      previousUserIdRef.current === currentUserId &&
      previousRoomNameRef.current === roomName &&
      previousRoleRef.current !== currentRole &&
      previousRoleRef.current !== null &&
      roomRef.current &&
      roomRef.current.state === 'connected' &&
      isConnected; // Also check our internal connected state
    
    if (onlyRoleChanged) {
      console.log('[LiveKit] Only role changed, room is connected, updating metadata without reconnecting');
      console.log('[LiveKit] Only role changed, updating metadata without reconnecting:', previousRoleRef.current, '->', currentRole);
      // Update metadata without reconnecting
      // CRITICAL: Don't block mute operations - metadata update is non-blocking and low priority
      // Also, don't prevent microphone permission requests
      if (roomRef.current && roomRef.current.localParticipant && 
          roomRef.current.state === 'connected') {
        // Update metadata in background - don't wait for it
        // If mute operation is in progress, skip metadata update entirely
        if (!isTogglingRef.current) {
          // Update metadata asynchronously without blocking
          const updateMetadata = async () => {
            if (isUpdatingMetadataRef.current) {
              console.log('[LiveKit] Metadata update already in progress, skipping');
              return;
            }
            
            isUpdatingMetadataRef.current = true;
            
            try {
              // Set metadata with timeout to prevent blocking
              const metadataPromise = roomRef.current!.localParticipant.setMetadata(JSON.stringify({ role: currentRole }));
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Metadata update timeout')), 2000)
              );
              
              await Promise.race([metadataPromise, timeoutPromise]);
              console.log('[LiveKit] Metadata updated successfully (role change)');
            } catch (err: any) {
              console.warn('[LiveKit] Failed to update metadata (non-critical):', err);
              // Don't block if metadata update fails - it's not critical
            } finally {
              // Always clear flag quickly to prevent it from blocking mute operations
              setTimeout(() => {
                isUpdatingMetadataRef.current = false;
              }, 100); // Very short delay
            }
          };
          
          // Run metadata update in background - don't await
          updateMetadata().catch(err => {
            console.warn('[LiveKit] Metadata update error (ignored):', err);
            isUpdatingMetadataRef.current = false;
          });
        } else {
          console.log('[LiveKit] Metadata update skipped (mute operation in progress)');
        }
      }
      previousRoleRef.current = currentRole;
      return; // Don't reconnect
    }

    let room: Room | null = null;
    let isMounted = true;
    let isIntentionallyLeaving = false; // Flag to prevent reconnection during intentional leave
    let muteSyncIntervalRef: NodeJS.Timeout | null = null;
    let metadataCheckInterval: NodeJS.Timeout | null = null;
    let originalConsoleError: typeof console.error | null = null;
    let originalConsoleWarn: typeof console.warn | null = null;

    const connect = async () => {
      try {
        console.log('[LiveKit] Connecting to room:', roomName, 'as user:', currentUserId);
        room = await connectToLiveKitRoom(roomName, currentUserId);
        if (!isMounted) {
          await room.disconnect();
          return;
        }

        roomRef.current = room;

        // Wait for room to be fully connected
        const waitForConnection = new Promise<void>((resolve) => {
          if (room && room.state === 'connected') {
            resolve();
            return;
          }
          if (!room) {
            resolve();
            return;
          }
          const onConnected = () => {
            if (room) {
              room.off(RoomEvent.Connected, onConnected);
            }
            resolve();
          };
          room.on(RoomEvent.Connected, onConnected);
        });

        await waitForConnection;

        if (!isMounted) {
          await room.disconnect();
          return;
        }

        setIsConnected(true);
        
        // Suppress DataChannel errors - these are harmless warnings from LiveKit's internal channels
        // They occur during reconnection and don't affect functionality
        if (!originalConsoleError) {
          originalConsoleError = console.error;
          originalConsoleWarn = console.warn;
          
          const suppressDataChannelErrors = (...args: any[]) => {
            const message = args[0]?.toString() || '';
            if (message.includes('DataChannel error') || message.includes('Unknown DataChannel error')) {
              // Suppress these specific errors - they're harmless warnings from LiveKit
              return;
            }
            originalConsoleError!.apply(console, args);
          };
          
          const suppressDataChannelWarnings = (...args: any[]) => {
            const message = args[0]?.toString() || '';
            if (message.includes('DataChannel error') || message.includes('Unknown DataChannel error')) {
              // Suppress these specific warnings - they're harmless warnings from LiveKit
              return;
            }
            originalConsoleWarn!.apply(console, args);
          };
          
          console.error = suppressDataChannelErrors;
          console.warn = suppressDataChannelWarnings;
          
          // Restore original console methods when room disconnects
          const restoreConsole = () => {
            if (originalConsoleError) {
              console.error = originalConsoleError;
              originalConsoleError = null;
            }
            if (originalConsoleWarn) {
              console.warn = originalConsoleWarn;
              originalConsoleWarn = null;
            }
          };
          room.on(RoomEvent.Disconnected, restoreConsole);
        }
        
        // Handle disconnection - don't reconnect if we're intentionally leaving
        room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
          if (!isMounted) return;
          console.log('[LiveKit] Disconnected from room, reason:', reason);
          if (isIntentionallyLeaving) {
            console.log('[LiveKit] Disconnected due to intentional leave, not reconnecting');
            setIsConnected(false);
            return;
          }
          // Only try to reconnect if it wasn't intentional
          setIsConnected(false);
        });
        
        // Handle reconnecting - prevent if we're intentionally leaving
        room.on(RoomEvent.Reconnecting, () => {
          if (!isMounted || isIntentionallyLeaving) {
            console.log('[LiveKit] Reconnecting prevented - intentionally leaving');
            return;
          }
          console.log('[LiveKit] Reconnecting to room...');
        });
        
        // Handle reconnected - resubscribe to all tracks (critical for Safari and rejoin)
        room.on(RoomEvent.Reconnected, () => {
          if (!isMounted || !room || isIntentionallyLeaving) return;
          console.log('[LiveKit] ✅ Reconnected to room, resubscribing to all tracks...');
          
          // Resubscribe to all existing participants' tracks
          setTimeout(() => {
            if (!room || room.state === 'disconnected') return;
            room.remoteParticipants.forEach((participant) => {
              participant.audioTrackPublications.forEach((publication) => {
                if (publication.kind === 'audio' && publication.trackSid) {
                  // If track is already subscribed, add peer immediately
                  if (publication.track && publication.isSubscribed) {
                    const stream = createStreamFromTrack(publication.track);
                    const role = getRoleFromParticipant(participant);
                    updatePeer(participant.identity, {
                      userId: participant.identity,
                      role,
                      stream,
                      isMuted: publication.isMuted,
                    });
                    console.log('[LiveKit] ✅ Resubscribed to track after reconnect:', participant.identity);
                  } else {
                    // Track exists but not subscribed - LiveKit should auto-subscribe
                    // But we can also try to ensure subscription
                    console.log('[LiveKit] Track exists but not subscribed after reconnect, waiting for subscription:', participant.identity);
                    // LiveKit will auto-subscribe, TrackSubscribed event will handle it
                  }
                }
              });
            });
          }, 500); // Wait a bit for tracks to be ready
        });

        // Set participant metadata with role first
        // Wait a bit to ensure room is fully ready before setting metadata
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Only set metadata if room is still connected and mounted
        if (!isMounted || !room || room.state !== 'connected') {
          return;
        }
        
        try {
          // Set metadata with timeout to prevent blocking
          const metadataPromise = room.localParticipant.setMetadata(JSON.stringify({ role: currentRole }));
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Metadata update timeout')), 5000)
          );
          
          await Promise.race([metadataPromise, timeoutPromise]);
          console.log('[LiveKit] Initial metadata set successfully');
        } catch (err: any) {
          console.warn('[LiveKit] Failed to set initial metadata:', err);
          // Don't block connection if metadata fails - it's not critical
        } finally {
          // Always clear the flag after a short delay to prevent it from getting stuck
          setTimeout(() => {
            isUpdatingMetadataRef.current = false;
          }, 500);
        }
        
        // Update metadata when role changes (without reconnecting)
        const updateMetadataIfNeeded = async () => {
          // Don't block if already updating, but don't prevent mute operations
          if (isUpdatingMetadataRef.current) {
            return;
          }
          
          if (!room || !room.localParticipant || !isMounted || room.state !== 'connected') {
            return;
          }
          
          const currentMetadata = room.localParticipant.metadata;
          let currentMetadataRole = null;
          try {
            if (currentMetadata) {
              const parsed = JSON.parse(currentMetadata);
              currentMetadataRole = parsed.role;
            }
          } catch (e) {
            // Invalid metadata, ignore
          }
          
          // Only update if role actually changed
          if (currentMetadataRole !== currentRole) {
            isUpdatingMetadataRef.current = true;
            console.log('[LiveKit] Role changed, updating metadata:', currentMetadataRole, '->', currentRole);
            try {
              // Set metadata with timeout to prevent blocking
              const metadataPromise = room.localParticipant.setMetadata(JSON.stringify({ role: currentRole }));
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Metadata update timeout')), 5000)
              );
              
              await Promise.race([metadataPromise, timeoutPromise]);
              console.log('[LiveKit] Metadata updated successfully');
            } catch (err: any) {
              console.warn('[LiveKit] Failed to update metadata:', err);
              // Don't block if metadata update fails
            } finally {
              // Always clear flag after a short delay to prevent it from getting stuck
              setTimeout(() => {
                isUpdatingMetadataRef.current = false;
              }, 500);
            }
          }
        };
        
        // Check and update metadata periodically (in case role changes after connection)
        // Increased interval to 5 seconds to reduce load and prevent timeouts
        metadataCheckInterval = setInterval(updateMetadataIfNeeded, 5000);

        // For now, don't automatically enable/disable microphone on connect
        // User must explicitly click to unmute, which will request permission and publish track
        // This prevents permission popups on page load
        setLocalIsMuted(true);
        console.log('[LiveKit] Connected to room. Microphone will be enabled when user clicks unmute.');
        
        // CRITICAL: Subscribe to all existing participants' tracks immediately after connection
        // This ensures we can hear others after rejoin without refresh
        console.log('[LiveKit] Subscribing to existing participants\' tracks...');
        room.remoteParticipants.forEach((participant) => {
          participant.audioTrackPublications.forEach((publication) => {
            if (publication.kind === 'audio' && publication.trackSid) {
              console.log('[LiveKit] Found existing audio track:', {
                participant: participant.identity,
                trackSid: publication.trackSid,
                isSubscribed: publication.isSubscribed,
                hasTrack: !!publication.track,
              });
              
              // If track is already subscribed, add peer immediately
              if (publication.track && publication.isSubscribed) {
                const stream = createStreamFromTrack(publication.track);
                const role = getRoleFromParticipant(participant);
                updatePeer(participant.identity, {
                  userId: participant.identity,
                  role,
                  stream,
                  isMuted: publication.isMuted,
                });
                console.log('[LiveKit] ✅ Added existing peer on connect:', participant.identity);
              } else {
                // Track exists but not subscribed yet - LiveKit will auto-subscribe, wait for TrackSubscribed event
                console.log('[LiveKit] Track exists but not subscribed yet, waiting for subscription:', participant.identity);
              }
            }
          });
        });

        // Handle track published (when someone publishes a new track - including after refresh)
        const handleTrackPublished = (publication: TrackPublication, participant: RemoteParticipant) => {
          if (!isMounted || !room || room.state === 'disconnected' || participant.identity === currentUserId) return;
          
          if (publication.kind === 'audio') {
            console.log('[LiveKit] 🔊 Audio track published by:', participant.identity, {
              trackSid: publication.trackSid,
              isMuted: publication.isMuted,
            });
            // LiveKit automatically subscribes to published tracks
            // The TrackSubscribed event will handle adding the peer
            // But we can also proactively check if it's already subscribed
            setTimeout(() => {
              if (publication.track && publication.isSubscribed) {
                const stream = createStreamFromTrack(publication.track);
                const role = getRoleFromParticipant(participant);
                updatePeer(participant.identity, {
                  userId: participant.identity,
                  role,
                  stream,
                  isMuted: publication.isMuted,
                });
                console.log('[LiveKit] ✅ Added peer from TrackPublished:', participant.identity);
              }
            }, 100); // Small delay to allow subscription to complete
          }
        };
        room.on(RoomEvent.TrackPublished, handleTrackPublished);

        // Handle track subscribed
        const handleTrackSubscribed = (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;

          if (track.kind === 'audio' && participant.identity !== currentUserId) {
            console.log('[LiveKit] ✅ Audio track subscribed from:', participant.identity, {
              trackSid: publication.trackSid,
              isMuted: publication.isMuted,
              hasTrack: !!track,
            });
            const stream = createStreamFromTrack(track);
            const role = getRoleFromParticipant(participant);
            
            updatePeer(participant.identity, {
              userId: participant.identity,
              role,
              stream,
              isMuted: publication.isMuted,
            });
            console.log('[LiveKit] ✅ Peer added/updated:', participant.identity, 'role:', role);
          }
        };
        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

        // Handle track unsubscribed
        const handleTrackUnsubscribed = (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;

          if (track.kind === 'audio' && participant.identity !== currentUserId) {
            console.log('[LiveKit] Audio track unsubscribed from:', participant.identity);
            // Don't remove peer immediately, just update stream
            updatePeer(participant.identity, { stream: null });
          }
        };
        room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

        // Handle participant disconnected
        const handleParticipantDisconnected = (participant: RemoteParticipant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          console.log('[LiveKit] Participant disconnected:', participant.identity);
          removePeer(participant.identity);
        };
        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

        // Handle track muted/unmuted
        const handleTrackMuted = (publication: TrackPublication, participant: Participant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          if (participant.identity !== currentUserId && publication.kind === 'audio') {
            console.log('[LiveKit] 🔇 Track muted:', participant.identity, {
              trackSid: publication.trackSid,
              source: publication.source,
            });
            updatePeer(participant.identity, { isMuted: true });
          }
        };
        room.on(RoomEvent.TrackMuted, handleTrackMuted);

        const handleTrackUnmuted = (publication: TrackPublication, participant: Participant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          if (participant.identity !== currentUserId && publication.kind === 'audio') {
            console.log('[LiveKit] 🔊 Track unmuted:', participant.identity, {
              trackSid: publication.trackSid,
              source: publication.source,
            });
            updatePeer(participant.identity, { isMuted: false });
          }
        };
        room.on(RoomEvent.TrackUnmuted, handleTrackUnmuted);
        
        // Also listen for participant metadata updates (in case mute state is in metadata)
        const handleParticipantMetadataChanged = (metadata: string | undefined, participant: Participant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          if (participant.identity !== currentUserId) {
            console.log('[LiveKit] Participant metadata changed:', participant.identity, metadata);
            // Check all audio tracks for this participant
            participant.audioTrackPublications.forEach((publication) => {
              if (publication.kind === 'audio') {
                updatePeer(participant.identity, { isMuted: publication.isMuted });
                console.log('[LiveKit] Updated peer mute state from metadata change:', participant.identity, publication.isMuted);
              }
            });
          }
        };
        room.on(RoomEvent.ParticipantMetadataChanged, handleParticipantMetadataChanged);
        
        // Periodic sync of mute states (fallback in case events don't fire)
        // IMPORTANT: Only sync from muted->unmuted, never from unmuted->muted
        // This prevents auto-mute issues while still allowing sync for unmute events
        const syncMuteStates = () => {
          if (!isMounted || !room) return;
          
          // Don't sync if user just manually toggled
          if (userInitiatedMuteRef.current) {
            return;
          }
          
          const localMicPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
          if (localMicPublication && localMicPublication.kind === 'audio') {
            const actualMuted = localMicPublication.isMuted;
            setLocalIsMuted(prev => {
              // CRITICAL: Only sync if going from muted to unmuted (never the reverse)
              // This prevents auto-mute while still allowing sync for legitimate unmutes
              if (prev && !actualMuted) {
                // Local state says muted, but LiveKit says unmuted - allow sync (user might have unmuted externally)
                console.log('[LiveKit] 🔄 Syncing unmute state (muted->unmuted):', {
                  current: prev,
                  actual: actualMuted,
                });
                return actualMuted;
              }
              // CRITICAL: Never sync from unmuted->muted (prevents auto-mute)
              // This is the key protection - if user is unmuted, never mute them via sync
              if (!prev && actualMuted) {
                console.log('[LiveKit] 🔄 Skipping sync (would auto-mute, user has control) - keeping unmuted state');
                // Also try to fix LiveKit's state if it thinks we're muted
                setTimeout(() => {
                  if (room && room.localParticipant) {
                    const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
                    if (micPub && micPub.isMuted) {
                      console.log('[LiveKit] 🔄 Attempting to fix LiveKit mute state (user is unmuted)');
                      room.localParticipant.setMicrophoneEnabled(true).catch(err => {
                        console.warn('[LiveKit] Could not fix mute state:', err);
                      });
                    }
                  }
                }, 100);
                return prev; // Keep unmuted state
              }
              return prev;
            });
          }
          
          // Sync remote participants
          room.remoteParticipants.forEach((participant) => {
            if (participant.identity === currentUserId) return;
            participant.audioTrackPublications.forEach((publication) => {
              if (publication.kind === 'audio') {
                // Get current peers state directly from setPeers callback
                setPeers(prev => {
                  const currentPeer = prev.find(p => p.userId === participant.identity);
                  const actualMuted = publication.isMuted;
                  // Only update if state differs to avoid unnecessary re-renders
                  if (currentPeer && currentPeer.isMuted !== actualMuted) {
                    console.log('[LiveKit] 🔄 Syncing mute state:', participant.identity, {
                      current: currentPeer.isMuted,
                      actual: actualMuted,
                    });
                    return prev.map(p => 
                      p.userId === participant.identity 
                        ? { ...p, isMuted: actualMuted }
                        : p
                    );
                  }
                  return prev;
                });
              }
            });
          });
        };
        
        // Sync every 2 seconds as a fallback
        // Start sync after a delay to avoid interfering with initial state setup after refresh
        setTimeout(() => {
          muteSyncIntervalRef = setInterval(syncMuteStates, 2000);
          console.log('[LiveKit] Started periodic sync (after initial delay)');
        }, 5000); // Start sync after 5 seconds (gives time for initial state to settle after refresh)

        // Sync local mute state with LiveKit's actual state
        // IMPORTANT: On refresh, don't auto-mute if user was unmuted
        // Only set initial state if track exists, otherwise keep default (muted)
        const localMicPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (localMicPublication) {
          const initialMuted = localMicPublication.isMuted;
          // If track exists and is unmuted, respect that (user might have been unmuted before refresh)
          // If track exists and is muted, that's fine too
          setLocalIsMuted(initialMuted);
          console.log('[LiveKit] Initial microphone state:', initialMuted ? 'muted' : 'unmuted');
          
          // If user was unmuted before refresh, mark as user-initiated to prevent auto-mute
          // Keep protection active - sync will never mute anyway, but this adds extra safety
          if (!initialMuted) {
            userInitiatedMuteRef.current = true;
            // Don't clear this flag - keep protection active
            // The sync logic already prevents auto-mute, but this adds extra safety
            console.log('[LiveKit] User was unmuted before refresh - protection active');
          }
        } else {
          console.log('[LiveKit] No microphone track published yet');
        }

        // Listen for local track mute/unmute events to keep state in sync
        const handleLocalTrackPublished = (publication: TrackPublication) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          if (publication.kind === 'audio') {
            setLocalIsMuted(publication.isMuted);
            console.log('[LiveKit] Local track published, mute state:', publication.isMuted);
          }
        };
        room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);

        const handleLocalTrackUnpublished = (publication: TrackPublication) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          if (publication.kind === 'audio') {
            console.log('[LiveKit] Local track unpublished event received');
            // CRITICAL: Don't auto-mute if user is currently unmuted
            // Only update if we're currently muted (allow state sync when already muted)
            setLocalIsMuted(prev => {
              // If user is unmuted, don't mute them (even if track is unpublished)
              // Track might be unpublished temporarily but user wants to stay unmuted
              if (!prev) {
                console.log('[LiveKit] Ignoring track unpublished event (user is unmuted, keeping unmuted state)');
                return prev; // Keep unmuted
              }
              // If already muted, allow the update (might be a legitimate state change)
              return true;
            });
          }
        };
        room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

        // CRITICAL: Listen for local track mute/unmute events
        // These events fire when the track mute state changes (not just publish/unpublish)
        const handleLocalTrackMuted = (publication: TrackPublication, participant: Participant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          // Only handle local participant events
          if (participant.identity !== currentUserId) return;
          if (publication.kind === 'audio') {
            console.log('[LiveKit] 🔇 Local track muted event received, userInitiated:', userInitiatedMuteRef.current);
            // CRITICAL: Never auto-mute if user is currently unmuted OR if user just toggled
            // Only update if we're currently muted AND user didn't just toggle
            setLocalIsMuted(prev => {
              // Check if user just toggled (within last 2 seconds) - this handles async state updates
              const timeSinceToggle = Date.now() - lastToggleTimeRef.current;
              const recentlyToggled = timeSinceToggle < 2000; // 2 second window
              
              // If user just toggled OR flag is set, ignore the event (toggle function handles state directly)
              if (userInitiatedMuteRef.current || recentlyToggled) {
                console.log('[LiveKit] 🔇 Ignoring mute event (user just toggled, toggle function handles state)', {
                  flag: userInitiatedMuteRef.current,
                  recentlyToggled,
                  timeSinceToggle,
                });
                return prev; // Keep current state - toggle function will update it directly
              }
              
              // If user is unmuted, never mute them (even if event says muted)
              // BUT: If we're trying to mute (prev should be false but we want true), this is a legitimate user action
              // The issue is that prev might still be false due to async state, so we need to check the actual LiveKit state
              if (!prev) {
                // Check if LiveKit actually wants us muted (user might have clicked mute)
                // If the publication is muted and we're not, but user didn't just toggle, it might be legitimate
                // However, to be safe, we'll only allow this if the flag was recently set (within 3 seconds)
                const timeSinceLastToggle = Date.now() - lastToggleTimeRef.current;
                if (timeSinceLastToggle < 3000) {
                  // User might have just toggled, allow the mute
                  console.log('[LiveKit] 🔇 Allowing mute event (recent toggle detected)', {
                    timeSinceLastToggle,
                  });
                  return true; // Allow mute
                }
                
                console.log('[LiveKit] 🔇 Ignoring mute event (user is unmuted, keeping unmuted state)');
                // Try to fix LiveKit's state
                setTimeout(() => {
                  if (room && room.localParticipant) {
                    const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
                    if (micPub && micPub.isMuted) {
                      console.log('[LiveKit] 🔄 Attempting to fix LiveKit mute state from event');
                      room.localParticipant.setMicrophoneEnabled(true).catch(err => {
                        console.warn('[LiveKit] Could not fix mute state:', err);
                      });
                    }
                  }
                }, 100);
                return prev; // Keep unmuted
              }
              // If already muted, allow the update (might be a legitimate state change)
              return true;
            });
          }
        };
        room.on(RoomEvent.TrackMuted, handleLocalTrackMuted);

        const handleLocalTrackUnmuted = (publication: TrackPublication, participant: Participant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          // Only handle local participant events
          if (participant.identity !== currentUserId) return;
          if (publication.kind === 'audio') {
            console.log('[LiveKit] 🔊 Local track unmuted event received');
            setLocalIsMuted(false);
          }
        };
        room.on(RoomEvent.TrackUnmuted, handleLocalTrackUnmuted);

        // Handle existing participants and subscribe to their tracks
        // This is critical for Safari - we need to explicitly subscribe after rejoin
        room.remoteParticipants.forEach((participant) => {
          console.log('[LiveKit] Found existing remote participant:', participant.identity);
          participant.audioTrackPublications.forEach((publication) => {
            console.log('[LiveKit] Found audio track publication:', {
              participant: participant.identity,
              trackSid: publication.trackSid,
              isSubscribed: publication.isSubscribed,
              isMuted: publication.isMuted,
              hasTrack: !!publication.track,
            });
            
            // Subscribe to all audio tracks
            if (publication.kind === 'audio') {
              if (publication.track && publication.isSubscribed) {
                // Track is already subscribed - add peer immediately
                const stream = createStreamFromTrack(publication.track);
                const role = getRoleFromParticipant(participant);
                updatePeer(participant.identity, {
                  userId: participant.identity,
                  role,
                  stream,
                  isMuted: publication.isMuted,
                });
                console.log('[LiveKit] Added peer from existing participant:', participant.identity);
              } else if (publication.trackSid) {
                // Track exists but not subscribed - explicitly subscribe (important for Safari)
                console.log('[LiveKit] Track exists but not subscribed, subscribing...');
                // LiveKit automatically subscribes, but we can force it by setting subscription
                // Wait a bit for LiveKit to process, then check again
                setTimeout(() => {
                  if (publication.track && publication.isSubscribed) {
                    const stream = createStreamFromTrack(publication.track);
                    const role = getRoleFromParticipant(participant);
                    updatePeer(participant.identity, {
                      userId: participant.identity,
                      role,
                      stream,
                      isMuted: publication.isMuted,
                    });
                    console.log('[LiveKit] Added peer after subscription delay:', participant.identity);
                  } else {
                    console.warn('[LiveKit] Track still not subscribed after delay for:', participant.identity);
                  }
                }, 500);
              }
            }
          });
        });

        // Handle new participants joining (including reconnections after refresh)
        const handleParticipantConnected = (participant: RemoteParticipant) => {
          if (!isMounted || !room || room.state === 'disconnected') return;
          console.log('[LiveKit] ✅ Participant connected:', participant.identity, {
            metadata: participant.metadata,
            audioTracks: participant.audioTrackPublications.size,
          });
          
          // Subscribe to their audio tracks immediately
          participant.audioTrackPublications.forEach((publication) => {
            if (publication.kind === 'audio') {
              console.log('[LiveKit] Found audio track on participant connect:', {
                participant: participant.identity,
                trackSid: publication.trackSid,
                isSubscribed: publication.isSubscribed,
                hasTrack: !!publication.track,
              });
              
              // If track is already subscribed, add peer immediately
              if (publication.track && publication.isSubscribed) {
                const stream = createStreamFromTrack(publication.track);
                const role = getRoleFromParticipant(participant);
                updatePeer(participant.identity, {
                  userId: participant.identity,
                  role,
                  stream,
                  isMuted: publication.isMuted,
                });
                console.log('[LiveKit] ✅ Added peer immediately on connect:', participant.identity);
              }
              // Otherwise, wait for TrackSubscribed event
            }
          });
        };
        room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

      } catch (error) {
        console.error('[LiveKit] Connection error:', error);
        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    // Update refs before connecting (so next render knows what changed)
    previousRoleRef.current = currentRole;
    previousUserIdRef.current = currentUserId;
    previousRoomNameRef.current = roomName;

    connect();

    return () => {
      isMounted = false;
      isIntentionallyLeaving = true; // Mark that we're intentionally leaving
      
      // Clear mute sync interval
      if (muteSyncIntervalRef) {
        clearInterval(muteSyncIntervalRef);
        muteSyncIntervalRef = null;
      }
      
      // Clear metadata check interval
      if (metadataCheckInterval) {
        clearInterval(metadataCheckInterval);
        metadataCheckInterval = null;
      }
      
      if (room) {
        console.log('[LiveKit] Disconnecting from room (intentional leave)');
        // Disconnect gracefully - this will prevent reconnection attempts
        try {
          // Note: We don't remove event listeners here because:
          // 1. All handlers check `room.state === 'disconnected'` before processing
          // 2. This prevents "skipping incoming track after Room disconnected" warnings
          // 3. LiveKit will automatically clean up listeners when room disconnects
          
          // Stop all tracks first - this is critical for Safari to release microphone
          console.log('[LiveKit] Stopping all tracks for cleanup...');
          
          // Stop all track publications
          room.localParticipant.trackPublications.forEach((publication) => {
            if (publication.track) {
              console.log('[LiveKit] Stopping track:', publication.track.kind, publication.track.id);
              try {
                publication.track.stop();
                // Also stop the underlying MediaStreamTrack
                if (publication.track.mediaStreamTrack) {
                  publication.track.mediaStreamTrack.stop();
                  // Disable it as well for Safari
                  publication.track.mediaStreamTrack.enabled = false;
                }
              } catch (err: any) {
                console.warn('[LiveKit] Error stopping track:', err);
              }
            }
          });
          
          // Also stop any active media streams from the local participant
          if (room.localParticipant && room.localParticipant.audioTrackPublications) {
            room.localParticipant.audioTrackPublications.forEach((publication) => {
              if (publication.track) {
                console.log('[LiveKit] Stopping audio track:', publication.track.id);
                try {
                  publication.track.stop();
                  if (publication.track.mediaStreamTrack) {
                    publication.track.mediaStreamTrack.stop();
                    publication.track.mediaStreamTrack.enabled = false;
                  }
                } catch (err: any) {
                  console.warn('[LiveKit] Error stopping audio track:', err);
                }
              }
            });
          }
          
          // Also try to disable microphone explicitly (don't await - cleanup can't be async)
          room.localParticipant.setMicrophoneEnabled(false)
            .then(() => {
              console.log('[LiveKit] Microphone disabled');
            })
            .catch((err: any) => {
              console.warn('[LiveKit] Error disabling microphone:', err);
            });
          
          // Restore console methods before disconnecting
          if (originalConsoleError) {
            console.error = originalConsoleError;
            originalConsoleError = null;
          }
          if (originalConsoleWarn) {
            console.warn = originalConsoleWarn;
            originalConsoleWarn = null;
          }
          
          // Disconnect - LiveKit will handle cleanup
          // The isIntentionallyLeaving flag will prevent reconnection in event handlers
          room.disconnect().catch((err) => {
            // Ignore errors during cleanup - we're intentionally leaving
            console.log('[LiveKit] Cleanup disconnect (expected):', err.message);
          });
          
          // Clear any pending toggle timeouts
          if (toggleTimeoutRef.current) {
            clearTimeout(toggleTimeoutRef.current);
            toggleTimeoutRef.current = null;
          }
          
          // Reset ALL toggle flags and state (critical for rejoin to work)
          isTogglingRef.current = false;
          userInitiatedMuteRef.current = false;
          lastToggleTimeRef.current = 0;
          setLocalIsMuted(true); // Reset to muted state
          
          console.log('[LiveKit] ✅ All toggle flags and state reset for clean rejoin');
        } catch (err: any) {
          console.log('[LiveKit] Error during cleanup (ignored):', err.message);
        }
        
        // Reset all state for clean rejoin
        roomRef.current = null;
        setIsConnected(false);
        setPeers([]);
        setLocalIsMuted(true); // Ensure muted state is reset
      }
    };
  }, [roomName, currentUserId, currentRole, updatePeer, removePeer]);

  // Toggle local mute
  const toggleLocalMute = useCallback(async () => {
    // CRITICAL: Check room state FIRST before any debounce logic
    const room = roomRef.current;
    if (!room || !room.localParticipant) {
      console.warn('[LiveKit] Cannot toggle mute: room or localParticipant not available', {
        hasRoom: !!room,
        hasLocalParticipant: !!room?.localParticipant,
        roomState: room?.state,
      });
      return;
    }
    
    // Check room state - must be connected to toggle
    if (room.state !== 'connected') {
      console.warn('[LiveKit] Cannot toggle mute: room not connected', {
        roomState: room.state,
      });
      return;
    }
    
    // CRITICAL: Metadata updates should NEVER block mute operations
    // If metadata is being updated, we'll proceed anyway - mute operations take priority
    // Also, microphone permission requests should never be blocked
    if (isUpdatingMetadataRef.current) {
      console.log('[LiveKit] Metadata update in progress, but proceeding with mute toggle (mute operations take priority)');
      // Force clear the flag to prevent blocking - mute operations are more important
      isUpdatingMetadataRef.current = false;
    }
    
    // CRITICAL: Ensure we can request microphone permission even during role changes
    // Don't let any flags prevent permission requests
    
    // Debounce: Prevent rapid toggles (reduced from 300ms to 200ms for better responsiveness)
    const now = Date.now();
    if (isTogglingRef.current) {
      console.log('[LiveKit] Toggle already in progress, skipping');
      return;
    }
    
    // Only debounce if last toggle was very recent (within 200ms)
    if (now - lastToggleTimeRef.current < 200) {
      console.log('[LiveKit] Toggle debounced - too soon');
      return;
    }
    
    // Set toggling flag to prevent concurrent toggles
    isTogglingRef.current = true;
    lastToggleTimeRef.current = now;
    
    // Clear any existing timeout
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
      toggleTimeoutRef.current = null;
    }
    
    // Always clear flag on exit (success or error)
    const clearToggleFlag = () => {
      isTogglingRef.current = false;
      // Also clear the safety timeout
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
        toggleTimeoutRef.current = null;
      }
    };
    
    // Safety timeout: if toggle takes more than 5 seconds, clear the flag
    // This prevents the flag from getting stuck if something goes wrong
    toggleTimeoutRef.current = setTimeout(() => {
      if (isTogglingRef.current) {
        console.warn('[LiveKit] Toggle flag stuck, clearing it after timeout');
        clearToggleFlag();
      }
    }, 5000);

    // Wait for room to be ready if needed (critical for Safari after rejoin)
    if (room.state !== 'connected') {
      console.log('[LiveKit] Waiting for room to be connected before toggling mute...', {
        currentState: room.state,
        isReconnecting: room.state === 'reconnecting',
      });
      
      // If reconnecting, wait for reconnected event
      if (room.state === 'reconnecting') {
        await new Promise<void>((resolve) => {
          const onReconnected = () => {
            room.off(RoomEvent.Reconnected, onReconnected);
            // Wait a bit more for tracks to be ready
            setTimeout(() => resolve(), 300);
          };
          room.on(RoomEvent.Reconnected, onReconnected);
          
          // Also listen for connected in case it connects directly
          const onConnected = () => {
            room.off(RoomEvent.Connected, onConnected);
            room.off(RoomEvent.Reconnected, onReconnected);
            setTimeout(() => resolve(), 300);
          };
          room.on(RoomEvent.Connected, onConnected);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            room.off(RoomEvent.Reconnected, onReconnected);
            room.off(RoomEvent.Connected, onConnected);
            console.warn('[LiveKit] Timeout waiting for room connection');
            resolve();
          }, 10000);
        });
      } else {
        // Wait for connected event
        await new Promise<void>((resolve) => {
          if (room.state === 'connected') {
            resolve();
            return;
          }
          const onConnected = () => {
            room.off(RoomEvent.Connected, onConnected);
            setTimeout(() => resolve(), 300); // Wait a bit for tracks to be ready
          };
          room.on(RoomEvent.Connected, onConnected);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            room.off(RoomEvent.Connected, onConnected);
            console.warn('[LiveKit] Timeout waiting for room connection');
            resolve();
          }, 10000);
        });
      }
    }

    const newMutedState = !localIsMuted;
    
    
    // IMPORTANT: Always allow manual toggles to work, regardless of protection flag
    // The protection flag only prevents AUTO-mute (from sync/events), not manual mutes
    // Mark that user is manually toggling (prevents sync from overriding during toggle)
    userInitiatedMuteRef.current = true;
    lastToggleTimeRef.current = Date.now(); // Record when user toggled
    
    
    // Clear flag function - will be called after successful toggle
    // Keep protection active briefly to prevent event interference, then clear
    const clearFlag = (isUnmuting: boolean) => {
      // Clear flag after a delay for both mutes and unmutes
      // Keep it set briefly to prevent TrackMuted/TrackUnmuted events from interfering
      // This allows the event handler to recognize it as a user-initiated action
      setTimeout(() => {
        userInitiatedMuteRef.current = false;
        console.log('[LiveKit] Cleared userInitiatedMuteRef flag (can toggle again)');
      }, 1500); // Keep flag for 1.5 seconds to prevent event interference
    };
    
    try {
      console.log('[LiveKit] Attempting to toggle microphone:', newMutedState ? 'muted' : 'unmuted');
      
      // Check if microphone track already exists
      const micPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      
      // Log current track state for debugging (critical for rejoin debugging)
      if (micPublication?.track) {
        const track = micPublication.track;
        console.log('[LiveKit] Current track state before toggle:', {
          trackId: track.id,
          publicationMuted: micPublication.isMuted,
          mediaStreamTrackEnabled: track.mediaStreamTrack?.enabled,
          mediaStreamTrackMuted: track.mediaStreamTrack?.muted,
          mediaStreamTrackReadyState: track.mediaStreamTrack?.readyState,
          currentLocalIsMuted: localIsMuted,
          targetState: newMutedState ? 'muted' : 'unmuted',
        });
      } else {
        console.log('[LiveKit] No microphone track found, will create new track');
      }
      
      if (!newMutedState && !micPublication) {
        // Trying to unmute but no track exists - setMicrophoneEnabled will create it
        console.log('[LiveKit] No microphone track found, creating new track...');
        console.log('[LiveKit] Room state:', room.state, 'LocalParticipant:', !!room.localParticipant);
        console.log('[LiveKit] Current role:', currentRole, 'Metadata updating:', isUpdatingMetadataRef.current);
        
        // CRITICAL: Ensure room is fully connected before requesting microphone
        if (room.state !== 'connected') {
          console.warn('[LiveKit] Room not connected, waiting for connection...');
          await new Promise<void>((resolve) => {
            if (room.state === 'connected') {
              resolve();
              return;
            }
            const onConnected = () => {
              room.off(RoomEvent.Connected, onConnected);
              setTimeout(() => resolve(), 200);
            };
            room.on(RoomEvent.Connected, onConnected);
            
            // Timeout after 5 seconds
            setTimeout(() => {
              room.off(RoomEvent.Connected, onConnected);
              console.warn('[LiveKit] Timeout waiting for room connection before microphone request');
              resolve();
            }, 5000);
          });
        }
        
        // CRITICAL: Clear any metadata update flags - microphone permission is more important
        // Don't let metadata updates block permission requests
        if (isUpdatingMetadataRef.current) {
          console.log('[LiveKit] Clearing metadata update flag to allow microphone permission request');
          isUpdatingMetadataRef.current = false;
        }
        
        // CRITICAL: After rejoin, explicitly request permission first to ensure prompt appears
        // This is especially important after rejoin when permission might be in an unclear state
        // IMPORTANT: This should work even during role changes
        let permissionGranted = false;
        try {
          console.log('[LiveKit] Checking/requesting microphone permission explicitly...');
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Request permission explicitly - this ensures the browser prompt appears
            // This MUST work even if role is changing or metadata is updating
            const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[LiveKit] ✅ Microphone permission confirmed/obtained');
            permissionGranted = true;
            
            // Stop the test stream immediately - we just needed permission
            testStream.getTracks().forEach(track => {
              track.stop();
              console.log('[LiveKit] Stopped test stream track');
            });
          }
        } catch (permError: any) {
          console.error('[LiveKit] Failed to get microphone permission:', permError);
          // If permission is denied, throw immediately
          if (permError?.name === 'NotAllowedError' || 
              permError?.name === 'PermissionDeniedError') {
            clearToggleFlag();
            userInitiatedMuteRef.current = false;
            throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
          }
          // For other errors, continue and let setMicrophoneEnabled try
          console.warn('[LiveKit] Permission check failed but continuing with setMicrophoneEnabled...');
        }
        
        // In Safari, we need to ensure getUserMedia is called in a user gesture context
        // LiveKit's setMicrophoneEnabled should handle this, but let's add extra logging
        try {
          console.log('[LiveKit] Requesting microphone permission via setMicrophoneEnabled(true)...');
          const publication = await room.localParticipant.setMicrophoneEnabled(true);
          
          if (publication) {
            console.log('[LiveKit] ✅ Microphone track created and published:', {
              trackSid: publication.trackSid,
              isMuted: publication.isMuted,
              kind: publication.kind,
              hasTrack: !!publication.track,
            });
            
            // Wait a bit for the track to be fully ready (Safari sometimes needs this)
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Verify the track is actually enabled
            const track = publication.track;
            if (track) {
              // Note: track.enabled, track.muted, track.readyState are not available on LocalTrack type
              // We rely on publication.isMuted instead
              console.log('[LiveKit] Track details before fix:', {
                trackId: track.id,
                kind: track.kind,
                publicationMuted: publication.isMuted,
              });
              
              // CRITICAL: Ensure track is enabled via the mediaStreamTrack if available
              if (track.mediaStreamTrack) {
                if (!track.mediaStreamTrack.enabled) {
                  track.mediaStreamTrack.enabled = true;
                  console.log('[LiveKit] Manually enabled mediaStreamTrack');
                }
              }
              
              // Also ensure the publication is not muted
              // Note: LiveKit's setMicrophoneEnabled(true) should unmute, but let's verify
              if (publication.isMuted) {
                console.log('[LiveKit] ⚠️ Publication is still muted after setMicrophoneEnabled(true)');
                // Try to unmute by calling setMicrophoneEnabled again
                // This shouldn't be necessary but Safari sometimes needs it
                try {
                  const retryPublication = await room.localParticipant.setMicrophoneEnabled(true);
                  if (retryPublication && !retryPublication.isMuted) {
                    console.log('[LiveKit] ✅ Publication unmuted on retry');
                  }
                } catch (retryError) {
                  console.warn('[LiveKit] Retry unmute failed:', retryError);
                }
              }
              
              // Double-check after unmuting
              await new Promise(resolve => setTimeout(resolve, 100));
              console.log('[LiveKit] Track details after fix:', {
                trackId: track.id,
                publicationMuted: publication.isMuted,
                mediaStreamTrackEnabled: track.mediaStreamTrack?.enabled,
              });
            } else {
              console.warn('[LiveKit] ⚠️ Publication exists but track is null');
            }
            
            setLocalIsMuted(false);
            clearFlag(true); // Clear flag after delay
            clearToggleFlag(); // Clear toggle flag immediately
            console.log('[LiveKit] ✅ Microphone enabled successfully');
          } else {
            throw new Error('Failed to create microphone track - no publication returned');
          }
        } catch (error: any) {
          console.error('[LiveKit] ❌ Failed to enable microphone:', error);
          console.error('[LiveKit] Error details:', {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
          });
          
          // If it's a permission error, try to request permission explicitly
          const isPermissionError = error?.name === 'NotAllowedError' || 
              error?.name === 'PermissionDeniedError' ||
              error?.message?.includes('permission') || 
              error?.message?.includes('Permission') ||
              error?.message?.includes('denied');
          
          if (isPermissionError) {
            console.log('[LiveKit] Permission error detected, trying explicit permission request...');
            try {
              // Try to request permission explicitly using getUserMedia
              // This ensures the browser permission prompt appears
              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('[LiveKit] ✅ Permission granted via explicit request');
                
                // Stop the stream immediately - we just needed permission
                stream.getTracks().forEach(track => track.stop());
                
                // Now try setMicrophoneEnabled again
                console.log('[LiveKit] Retrying setMicrophoneEnabled after permission grant...');
                const retryPublication = await room.localParticipant.setMicrophoneEnabled(true);
                
                if (retryPublication && retryPublication.track) {
                  console.log('[LiveKit] ✅ Microphone track created after permission grant');
                  setLocalIsMuted(false);
                  clearFlag(true);
                  clearToggleFlag();
                  return; // Success!
                }
              }
            } catch (permError: any) {
              console.error('[LiveKit] Explicit permission request also failed:', permError);
              // Fall through to throw the original error
            }
          }
          
          // Clear flags on error so user can try again
          clearToggleFlag();
          userInitiatedMuteRef.current = false;
          
          if (isPermissionError) {
            console.error('[LiveKit] Microphone permission denied. User needs to grant permission.');
            throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
          }
          
          // Re-throw with more context
          throw new Error(`Failed to enable microphone: ${error.message || error.toString() || 'Unknown error'}`);
        }
      } else {
        // Track exists - toggle mute state
        console.log('[LiveKit] Toggling existing microphone track, current state:', localIsMuted, 'target:', !newMutedState);
        
        // For unmuting, we need to ensure the track is enabled
        if (!newMutedState) {
          // Trying to unmute - ensure track exists and is enabled
          if (micPublication && micPublication.track && micPublication.track.mediaStreamTrack) {
            // Track exists, just enable it via mediaStreamTrack
            micPublication.track.mediaStreamTrack.enabled = true;
            console.log('[LiveKit] Enabled existing track via mediaStreamTrack');
          }
        }
        
        const publication = await room.localParticipant.setMicrophoneEnabled(!newMutedState);
        
        // Log track state after toggle
        if (publication?.track) {
          const track = publication.track;
          console.log('[LiveKit] Track state after toggle:', {
            trackId: track.id,
            publicationMuted: publication.isMuted,
            mediaStreamTrackEnabled: track.mediaStreamTrack?.enabled,
            mediaStreamTrackMuted: track.mediaStreamTrack?.muted,
            requestedState: !newMutedState ? 'unmuted' : 'muted',
          });
        }
        
        if (publication) {
          console.log('[LiveKit] Microphone track publication after toggle:', {
            trackSid: publication.trackSid,
            isMuted: publication.isMuted,
            kind: publication.kind,
            hasTrack: !!publication.track,
            requestedState: !newMutedState ? 'unmuted' : 'muted',
          });
          
          // Wait a bit for LiveKit to process the change
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Re-check the actual state after a delay
          const actualPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
          const actualMuted = actualPublication?.isMuted ?? true;
          
          
          console.log('[LiveKit] Actual mute state after toggle:', {
            requested: !newMutedState,
            actual: actualMuted,
            matches: (!newMutedState) === (!actualMuted),
          });
          
          // If unmuting, ensure track is enabled and unmuted
          if (!newMutedState) {
            // Ensure track is enabled via mediaStreamTrack
            if (publication.track && publication.track.mediaStreamTrack) {
              publication.track.mediaStreamTrack.enabled = true;
              console.log('[LiveKit] Ensured track is enabled via mediaStreamTrack');
            }
            
            // Also ensure publication is not muted
            // If still muted after setMicrophoneEnabled(true), try again with more aggressive approach
            if (actualMuted) {
              console.log('[LiveKit] ⚠️ Publication is still muted after setMicrophoneEnabled(true), retrying with force...');
              try {
                // First, try disabling and re-enabling to reset state
                await room.localParticipant.setMicrophoneEnabled(false);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Now enable again
                const retryPublication = await room.localParticipant.setMicrophoneEnabled(true);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const retryActual = room.localParticipant.getTrackPublication(Track.Source.Microphone);
                const retryMuted = retryActual?.isMuted ?? true;
                
                if (retryPublication && retryPublication.track && retryPublication.track.mediaStreamTrack) {
                  retryPublication.track.mediaStreamTrack.enabled = true;
                }
                
                if (retryPublication && !retryMuted) {
                  console.log('[LiveKit] ✅ Publication unmuted on retry');
                  setLocalIsMuted(false);
                } else {
                  console.warn('[LiveKit] ⚠️ Still muted after retry, actual state:', retryMuted);
                  // Even if still muted, update state to reflect reality
                  setLocalIsMuted(retryMuted);
                  // Throw error so caller knows it failed
                  throw new Error('Failed to unmute microphone after retry');
                }
              } catch (retryError: any) {
                console.warn('[LiveKit] Retry unmute failed:', retryError);
                setLocalIsMuted(actualMuted);
                // Re-throw to let caller handle it
                throw new Error(`Failed to unmute: ${retryError.message || 'Unknown error'}`);
              }
            } else {
              // Successfully unmuted
              setLocalIsMuted(false);
              clearFlag(true); // Clear flag after delay
              clearToggleFlag(); // Clear toggle flag immediately
              console.log('[LiveKit] ✅ Microphone unmuted successfully');
            }
          } else {
            // Muting - update based on actual state
            // IMPORTANT: Always update state directly, regardless of protection flag
            // The flag only prevents auto-mute, not manual mutes
            setLocalIsMuted(actualMuted);
            clearFlag(false); // Clear flag after delay
            clearToggleFlag(); // Clear toggle flag immediately
            console.log('[LiveKit] ✅ Microphone muted successfully - state updated directly, flag cleared');
          }
        } else {
          // No publication returned
          if (!newMutedState) {
            // Trying to unmute but no publication - this is an error
            setLocalIsMuted(true);
            throw new Error('Failed to unmute: No microphone track available');
          } else {
            // Trying to mute and no publication - assume already muted or no track
            setLocalIsMuted(true);
            console.log('[LiveKit] No publication returned, assuming muted');
          }
        }
      }
    } catch (error: any) {
      console.error('[LiveKit] ❌ Failed to toggle mute:', error);
      console.error('[LiveKit] Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      
      // Always clear flags on error FIRST so user can try again
      clearToggleFlag();
      userInitiatedMuteRef.current = false;
      
      // If it's a permission error, provide helpful message
      if (error?.name === 'NotAllowedError' || error?.message?.includes('permission') || error?.message?.includes('Permission')) {
        console.error('[LiveKit] Microphone permission denied. User needs to grant permission.');
        // Don't update state - keep current muted state
        throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
      }
      
      // Don't update state on error - keep current state
      throw error; // Re-throw so caller can handle it
    }
  }, [localIsMuted]);

  // Cleanup function for explicit cleanup (called on leave)
  const cleanupWebRTC = useCallback(() => {
    console.log('[LiveKit] cleanupWebRTC() called - performing explicit cleanup');
    
    const room = roomRef.current;
    if (room) {
      try {
        // Stop all tracks
        room.localParticipant.trackPublications.forEach((publication) => {
          if (publication.track) {
            try {
              publication.track.stop();
              if (publication.track.mediaStreamTrack) {
                publication.track.mediaStreamTrack.stop();
                publication.track.mediaStreamTrack.enabled = false;
              }
            } catch (err: any) {
              console.warn('[LiveKit] Error stopping track during cleanup:', err);
            }
          }
        });
        
        // Disable microphone
        room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
        
        // Disconnect
        room.disconnect().catch(() => {});
      } catch (err: any) {
        console.warn('[LiveKit] Error during cleanupWebRTC:', err);
      }
    }
    
    // Reset all state
    roomRef.current = null;
    setIsConnected(false);
    setPeers([]);
    setLocalIsMuted(true);
    isTogglingRef.current = false;
    userInitiatedMuteRef.current = false;
    lastToggleTimeRef.current = 0;
    
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
      toggleTimeoutRef.current = null;
    }
    
    console.log('[LiveKit] ✅ cleanupWebRTC() completed');
  }, []);

  return {
    peers,
    isConnected,
    toggleLocalMute,
    localIsMuted,
    cleanupWebRTC,
  };
}
