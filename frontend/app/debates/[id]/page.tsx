'use client';

import React, { useState, useEffect, use, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useDebateRoomStore, useDebateStore, JoinDebateModal, MicrophonePermissionModal, UserOptionsModal, useSignaling, useDebateWebRTC, type DebateRole, LockExplainerModal } from '@/features/debates';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/auth';
import { debateAPI, debateStatsAPI } from '@v/api-client';
import { generateMockParticipants, getDebateById } from '@/lib/mock-debates';
import { useAudioStream } from '@/hooks/useAudioStream';
import { AudioPlayer } from '@/components/AudioPlayer';

export default function DebateRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const debateId = resolvedParams.id;
  const router = useRouter();
  const { showToast } = useToast();
  const { currentUser, syncCurrentUser } = useStore();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Sync current user when authenticated
  useEffect(() => {
    if (isAuthenticated && !currentUser && !authLoading) {
      console.log('[Debate Room Page] User authenticated but currentUser not set, syncing...');
      syncCurrentUser();
    }
  }, [isAuthenticated, currentUser?.id, authLoading, syncCurrentUser]);

  const {
    userSide,
    hasJoined,
    hasSwitched,
    isSpectator,
    currentSpeakerId,
    speakQueue,
    joinRoom,
    leaveRoom,
    switchSide,
    toggleSelfMute,
    muteParticipant,
    unmuteParticipant,
    removeParticipant,
  } = useDebateRoomStore();

  const { endDebate } = useDebateStore();

  // Initialize showJoinModal based on localStorage to prevent showing modal if user has a stored side
  // Always start as false - we'll check localStorage in useEffect to decide if we should show it
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false);
  const [showEndDebateModal, setShowEndDebateModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRemovedMessage, setShowRemovedMessage] = useState(false);
  const [showUserOptionsModal, setShowUserOptionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [speakerStartTime, setSpeakerStartTime] = useState<number | null>(null);
  const [speakerTimer, setSpeakerTimer] = useState(0);
  const [removedUsers, setRemovedUsers] = useState<Set<string>>(new Set());
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const showToastRef = useRef(showToast);

  // Keep ref in sync with showToast
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const [debate, setDebate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false); // Track if audio is unlocked (for Safari)

  const isLeavingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const hasRefreshedRef = useRef(false); // Track if we've already refreshed
  const mountTimeRef = useRef<number>(Date.now()); // Track when component mounted to prevent early refresh

  // Reset refresh flag and leaving flag on mount (in case user navigates back after leaving)
  useEffect(() => {
    // Reset flags when component mounts or debateId changes
    // CRITICAL: This must run FIRST before any other effects that might trigger refresh
    mountTimeRef.current = Date.now(); // Record mount time to prevent early refresh
    hasRefreshedRef.current = false;
    isLeavingRef.current = false;
    console.log('[DebateRoom] Reset refresh and leaving flags on mount/remount, debateId:', debateId);
  }, [debateId]); // Reset when debateId changes (new debate page)

  // Audio stream management (must be defined before performOneTimeRefresh)
  const {
    localStream,
    isMuted: isLocalMuted,
    volumeLevel,
    isPermissionGranted,
    requestMicrophoneAccess,
    toggleMute,
    setMuted,
    stopStream,
    stopMicrophone,
  } = useAudioStream();

  // Keep ref to latest localStream for mute toggle (prevents stale closures)
  const localStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Helper function to perform one-time refresh when debate ends or user leaves
  const performOneTimeRefresh = useCallback((reason: 'debate_ended' | 'user_left') => {
    if (hasRefreshedRef.current) {
      console.log(`[Refresh] Already refreshed (reason: ${reason}), skipping`);
      return;
    }

    hasRefreshedRef.current = true;
    isLeavingRef.current = true; // Mark that we're leaving to prevent other operations
    console.log(`[Refresh] Performing one-time refresh (reason: ${reason})`);

    // Clean up all state first
    stopStream();
    leaveRoom();

    // Use window.location for full page refresh to clean up LiveKit state
    setTimeout(() => {
      window.location.href = '/debates';
    }, 1500);
  }, [stopStream, leaveRoom]);

  // WebSocket signaling for real-time updates
  const debateIdForWS = debate?.id || debateId;
  const { isConnected: wsConnected, sendSignal, setOnMessage } = useSignaling(
    debateIdForWS,
    currentUser?.id || ''
  );

  // Log WebSocket connection status
  useEffect(() => {
    console.log('[WebSocket Status]', {
      debateIdForWS,
      userId: currentUser?.id,
      isConnected: wsConnected,
      hasDebate: !!debate,
    });
  }, [debateIdForWS, currentUser?.id, wsConnected, debate]);

  // Listen for real-time participant updates via WebSocket
  useEffect(() => {
    if (!debateIdForWS || !currentUser?.id) {
      console.log('[WebSocket] Not setting up message handler - missing debateId or userId');
      return;
    }

    console.log('[WebSocket] Setting up message handler for debate:', debateIdForWS);

    setOnMessage((message: any) => {
      console.log('[WebSocket] 📨 Received message:', {
        type: message.type,
        hasParticipants: !!message.participants,
        participantCount: message.participants?.length,
        fullMessage: message,
      });

      if (message.type === 'debate:participants_updated' && message.participants) {
        console.log('[WebSocket] ✅ Participants updated, syncing UI immediately:', message.participants.length);
        // Update participants list in real-time - this should happen instantly
        setParticipants(message.participants);
        console.log('[WebSocket] ✅ UI updated with new participants list');
      } else if (message.type === 'debate:status_changed') {
        console.log('[WebSocket] 📢 Debate status changed:', {
          debateId: message.debateId,
          status: message.status,
          oldStatus: message.oldStatus,
        });

        // If debate was ended, redirect all users
        if (message.status === 'ENDED' || message.status === 'ended') {
          console.log('[WebSocket] 🛑 Debate ended, cleaning up and redirecting users...');

          // CRITICAL: Only refresh if we're actually in the room and not just rejoining
          // Check if we've already refreshed or are in the process of leaving
          if (hasRefreshedRef.current || isLeavingRef.current) {
            console.log('[WebSocket] Already refreshing or leaving, skipping duplicate refresh');
            return;
          }

          // Record stats before ending (if not already recorded)
          // Use current debate state from closure
          if (debate && debate.id === (message.debateId || debateIdForWS)) {
            recordDebateStats(debate).catch(err => {
              console.error('[WebSocket] Failed to record stats:', err);
            });
          }

          // Leave room and end debate
          endDebate(message.debateId || debateIdForWS);

          showToast('Debate has ended', 'info');

          // CRITICAL: Only refresh if we haven't already refreshed, we're not leaving, AND user hasn't joined
          // If user has joined, never auto-refresh (they're actively in the room)
          if (!hasRefreshedRef.current && !isLeavingRef.current && !hasJoined) {
            // Perform one-time refresh
            performOneTimeRefresh('debate_ended');
          } else {
            console.log('[WebSocket] Status change: Already refreshed, leaving, or user has joined, skipping refresh', {
              hasRefreshed: hasRefreshedRef.current,
              isLeaving: isLeavingRef.current,
              hasJoined,
            });
          }
        } else {
          // Update debate status in local state
          setDebate((prev: any) => {
            if (prev && prev.id === (message.debateId || debateIdForWS)) {
              return { ...prev, status: message.status };
            }
            return prev;
          });
        }
      } else if (message.type === 'user-joined') {
        console.log('[WebSocket] 👤 User joined:', message.userId);
        // NO REFRESH NEEDED - LiveKit TrackPublished/TrackSubscribed events will handle audio automatically
        // Just update participants list for UI (no API call needed, use WebSocket data)
        // The debate:participants_updated message will handle this, so we don't need to do anything here
        console.log('[WebSocket] User joined - LiveKit will handle track subscription automatically');
      } else {
        console.log('[WebSocket] Unhandled message type:', message.type);
      }
    });

    return () => {
      // Cleanup - clear message handler
      console.log('[WebSocket] Cleaning up message handler');
      setOnMessage(() => { }); // Set empty handler
    };
  }, [debateIdForWS, currentUser?.id, setOnMessage, endDebate, router, showToast]);

  // Fetch debate data
  useEffect(() => {
    console.log('fetchDebate effect running');
    const fetchDebate = async () => {
      try {
        console.log('Fetching debate data...');
        isFetchingRef.current = true;
        setLoading(true);

        // OPTIMIZATION: Check mock registry FIRST. 
        // If this is a known mock debate (simulation), use local data and skip API call.
        // This prevents 404 errors from the backend for simulation content.
        const mockFallback = getDebateById(debateId);
        if (mockFallback) {
          console.log('[DebateRoom] Identified as mock/simulation debate, using local data:', debateId);

          if (mockFallback.isLocked) {
            console.log('[DebateRoom] Mock debate is locked, showing modal');
            setDebate(mockFallback);
            setShowLockModal(true);
            setLoading(false);
            return;
          }

          // If mock but not locked (unlikely in Phase 1), use it
          setDebate(mockFallback);
          setLoading(false);
          return;
        }

        // Only call backend if not a known mock
        const data = await debateAPI.get(debateId);

        // Soft-lock check (Phase 1)
        // Check global default lock for backend data
        const isLocked = data.isLocked !== false;

        if (isLocked) {
          console.log('[DebateRoom] Debate is locked (verified via mock), showing modal');
          // Merge mock data for better modal display (e.g. unlockPhase)
          setDebate({ ...data, isLocked: true });
          setShowLockModal(true);
          setLoading(false);
          return;
        }

        console.log('[Debate] Fetched debate data:', {
          id: data.id,
          title: data.title,
          status: data.status,
          endTime: data.endTime,
          durationMinutes: data.durationMinutes,
        });

        // If debate is already ended, redirect immediately
        // BUT: Only if we haven't already refreshed and we're not in the process of leaving
        if (data.status === 'ENDED') {
          console.log('[Debate] Debate already ended, checking if we should redirect...');

          // CRITICAL: Prevent refresh if we're rejoining, already refreshed, just mounted, OR user has joined
          // If user has joined, never auto-refresh (they're actively in the room)
          const timeSinceMount = Date.now() - mountTimeRef.current;
          if (hasRefreshedRef.current || isLeavingRef.current || timeSinceMount < 5000 || hasJoined) {
            console.log('[Debate] Skipping refresh - already refreshed, leaving, just mounted, or user has joined', {
              hasRefreshed: hasRefreshedRef.current,
              isLeaving: isLeavingRef.current,
              timeSinceMount,
              hasJoined,
            });
            // Still update the debate status for UI
            setDebate(data);
            setLoading(false);
            return;
          }

          console.log('[Debate] Debate already ended, cleaning up and redirecting...');

          // Record stats before ending (if not already recorded)
          await recordDebateStats(data);

          endDebate(debateId);

          // CRITICAL: Only refresh if user hasn't joined (if they have joined, they're actively in the room)
          if (!hasJoined) {
            // Perform one-time refresh
            performOneTimeRefresh('debate_ended');
          } else {
            console.log('[Debate] User has joined, skipping refresh for ended debate');
          }
          return;
        }

        setDebate(data);

        // Also fetch participants if available
        try {
          const participantsData = await debateAPI.getParticipants(debateId);
          console.log('Fetched participants from API:', participantsData);
          let allParticipants: any[] = [];
          if (participantsData && Array.isArray(participantsData)) {
            allParticipants = participantsData;

            // CHECK: Are we already in the participant list?
            // This handles page refreshes where local state might be lost but server knows we joined
            const myParticipantRecord = allParticipants.find(p => p.userId === currentUser?.id);

            if (myParticipantRecord) {
              console.log('Found existing session, restoring...', myParticipantRecord);

              // Update local store if needed
              if (!hasJoined || userSide !== myParticipantRecord.side) {
                joinRoom(debateId, myParticipantRecord.side, currentUser?.id || '');
              }

              // Don't show join modal since we are already joined
              setShowJoinModal(false);

            }
          }

          // Add mock participants for testing - REMOVED for real testing
          // const mocks = generateMockParticipants(8);
          // allParticipants = [...allParticipants, ...mocks];

          console.log('Setting participants from API:', allParticipants);

          // Use functional update to preserve local user if missing from API (race condition fix)
          setParticipants(prev => {
            console.log('fetchDebate setParticipants updater running');
            console.log('prev state:', prev);
            console.log('API participants:', allParticipants);
            console.log('Current User ID:', currentUser?.id);

            const apiHasUser = allParticipants.some(p => p.userId === currentUser?.id);
            const localHasUser = prev.some(p => p.userId === currentUser?.id);

            console.log('apiHasUser:', apiHasUser, 'localHasUser:', localHasUser);

            // If we are locally present OR we think we joined, but API doesn't have us yet, keep us!
            if ((localHasUser || hasJoined) && !apiHasUser && currentUser?.id) {
              console.log('Preserving local user in participant list (API lag)');
              let localUser = prev.find(p => p.userId === currentUser?.id);

              // If not in previous list (e.g. just joined), construct from current user
              if (!localUser && currentUser?.id) {
                const side = useDebateRoomStore.getState().userSide || 'neutral';
                localUser = {
                  id: currentUser.id, // Keep id for backward compatibility
                  userId: currentUser.id,
                  displayName: currentUser.displayName || 'You',
                  handle: currentUser.handle,
                  avatar: currentUser.avatar,
                  side: side,
                  isSelfMuted: true, // Default to muted
                  isMutedByHost: false,
                  isSpeaking: false
                };
              }

              if (localUser) {
                return [...allParticipants, localUser];
              }
            }

            return allParticipants;
          });
        } catch (e) {
          console.warn('Failed to fetch participants, using empty list');
        }
      } catch (error: any) {
        // Fallback checks for simulation/mocks
        console.log('[DebateRoom] Fetch failed, checking fallback for ID:', debateId);
        const mockFallback = getDebateById(debateId);
        console.log('[DebateRoom] Fallback result:', mockFallback ? 'Found' : 'Not Found', mockFallback?.id);

        // If we found a mock fallback, this 404 was expected - don't log as error
        if (mockFallback && mockFallback.isLocked) {
          console.log('[DebateRoom] Backend 404/Error caught, using locked mock data instead');
          setDebate(mockFallback);
          setShowLockModal(true);
        } else {
          // Real error (no fallback available)
          console.error('Failed to fetch debate:', error);
          showToast('Failed to load debate', 'error');
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    };

    fetchDebate();
    // We include hasJoined to ensure we fetch fresh data when joining, 
    // but our setParticipants merge logic prevents overwriting the local user.
  }, [debateId, showToast, currentUser?.id, joinRoom, hasJoined]);

  // Check if user was removed
  useEffect(() => {
    if (currentUser?.id && removedUsers.has(currentUser.id)) {
      setShowRemovedMessage(true);
      isLeavingRef.current = true;
      setTimeout(() => {
        leaveRoom();
        router.push('/debates');
      }, 3000);
    }
  }, [removedUsers, leaveRoom, router, currentUser?.id]);

  // Consistency check: Sync local joined state with server participant list
  // If we think we joined but server doesn't have us (e.g. after restart), reset.
  // But be lenient - only check after a delay to allow for API lag
  const currentUserId = currentUser?.id || '';
  const debateIdRef = useRef(debateId);
  const consistencyCheckDoneRef = useRef(false);

  useEffect(() => {
    debateIdRef.current = debateId;
    consistencyCheckDoneRef.current = false; // Reset when debateId changes
  }, [debateId]);

  useEffect(() => {
    // Only check once after loading completes and we have participants
    // Skip if already checked or if conditions aren't met
    if (consistencyCheckDoneRef.current || loading || isFetchingRef.current || !hasJoined || isLeavingRef.current || !debateIdRef.current) {
      return;
    }

    // Wait for participants to be loaded
    if (participants.length === 0) {
      return;
    }

    // Mark as done to prevent multiple checks
    consistencyCheckDoneRef.current = true;

    // Add a delay before checking to allow for API lag after refresh
    const checkTimeout = setTimeout(() => {
      const isInList = participants.some(p => p.userId === currentUserId);
      if (!isInList) {
        // Double-check by fetching from API one more time
        debateAPI.getParticipants(debateIdRef.current).then(apiParticipants => {
          const isInApiList = apiParticipants.some((p: any) => p.userId === currentUserId);
          if (!isInApiList) {
            console.warn('User state mismatch: User not in API after delay, resetting join state');
            leaveRoom();
          } else {
            console.log('User found in API on second check, updating participants');
            setParticipants(apiParticipants);
          }
        }).catch(() => {
          // If API call fails, don't reset - keep current state
          console.warn('API check failed, keeping current state');
        });
      }
    }, 5000); // Wait 5 seconds before checking to allow for API lag

    return () => clearTimeout(checkTimeout);
    // Only run when loading completes and hasJoined is true - don't include participants.length
  }, [loading, hasJoined, currentUserId, leaveRoom]);

  // Use a ref to remember if we were ever the host (prevents flickering during refetches)
  const wasHostRef = useRef<boolean>(false);
  const lastKnownHostIdRef = useRef<string | null>(null);

  // Calculate isHost more robustly - check multiple possible host ID fields
  // IMPORTANT: Once we determine user is host, keep that state even if debate.host temporarily disappears
  const isHost = useMemo(() => {
    if (!debate || !currentUser) {
      // If we don't have data but we were previously the host, maintain that state
      return wasHostRef.current;
    }

    // Check multiple possible host ID fields
    const hostId = debate.host?.id || debate.hostId || debate.hostID;

    // If we have a host ID and it matches current user, we're the host
    if (hostId && hostId === currentUser.id) {
      wasHostRef.current = true;
      lastKnownHostIdRef.current = hostId;
      console.log('[DebateRoom] ✅ Host status confirmed:', { hostId, userId: currentUser.id });
      return true;
    }

    // If hostId is missing but we were previously the host and hostId matches, maintain host status
    // This prevents flickering when debate.host temporarily disappears during refetch
    if (!hostId && wasHostRef.current && lastKnownHostIdRef.current === currentUser.id) {
      console.log('[DebateRoom] Host data temporarily missing, maintaining host status');
      return true;
    }

    // If hostId exists but doesn't match, we're not the host
    if (hostId && hostId !== currentUser.id) {
      wasHostRef.current = false;
      lastKnownHostIdRef.current = null;
      return false;
    }

    // Default: maintain previous state if we can't determine
    return wasHostRef.current;
  }, [debate?.host?.id, debate?.hostId, debate?.hostID, currentUser?.id]);

  // Debug logging for host status
  useEffect(() => {
    if (debate && currentUser) {
      console.log('[DebateRoom] Host check:', {
        debateHostId: debate.host?.id,
        debateHostIdField: debate.hostId,
        debateHostIDField: debate.hostID,
        currentUserId: currentUser.id,
        isHost: isHost
      });
    }
  }, [debate, currentUser?.id, isHost]);

  useEffect(() => {
    if (debate) {
      console.log('[DebateRoom] Current User:', currentUser);
      console.log('[DebateRoom] Debate Host ID:', debate.hostId);
      console.log('[DebateRoom] Is Host:', isHost);
      console.log('[DebateRoom] Participants:', participants);
    }
  }, [debate, currentUser?.id, isHost, participants]);

  const isScheduled = debate?.status?.toLowerCase() === 'scheduled';
  const isActive = debate?.status?.toLowerCase() === 'active';

  // LiveKit peer connections (must be after isHost is defined)
  // Use useMemo to stabilize role calculation and prevent unnecessary re-renders
  // IMPORTANT: Calculate role immediately based on available data to prevent initial wrong role
  // Use ref to remember the last known role to prevent flickering
  const lastRoleRef = useRef<DebateRole | null>(null);

  const currentRole: DebateRole = useMemo(() => {
    // If we have debate and user data, determine role immediately
    if (debate && currentUser) {
      // Check if user is host first (most important check)
      const hostId = debate.host?.id || debate.hostId || debate.hostID;
      if (hostId === currentUser.id) {
        const role: DebateRole = 'host';
        lastRoleRef.current = role;
        return role;
      }
      // Otherwise use userSide
      const role = (userSide as DebateRole) || 'agree';
      // Only update lastRoleRef if we have a valid side (not during initial load)
      if (userSide) {
        lastRoleRef.current = role;
      }
      return role;
    }

    // While loading, use last known role if available, otherwise default to 'agree'
    // This prevents role flickering during initial load
    if (lastRoleRef.current) {
      console.log('[DebateRoom] Using last known role during load:', lastRoleRef.current);
      return lastRoleRef.current;
    }

    return 'agree';
  }, [debate?.host?.id, debate?.hostId, debate?.hostID, currentUser?.id, userSide]);

  const roomName = debateIdForWS;

  const {
    peers: liveKitPeers,
    isConnected: isLiveKitConnected,
    toggleLocalMute: toggleLiveKitMute,
    localIsMuted: isLiveKitMuted,
  } = useDebateWebRTC({
    currentUserId: currentUser?.id || '',
    currentRole,
    roomName,
  });

  // Auto-join host
  const hasAutoJoined = useRef(false);
  const hasCheckedPreviousSide = useRef(false);
  const handleJoinSideRef = useRef<((side: 'agree' | 'disagree') => Promise<void>) | null>(null);
  const autoRejoinAttemptedRef = useRef(false);

  // Reset check flag when user leaves so we can check again on rejoin
  useEffect(() => {
    if (!hasJoined) {
      // User left the room, reset ALL flags so rejoin works correctly
      hasCheckedPreviousSide.current = false;
      autoRejoinAttemptedRef.current = false;
      hasAutoJoined.current = false; // CRITICAL: Reset so auto-join can run again on rejoin
      console.log('[DebateRoom] User left, reset all auto-join flags for rejoin');
    }
  }, [hasJoined]);

  useEffect(() => {
    if (hasAutoJoined.current || isLeavingRef.current || autoRejoinAttemptedRef.current) {
      return;
    }

    if (isHost && !hasJoined && !isScheduled && currentUser?.id) {
      joinRoom(debateId, 'neutral', currentUser.id);
      hasAutoJoined.current = true;
      setShowJoinModal(false);
    } else if (!hasJoined && !isHost && !loading && debate && !isScheduled && currentUser?.id) {
      // Check for stored side using debateId-only key (per debate, not per user)
      const sideKey = `debateSide:${debateId}`;
      let storedSide = localStorage.getItem(sideKey);

      // Fallback to old formats for backward compatibility
      if (!storedSide) {
        storedSide = localStorage.getItem(`debateSide:${debateId}:${currentUser.id}`);
      }
      if (!storedSide) {
        storedSide = localStorage.getItem(`debate_side_${debateId}`);
      }

      if (storedSide && (storedSide === 'agree' || storedSide === 'disagree')) {
        // Auto-rejoin with stored side
        setShowJoinModal(false);
        if (handleJoinSideRef.current) {
          autoRejoinAttemptedRef.current = true;
          handleJoinSideRef.current(storedSide as 'agree' | 'disagree');
        } else {
          // Wait for ref to be ready
          const checkRef = setInterval(() => {
            if (handleJoinSideRef.current && !autoRejoinAttemptedRef.current) {
              clearInterval(checkRef);
              autoRejoinAttemptedRef.current = true;
              handleJoinSideRef.current(storedSide as 'agree' | 'disagree');
            }
          }, 100);
          setTimeout(() => clearInterval(checkRef), 3000);
        }
      } else if (!hasCheckedPreviousSide.current) {
        // No stored side - show modal only once
        hasCheckedPreviousSide.current = true;
        setShowJoinModal(true);
      }
    }
  }, [hasJoined, isHost, debateId, joinRoom, loading, debate, isScheduled, currentUser?.id]);


  // DEBUG: Fetch participants on load to verify state
  useEffect(() => {
    if (debateId) {
      debateAPI.getDebugParticipants(debateId).then(data => {
        console.log('[DEBUG] DEBUG_PARTICIPANTS_ON_LOAD', debateId, data.participants);
      }).catch(err => console.error('Failed to fetch debug participants:', err));
    }
  }, [debateId]);

  // Periodic check for debate status (to catch if debate was ended by host)
  // Only check if user has joined (they're actively in the room)
  useEffect(() => {
    if (!debateId || !debate || !hasJoined) return;

    // Check debate status periodically to catch if it was ended
    let statusCheckInterval: NodeJS.Timeout | null = null;

    const checkStatus = async () => {
      try {
        const updatedDebate = await debateAPI.get(debateId);
        if (updatedDebate && updatedDebate.status === 'ENDED') {
          console.log('[Debate Status Check] 🛑 Debate ended, cleaning up and redirecting users...');

          // Clear the interval immediately to prevent multiple triggers
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
          }

          // End debate (cleans up state)
          endDebate(debateId);

          // Leave the room (cleans up WebRTC/LiveKit connections)
          if (hasJoined) {
            console.log('[Debate Status Check] User is in room, leaving room...');
            leaveRoom();
          }

          showToast('Debate has ended', 'info');

          // Always redirect when debate ends, regardless of join status
          // Use a small delay to allow cleanup to complete
          setTimeout(() => {
            console.log('[Debate Status Check] Redirecting to debates list...');
            router.push('/debates');
          }, 1000);
        } else if (updatedDebate && updatedDebate.status !== debate.status) {
          // Status changed but not to ENDED - update local state
          console.log('[Debate Status Check] Status changed:', debate.status, '->', updatedDebate.status);
          setDebate(updatedDebate);
        }
      } catch (error) {
        // Ignore errors - don't break the check
        console.log('[Debate Status Check] Failed to check status:', error);
      }
    };

    // Initial check
    checkStatus();

    // Then check every 5 seconds
    statusCheckInterval = setInterval(checkStatus, 5000);

    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [debateId, debate, hasJoined, endDebate, leaveRoom, router, showToast]);

  // Periodic polling for participant updates
  useEffect(() => {
    if (!debateId || !hasJoined) return;

    // Also do an immediate poll when effect runs
    debateAPI.getParticipants(debateId).then(updatedParticipants => {
      if (updatedParticipants && Array.isArray(updatedParticipants)) {
        setParticipants(prev => {
          const prevIds = new Set(prev.map(p => p.id));
          const newIds = new Set(updatedParticipants.map(p => p.id));
          const idsChanged = prevIds.size !== newIds.size ||
            [...prevIds].some(id => !newIds.has(id)) ||
            [...newIds].some(id => !prevIds.has(id));
          return idsChanged ? updatedParticipants : prev;
        });
      }
    }).catch(() => {
      // Ignore initial poll errors
    });

    const pollInterval = setInterval(async () => {
      try {
        const updatedParticipants = await debateAPI.getParticipants(debateId).catch((error) => {
          // If request times out, don't break the polling - just log and continue
          if (error.message?.includes('timed out')) {
            console.warn('[DEBUG] Polling: Request timed out, will retry on next poll');
            return null; // Return null to skip this update
          }
          throw error; // Re-throw other errors
        });

        if (!updatedParticipants) {
          return; // Skip this poll if request failed
        }

        if (updatedParticipants && Array.isArray(updatedParticipants)) {
          setParticipants(prev => {
            // Check if participants actually changed by comparing IDs
            const prevIds = new Set(prev.map(p => p.id));
            const newIds = new Set(updatedParticipants.map(p => p.id));
            const idsChanged = prevIds.size !== newIds.size ||
              [...prevIds].some(id => !newIds.has(id)) ||
              [...newIds].some(id => !prevIds.has(id));

            // Use the same preservation logic as initial fetch
            if (!currentUser?.id) {
              return updatedParticipants;
            }

            const apiHasUser = updatedParticipants.some(p => p.userId === currentUser.id);
            const localHasUser = prev.some(p => p.userId === currentUser.id);

            // If we are locally present OR we think we joined, but API doesn't have us yet, keep us!
            // But only for a limited time to avoid infinite preservation
            if ((localHasUser || hasJoined) && !apiHasUser) {
              // Initialize preservation timer only once when preservation starts
              const preserveKey = `__preserveUserStartTime_${debateId}_${currentUser.id}`;
              if (!(window as any)[preserveKey]) {
                (window as any)[preserveKey] = Date.now();
                console.log('[DEBUG] Polling: Starting preservation timer for user');
              }

              const preserveStartTime = (window as any)[preserveKey];
              const preserveDuration = Date.now() - preserveStartTime;

              if (preserveDuration > 10000) {
                // After 10 seconds, if API still doesn't have us, something is wrong
                // Try to re-join or clear the join state
                console.warn('[DEBUG] Polling: User not in API after 10s, attempting re-join');
                const side = useDebateRoomStore.getState().userSide || 'neutral';
                debateAPI.join(debateId, { userId: currentUser.id, side })
                  .then(() => {
                    console.log('[DEBUG] Re-join successful');
                    (window as any)[preserveKey] = undefined;
                  })
                  .catch((err) => {
                    console.error('[DEBUG] Re-join failed:', err);
                    // If re-join fails, clear the join state
                    leaveRoom();
                    (window as any)[preserveKey] = undefined;
                  });
                // Don't preserve if re-joining
                return updatedParticipants;
              }

              // Only log every 9 seconds to reduce noise
              const secondsElapsed = Math.floor(preserveDuration / 1000);
              if (secondsElapsed % 9 === 0 && preserveDuration % 9000 < 3000) {
                console.log('[DEBUG] Polling: Preserving local user (API lag)', `(${secondsElapsed}s)`);
              }
              let localUser = prev.find(p => p.userId === currentUser.id);

              // If not in previous list, construct from current user
              if (!localUser) {
                const side = useDebateRoomStore.getState().userSide || 'neutral';
                localUser = {
                  id: currentUser.id, // Keep id for backward compatibility
                  userId: currentUser.id,
                  displayName: currentUser.displayName || 'You',
                  handle: currentUser.handle,
                  avatar: currentUser.avatar,
                  side: side,
                  isSelfMuted: true, // Default to muted
                  isMutedByHost: false,
                  isSpeaking: false
                };
              }

              if (localUser) {
                return [...updatedParticipants, localUser];
              }
            } else if (apiHasUser) {
              // User is now in API, clear preservation timer
              const preserveKey = `__preserveUserStartTime_${debateId}_${currentUser.id}`;
              if ((window as any)[preserveKey]) {
                console.log('[DEBUG] Polling: User found in API, clearing preservation timer');
                (window as any)[preserveKey] = undefined;
              }
            }

            // Always update if IDs changed, or if count is different
            if (idsChanged || prev.length !== updatedParticipants.length) {
              console.log('[DEBUG] Polling: Participants changed, updating immediately');
              return updatedParticipants;
            }

            // Even if IDs are the same, update to ensure we have latest data
            // This helps catch any data changes (like side changes, mute status, etc.)
            return updatedParticipants;
          });
        }
      } catch (error) {
        console.error('[DEBUG] Polling failed:', error);
      }
    }, 1500); // Poll every 1.5 seconds (same as before when it was 3 seconds)

    return () => clearInterval(pollInterval);
  }, [debateId, hasJoined, currentUser?.id, wsConnected]);

  // Track speaker timer - Effect 1: Set start time
  useEffect(() => {
    if (currentSpeakerId) {
      setSpeakerStartTime(Date.now());
      setSpeakerTimer(0);
    } else {
      setSpeakerStartTime(null);
      setSpeakerTimer(0);
    }
  }, [currentSpeakerId]);

  // Track speaker timer - Effect 2: Update timer
  useEffect(() => {
    if (speakerStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - speakerStartTime) / 1000);
        setSpeakerTimer(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [speakerStartTime]);

  // 5-minute warning and auto-end
  const hasShownWarning = useRef(false);
  const hasShown1MinWarning = useRef(false);
  const hasAutoEnded = useRef(false);
  const hasStatsRecorded = useRef(false); // Track if stats have been recorded for this debate

  // Helper function to record debate stats (can be called from multiple places)
  const recordDebateStats = useCallback(async (debateData: any) => {
    if (!debateData || !debateData.title) {
      return; // No title or invalid data
    }

    // Check if stats have already been recorded for this debate (persist across refreshes)
    const statsRecordedKey = `debate_stats_recorded_${debateData.id}`;
    const alreadyRecorded = localStorage.getItem(statsRecordedKey) === 'true';

    if (hasStatsRecorded.current || alreadyRecorded) {
      console.log('[Debate Stats] Stats already recorded for this debate, skipping...');
      return; // Already recorded
    }

    try {
      // Fetch the latest debate data to get accurate counts
      let updatedDebate = debateData;
      try {
        updatedDebate = await debateAPI.get(debateData.id);
        console.log('[Debate Stats] Fetched updated debate:', {
          agreeCount: updatedDebate.agreeCount,
          disagreeCount: updatedDebate.disagreeCount,
        });
      } catch (fetchError) {
        console.warn('[Debate Stats] Failed to fetch updated debate, using current debate object:', fetchError);
      }

      let agreeCount = updatedDebate.agreeCount || 0;
      let disagreeCount = updatedDebate.disagreeCount || 0;

      // If backend counts are 0, try counting from participants as fallback
      if (agreeCount === 0 && disagreeCount === 0) {
        console.log('[Debate Stats] Backend counts are 0, counting from participants...');

        // Try fetching from API
        try {
          const participantsList = await debateAPI.getParticipants(debateData.id) || [];
          console.log('[Debate Stats] Fetched participants from API:', participantsList.length);

          participantsList.forEach((p: any) => {
            const userId = p.userId || p.id;
            const role = (p.role || '').toUpperCase();
            const side = (p.side || '').toLowerCase().trim();

            // Skip host
            if (role === 'HOST' || userId === debateData.hostId) {
              return;
            }

            // Skip empty/neutral sides
            if (!side || side === '' || side === 'neutral' || side === 'spectator') {
              return;
            }

            if (side === 'agree') {
              agreeCount++;
            } else if (side === 'disagree') {
              disagreeCount++;
            }
          });
        } catch (fetchError) {
          console.warn('[Debate Stats] Failed to fetch participants from API:', fetchError);
        }
      }

      const totalParticipants = agreeCount + disagreeCount;

      console.log('[Debate Stats] Final counts before recording:', {
        topic: debateData.title,
        agreeCount,
        disagreeCount,
        totalParticipants,
      });

      // Only record if we have at least some participants
      if (totalParticipants > 0 || agreeCount > 0 || disagreeCount > 0) {
        try {
          await debateStatsAPI.record({
            topic: debateData.title,
            agreeCount,
            disagreeCount,
            participants: totalParticipants,
            debateId: debateData.id, // Include debate ID to prevent duplicates
          });
          hasStatsRecorded.current = true; // Mark as recorded to prevent duplicates
          // Persist in localStorage to survive page refreshes
          localStorage.setItem(statsRecordedKey, 'true');
          console.log('[Debate Stats] ✅ Recorded stats for debate:', debateData.title, {
            agreeCount,
            disagreeCount,
            totalParticipants,
          });
        } catch (recordError: any) {
          // If it's a 400 error, it might be a duplicate - mark as recorded anyway
          if (recordError?.status === 400 || recordError?.message?.includes('400')) {
            console.log('[Debate Stats] Stats may already be recorded (400 error), marking as recorded...');
            hasStatsRecorded.current = true;
            localStorage.setItem(statsRecordedKey, 'true');
          } else {
            // Re-throw other errors to be caught by outer catch
            throw recordError;
          }
        }
      } else {
        console.log('[Debate Stats] ⚠️ Skipping stats recording: no active participants found.');
      }
    } catch (statsError) {
      // Don't fail if stats recording fails - just log it
      console.error('[Debate Stats] Failed to record stats:', statsError);
      // Don't show error to user - stats recording is a background operation
    }
  }, []);

  useEffect(() => {
    if (!debate) return;

    // Reset warnings when debate changes
    hasShownWarning.current = false;
    hasShown1MinWarning.current = false;
    hasAutoEnded.current = false;

    // Check if stats have already been recorded for this debate (persist across refreshes)
    const statsRecordedKey = `debate_stats_recorded_${debate.id}`;
    const alreadyRecorded = localStorage.getItem(statsRecordedKey) === 'true';
    hasStatsRecorded.current = alreadyRecorded;

    // Log debate timing info for debugging
    console.log('[Debate Timer] Debate info:', {
      id: debate.id,
      endTime: debate.endTime,
      scheduledEndTime: debate.scheduledEndTime,
      duration: debate.duration,
      status: debate.status,
    });

    // Try to get end time from various possible fields
    const endTimeValue = debate.endTime || debate.scheduledEndTime;

    if (!endTimeValue) {
      console.log('[Debate Timer] No end time set for this debate');
      return;
    }

    // Skip if debate is already ended
    if (debate.status === 'ENDED') {
      console.log('[Debate Timer] Debate already ended');
      return;
    }

    const checkTime = async () => {
      // Skip if already auto-ended
      if (hasAutoEnded.current) return;

      const endTime = new Date(endTimeValue).getTime();
      const now = Date.now();
      const diff = endTime - now;
      const fiveMinutes = 5 * 60 * 1000;
      const oneMinute = 60 * 1000;

      // Log time remaining every check (less frequently to reduce console spam)
      const minutesRemaining = Math.floor(diff / 60000);
      const secondsRemaining = Math.floor((diff % 60000) / 1000);
      if (minutesRemaining <= 6) {
        console.log(`[Debate Timer] Time remaining: ${minutesRemaining}m ${secondsRemaining}s`);
      }

      // Show 5-minute warning when exactly 5 minutes or less remaining (and haven't shown it yet)
      if (diff <= fiveMinutes && diff > 0 && !hasShownWarning.current) {
        console.log('[Debate Timer] Showing 5-minute warning');
        showToast('⏰ Debate will end in 5 minutes', 'info');
        hasShownWarning.current = true;
      }

      // If 1 minute remaining, show final warning
      if (diff <= oneMinute && diff > 0 && !hasShown1MinWarning.current) {
        console.log('[Debate Timer] Showing 1-minute warning');
        showToast('⚠️ Debate will end in 1 minute!', 'error');
        hasShown1MinWarning.current = true;
      }

      // If time has expired, auto-end the debate (regardless of host status)
      if (diff <= 0 && !hasAutoEnded.current) {
        hasAutoEnded.current = true;
        console.log('[Debate Timer] Time expired, auto-ending debate');
        showToast('⏱️ Debate time has ended!', 'info');

        // Try to end the debate via API (anyone can trigger this, but only host can actually end it)
        // If not host, the API will handle it or the backend will auto-end it
        try {
          await debateAPI.update(debate.id, { status: 'ENDED' });

          // Record stats for this debate (if not already recorded)
          await recordDebateStats(debate);

          // Old code removed - using helper function instead
          if (false && isHost && debate.title && !hasStatsRecorded.current) {
            try {
              // First, try to use the backend's maintained counts (most reliable)
              let updatedDebate = debate;
              try {
                updatedDebate = await debateAPI.get(debate.id);
                console.log('[Debate Stats] Fetched updated debate (auto-end):', {
                  agreeCount: updatedDebate.agreeCount,
                  disagreeCount: updatedDebate.disagreeCount,
                });
              } catch (fetchError) {
                console.warn('[Debate Stats] Failed to fetch updated debate (auto-end):', fetchError);
              }

              let agreeCount = updatedDebate.agreeCount || 0;
              let disagreeCount = updatedDebate.disagreeCount || 0;

              // If backend counts are 0, try counting from participants as fallback
              if (agreeCount === 0 && disagreeCount === 0) {
                console.log('[Debate Stats] Backend counts are 0, counting from participants (auto-end)...');

                if (participants && Array.isArray(participants) && participants.length > 0) {
                  participants.forEach((p: any) => {
                    const userId = p.userId || p.id;
                    if (removedUsers.has(userId) || p.leftAt) {
                      return;
                    }

                    const role = (p.role || '').toUpperCase();
                    const side = (p.side || '').toLowerCase().trim();

                    if (role === 'HOST' || userId === debate.hostId) {
                      return;
                    }

                    if (!side || side === '' || side === 'neutral' || side === 'spectator') {
                      return;
                    }

                    if (side === 'agree') {
                      agreeCount++;
                    } else if (side === 'disagree') {
                      disagreeCount++;
                    }
                  });
                }

                if (agreeCount === 0 && disagreeCount === 0) {
                  try {
                    const participantsList = await debateAPI.getParticipants(debate.id) || [];
                    participantsList.forEach((p: any) => {
                      const userId = p.userId || p.id;
                      const role = (p.role || '').toUpperCase();
                      const side = (p.side || '').toLowerCase().trim();

                      if (role === 'HOST' || userId === debate.hostId) {
                        return;
                      }

                      if (!side || side === '' || side === 'neutral' || side === 'spectator') {
                        return;
                      }

                      if (side === 'agree') {
                        agreeCount++;
                      } else if (side === 'disagree') {
                        disagreeCount++;
                      }
                    });
                  } catch (fetchError) {
                    console.warn('[Debate Stats] Failed to fetch participants from API (auto-end):', fetchError);
                  }
                }
              }

              const totalParticipants = agreeCount + disagreeCount;

              console.log('[Debate Stats] Final counts before recording (auto-end):', {
                topic: debate.title,
                agreeCount,
                disagreeCount,
                totalParticipants,
              });

              // Only record if we have at least some participants
              if (totalParticipants > 0 || agreeCount > 0 || disagreeCount > 0) {
                await debateStatsAPI.record({
                  topic: debate.title,
                  agreeCount,
                  disagreeCount,
                  participants: totalParticipants,
                  debateId: debate.id, // Include debate ID to prevent duplicates
                });
                hasStatsRecorded.current = true; // Mark as recorded to prevent duplicates
                console.log('[Debate Stats] ✅ Recorded stats for auto-ended debate:', debate.title, {
                  agreeCount,
                  disagreeCount,
                  totalParticipants,
                });
              } else {
                console.log('[Debate Stats] ⚠️ Skipping stats recording (auto-end): no active participants found.');
              }
            } catch (statsError) {
              // Don't fail the debate end if stats recording fails
              console.error('[Debate Stats] Failed to record stats:', statsError);
            }
          }

          endDebate(debate.id);
          console.log('[Debate] Auto-ended debate due to time expiry');
        } catch (error) {
          console.error('Failed to auto-end debate:', error);
          // Even if API call fails, still redirect users after delay
        }

        // CRITICAL: Only refresh if we haven't already refreshed, we're not leaving, AND user hasn't joined
        if (!hasRefreshedRef.current && !isLeavingRef.current && !hasJoined) {
          // Perform one-time refresh
          performOneTimeRefresh('debate_ended');
        } else {
          console.log('[Debate] Auto-end check: Already refreshed, leaving, or user has joined, skipping refresh', {
            hasRefreshed: hasRefreshedRef.current,
            isLeaving: isLeavingRef.current,
            hasJoined,
          });
        }
      }
    };

    // Check immediately and then every 5 seconds for more accurate timing
    checkTime();
    const interval = setInterval(checkTime, 5000);

    return () => clearInterval(interval);
  }, [debate, showToast, isHost, endDebate, performOneTimeRefresh, participants, removedUsers]);

  // Cleanup microphone stream when debate ends or component unmounts
  useEffect(() => {
    return () => {
      // Cleanup on unmount - stop all microphone streams
      console.log('[Debate Room] Component unmounting, cleaning up microphone...');
      stopStream();

      // Also ensure all media tracks are stopped
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            // If we can still get a stream, stop all its tracks
            stream.getTracks().forEach(track => {
              console.log('[Debate Room] Stopping track on unmount:', track.kind, track.id);
              track.stop();
            });
          })
          .catch(() => {
            // If we can't get stream, it's already stopped - that's fine
          });
      }
    };
  }, [stopStream]);

  // Auto-mute/unmute logic replaced by manual toggle
  /*
  // Auto-unmute when host approves
  useEffect(() => {
    if (currentSpeakerId === currentUser.id && isPermissionGranted && isLocalMuted && !isHost) {
      setLocalMuted(false);
      showToast('You can now speak!', 'success');
    }
  }, [currentSpeakerId, isPermissionGranted, isLocalMuted, isHost, setLocalMuted, showToast]);
  
  // Auto-mute when not speaking
  useEffect(() => {
    if (!isHost && currentSpeakerId !== currentUser.id && isPermissionGranted && !isLocalMuted) {
      setLocalMuted(true);
    }
  }, [currentSpeakerId, isHost, isPermissionGranted, isLocalMuted, setLocalMuted]);
  */

  // Auto-activate next speaker when current ends - REMOVED for Open Mic
  /*
  useEffect(() => {
    if (!currentSpeakerId && speakQueue.length > 0 && isHost) {
      const nextSpeaker = speakQueue[0];
      setTimeout(() => {
        approveSpeakRequest(nextSpeaker.userId);
      }, 500);
    }
  }, [currentSpeakerId, speakQueue, isHost, approveSpeakRequest]);
  */

  // Global handler to play all audio elements on user interaction (Safari workaround)
  // MUST be placed with all other hooks, before any conditional returns
  useEffect(() => {
    let audioUnlocked = false;

    const playAllAudio = () => {
      const audioElements = document.querySelectorAll('audio[data-user-id]');
      let anyPlayed = false;

      audioElements.forEach((audioEl) => {
        const audio = audioEl as HTMLAudioElement;
        if (audio.paused && audio.srcObject) {
          audio.play()
            .then(() => {
              anyPlayed = true;
              if (!audioUnlocked) {
                audioUnlocked = true;
                console.log('[Debate Room] ✅ Audio unlocked! All remote audio should now play.');
              }
            })
            .catch((err) => {
              console.log('[Debate Room] Could not play audio on interaction:', err);
            });
        }
      });

      return anyPlayed;
    };

    // Try to play immediately on mount (in case user already interacted)
    setTimeout(() => {
      playAllAudio();
    }, 500);

    // Listen for ANY user interaction to unlock audio in Safari
    // Use capture phase to catch events early
    const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown', 'pointerdown'];
    const playOnInteraction = (e: Event) => {
      const played = playAllAudio();
      if (played && !audioUnlocked) {
        console.log('[Debate Room] Audio unlocked via user interaction:', e.type);
      }
    };

    events.forEach(eventType => {
      // Use capture phase and make it non-passive so we can ensure it runs
      document.addEventListener(eventType, playOnInteraction, { capture: true, passive: true });
      // Also add to window for better coverage
      window.addEventListener(eventType, playOnInteraction, { capture: true, passive: true });
    });

    // Also try periodically (some browsers allow this after a delay)
    const periodicRetry = setInterval(() => {
      if (!audioUnlocked) {
        playAllAudio();
      } else {
        clearInterval(periodicRetry);
      }
    }, 1000);

    // Clear after 30 seconds
    setTimeout(() => {
      clearInterval(periodicRetry);
    }, 30000);

    return () => {
      events.forEach(eventType => {
        document.removeEventListener(eventType, playOnInteraction, { capture: true });
        window.removeEventListener(eventType, playOnInteraction, { capture: true });
      });
      clearInterval(periodicRetry);
    };
  }, []);

  // Check audio unlock status - MUST be placed with all other hooks
  useEffect(() => {
    const checkAudioStatus = () => {
      const audioElements = document.querySelectorAll('audio[data-user-id]');
      let anyPlaying = false;
      audioElements.forEach((audioEl) => {
        const audio = audioEl as HTMLAudioElement;
        if (!audio.paused && audio.srcObject) {
          anyPlaying = true;
        }
      });
      if (anyPlaying && !audioUnlocked) {
        setAudioUnlocked(true);
      }
    };

    const interval = setInterval(checkAudioStatus, 1000);
    return () => clearInterval(interval);
  }, [audioUnlocked]);

  // Reset permission flags when leaving the room
  useEffect(() => {
    if (!hasJoined) {
      // User left the room - reset permission flags so they can be requested again on rejoin
      setHasRequestedPermission(false);
      const permissionAskedKey = `mic_permission_asked_${debateId}`;
      sessionStorage.removeItem(permissionAskedKey);
      console.log('[Mic Permission] User left room, reset permission flags for rejoin');

      // Note: We don't reset isPermissionGranted here because the browser permission
      // is still valid. However, the stream will be stopped, so we need to reactivate
      // it when rejoining. The permission check useEffect will handle this.
    }
  }, [hasJoined, debateId]);

  // Automatically request microphone permission when joining (like real apps)
  // Only ask once per session - use browser's native prompt directly (no custom modal)
  useEffect(() => {
    // Use refs to track values without causing re-renders
    const debateHostId = debate?.hostId || debate?.host?.id;
    const currentUserId = currentUser?.id;
    const hasActiveStream = localStream && localStream.getAudioTracks().some(track => track.readyState === 'live');

    console.log('[Mic Permission] useEffect triggered:', {
      hasJoined,
      hasRequestedPermission,
      isPermissionGranted,
      debateId,
      isHost,
      debateHostId,
      currentUserId,
      hasActiveStream,
    });

    if (!hasJoined) {
      console.log('[Mic Permission] Not joined yet, skipping');
      return;
    }

    if (hasRequestedPermission) {
      console.log('[Mic Permission] Already requested, skipping');
      return;
    }

    // CRITICAL FIX: For hosts, wait until host status is determined before requesting mic permission
    // This prevents the host from appearing as a regular user during the permission request
    // The issue: When host joins, debate.host might not be populated yet, so isHost is false
    // Solution: If we detect we might be the host (by comparing IDs), wait a bit for isHost to update
    const mightBeHost = currentUserId && debateHostId && debateHostId === currentUserId;

    // If we detect we might be the host but isHost is still false, wait a bit before proceeding
    // This handles the case where debate.hostId exists but isHost hasn't updated yet (useMemo delay)
    // We'll add a small delay to the permission request to allow host status to be determined
    const shouldDelayForHost = mightBeHost && !isHost;

    if (shouldDelayForHost) {
      console.log('[Mic Permission] ⏳ Host detected (by ID) but isHost is false, waiting for host status to update...', {
        debateHostId,
        currentUserId,
        isHost,
      });
      // Return early to wait for isHost to update - the effect will re-run when isHost changes
      return;
    }

    // Check if we've already asked in this session (stored in sessionStorage)
    // Note: This is cleared when user leaves, so it will be requested again on rejoin
    const permissionAskedKey = `mic_permission_asked_${debateId}`;
    const alreadyAsked = sessionStorage.getItem(permissionAskedKey);

    // CRITICAL: Check if we actually have an active stream, not just permission state
    // isPermissionGranted might be true from previous session, but stream might be stopped
    if (hasActiveStream) {
      // We have an active stream, no need to request permission
      console.log('[Mic Permission] ✅ Stream already active, no need to request permission');
      setHasRequestedPermission(true);
      sessionStorage.setItem(permissionAskedKey, 'true');
      return;
    }

    // If we don't have an active stream, we need to request permission/get stream
    // This handles both cases: no permission yet, or permission granted but stream stopped
    console.log('[Mic Permission] No active stream found, will request permission/get stream');

    if (alreadyAsked === 'true') {
      // We already asked in this session, but stream is not active
      // This might happen if permission was denied or stream was stopped
      // Try to get stream one more time (in case permission was granted but stream wasn't created)
      console.log('[Mic Permission] Already asked but no stream, attempting to get stream...');
      (async () => {
        try {
          const stream = await requestMicrophoneAccess();
          if (stream && stream.getAudioTracks().some(track => track.readyState === 'live')) {
            console.log('[Mic Permission] ✅ Stream obtained after rejoin');
          } else {
            console.warn('[Mic Permission] Could not get stream even though already asked');
          }
        } catch (error) {
          console.log('[Mic Permission] Failed to get stream:', error);
        }
      })();
      setHasRequestedPermission(true);
      return;
    }

    // Check browser permission state first (if available)
    const checkBrowserPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('[Mic Permission] Browser permission state:', result.state);

          if (result.state === 'granted') {
            // Permission already granted, request access silently (no prompt)
            console.log('[Mic Permission] Permission already granted, requesting access silently...');
            try {
              const stream = await requestMicrophoneAccess();
              if (stream && stream.getAudioTracks().some(track => track.readyState === 'live')) {
                console.log('[Mic Permission] ✅ Access granted automatically, stream is live');
                setHasRequestedPermission(true);
                sessionStorage.setItem(permissionAskedKey, 'true');
                return;
              } else {
                // Stream is null or not live - this shouldn't happen but handle it
                console.warn('[Mic Permission] Permission granted but stream is invalid, will show prompt');
                // Fall through to show prompt
              }
            } catch (error) {
              console.log('[Mic Permission] Auto-request failed:', error);
              // Fall through to show prompt
            }
          } else if (result.state === 'denied') {
            // Permission denied, don't ask again
            console.log('[Mic Permission] Permission denied, not asking');
            setHasRequestedPermission(true);
            sessionStorage.setItem(permissionAskedKey, 'true');
            return;
          }
          // If state is 'prompt', fall through to request permission directly
        }
      } catch (error) {
        console.log('[Mic Permission] Could not check browser permission state:', error);
      }

      // Request permission directly using browser's native prompt (no custom modal)
      // CRITICAL: For hosts, ensure we have host status before requesting
      // This prevents the host from appearing as a regular user during permission request
      if (isHost) {
        console.log('[Mic Permission] ✅ Host confirmed, proceeding with mic permission request');
      } else {
        console.log('[Mic Permission] Regular user, proceeding with mic permission request');
      }
      // This will show the browser's standard permission prompt
      console.log('[Mic Permission] Requesting microphone permission directly (browser prompt)...');
      setHasRequestedPermission(true);
      sessionStorage.setItem(permissionAskedKey, 'true');

      // Request after a delay (longer for hosts to ensure host status is determined)
      // Hosts get 1000ms delay, regular users get 500ms
      // Capture isHost value at this point to avoid stale closure
      const hostStatus = isHost;
      const delay = hostStatus ? 1000 : 500;
      setTimeout(async () => {
        try {
          console.log('[Mic Permission] Requesting microphone access on join/rejoin...');
          const stream = await requestMicrophoneAccess();
          if (stream) {
            console.log('[Mic Permission] ✅ Permission granted, localStream created:', {
              streamId: stream.id,
              tracks: stream.getAudioTracks().map(t => ({
                id: t.id,
                enabled: t.enabled,
                readyState: t.readyState,
              })),
            });
            showToastRef.current('Microphone connected. Click the mic button to speak.', 'success');
          } else {
            console.log('[Mic Permission] Permission denied via browser prompt');
            showToastRef.current('Microphone access denied. You can still listen to others.', 'info');
          }
        } catch (error: any) {
          console.log('[Mic Permission] Permission request failed:', error);
          if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
            showToastRef.current('Microphone permission denied. You can still listen to others.', 'info');
          }
        }
      }, delay);
    };

    checkBrowserPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasJoined, hasRequestedPermission, isPermissionGranted, debateId, isHost]);

  // Simple toggle mute/unmute - just works
  const handleToggleSelfMute = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    try {
      // Ensure LiveKit is connected before toggling (critical after page refresh)
      if (!isLiveKitConnected) {
        showToast('Connecting to room...', 'info');
        // Wait for connection with retries (up to 3 seconds)
        let retries = 0;
        while (!isLiveKitConnected && retries < 6) {
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
        if (!isLiveKitConnected) {
          showToast('Please wait for connection to establish. Try again in a moment.', 'error');
          return;
        }
      }

      // Ensure we have a localStream (use ref to get latest, prevents stale closures)
      let currentStream = localStreamRef.current || localStream;

      if (!isPermissionGranted || !currentStream) {
        console.log('[Mute Toggle] No stream available, requesting microphone access...');
        const stream = await requestMicrophoneAccess();
        if (!stream) {
          showToast('Please allow microphone access', 'error');
          return;
        }
        currentStream = stream;
        localStreamRef.current = stream;
        // Wait a bit for stream to be ready
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Log current track state before toggle (critical for debugging rejoin issues)
      const audioTracks = currentStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        console.log('[Mute Toggle] Current track state before toggle:', {
          trackId: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      }

      // Toggle mute/unmute via LiveKit
      await toggleLiveKitMute();

      // Also directly toggle the local track to ensure it's in sync
      // This ensures the track state is correct even if LiveKit has issues
      audioTracks.forEach(track => {
        const newEnabled = !isLiveKitMuted; // isLiveKitMuted reflects state BEFORE toggle
        track.enabled = newEnabled;
        console.log('[Mute Toggle] Directly set track.enabled:', newEnabled, {
          trackId: track.id,
          readyState: track.readyState,
        });
      });

      // Show feedback
      setTimeout(() => {
        if (isLiveKitMuted) {
          showToast('Microphone unmuted', 'success');
        } else {
          showToast('Microphone muted', 'info');
        }
      }, 100);
    } catch (error: any) {
      console.error('[Mute] Error toggling mute:', error);
      showToast(error?.message || 'Failed to toggle microphone', 'error');
    }
  }, [toggleLiveKitMute, isPermissionGranted, localStream, requestMicrophoneAccess, showToast, isLiveKitMuted, isLiveKitConnected]);

  // Host can only remove users, not mute them

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Define all callbacks before conditional returns to maintain hook order

  const handleJoinSide = useCallback(async (side: 'agree' | 'disagree') => {
    if (!currentUser?.id) {
      console.error('[DEBUG] Cannot join: user not authenticated');
      showToast('Please log in to join debates', 'error');
      router.push('/login?next=/debates/' + debateId);
      return;
    }

    console.log('[DEBUG] handleJoinSide called with side:', side, 'currentUser:', currentUser.id);

    // Store the selected side in localStorage per debate (not per user)
    // Format: debateSide:<debateId> -> "agree" | "disagree"
    // This persists across rejoins and is only cleared on explicit reset or debateId change
    const sideKey = `debateSide:${debateId}`;
    localStorage.setItem(sideKey, side);
    console.log('[Side Selection] Saved side to localStorage:', sideKey, side);

    // Set joining flag to prevent auth redirect during join process
    isJoiningRef.current = true;

    try {
      setShowJoinModal(false);

      // Call API to join (this will also register participant in backend)
      await debateAPI.join(debateId, { userId: currentUser.id, side });

      // Update local state
      joinRoom(debateId, side, currentUser.id);

      // Permission will be requested automatically via useEffect when hasJoined becomes true
      // No need to manually show modal here

      // Clear joining flag after successful join
      isJoiningRef.current = false;
    } catch (error: any) {
      console.error('Failed to join debate:', error);

      // Clear joining flag on error
      isJoiningRef.current = false;

      // Handle authentication errors specifically
      if (error?.isUnauthorized || error?.status === 401) {
        showToast('Please log in to join debates', 'error');
        router.push('/login?next=/debates/' + debateId);
        return;
      }

      // For other errors, just show a toast and keep the modal open
      showToast('Failed to join debate. Please try again.', 'error');
      setShowJoinModal(true);
    }
  }, [debateId, currentUser?.id, joinRoom, showToast, router]);

  // Update ref so handleJoinSide can be accessed by useEffect before it's defined
  useEffect(() => {
    handleJoinSideRef.current = handleJoinSide;
  }, [handleJoinSide]);

  const handleAllowMicrophone = useCallback(async () => {
    setIsRequestingMic(true);
    try {
      const stream = await requestMicrophoneAccess();
      setIsRequestingMic(false);

      if (stream) {
        showToast('Microphone connected. Click the mic button to speak.', 'success');
        setShowMicPermissionModal(false);
        // Store that permission was granted
        const permissionGrantedKey = `mic_permission_granted_${debateId}`;
        sessionStorage.setItem(permissionGrantedKey, 'true');
      } else {
        showToast('Microphone access denied', 'error');
      }
    } catch (error: any) {
      setIsRequestingMic(false);
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        showToast('Microphone permission denied. You can still listen to others.', 'info');
        // Store that permission was denied so we don't ask again
        const permissionDeniedKey = `mic_permission_denied_${debateId}`;
        sessionStorage.setItem(permissionDeniedKey, 'true');
      } else {
        showToast('Failed to access microphone', 'error');
      }
    }
  }, [requestMicrophoneAccess, showToast, debateId]);

  const handleDenyMicrophone = useCallback(() => {
    setShowMicPermissionModal(false);
    showToast('You can still listen to others. Enable microphone later to speak.', 'info');
    // Store that user denied so we don't ask again in this session
    const permissionDeniedKey = `mic_permission_denied_${debateId}`;
    sessionStorage.setItem(permissionDeniedKey, 'true');
  }, [showToast, debateId]);

  const handleLeave = useCallback(async () => {
    if (!currentUser) return;

    // Close confirmation modal immediately
    setShowLeaveConfirm(false);

    // OPTIMISTIC: Mark as leaving and navigate immediately (don't wait for API)
    isLeavingRef.current = true;
    showToast('Left the debate', 'info');

    // Navigate immediately for instant UX
    router.push('/debates');

    // Background cleanup (don't block navigation)
    setTimeout(async () => {
      try {
        // Clean up LiveKit state and microphone
        stopMicrophone(); // Stops tracks + clears refs immediately
        leaveRoom();

        // Send leave signal to backend (fire and forget)
        debateAPI.leave(debateId, currentUser.id).catch((error) => {
          console.warn('Failed to leave debate in background (ignoring):', error);
        });
      } catch (error) {
        console.warn('Error during background cleanup (ignoring):', error);
      }
    }, 0); // Run in next tick, don't block navigation
  }, [debateId, currentUser?.id, showToast, router, stopStream, leaveRoom]);

  const handleSwitchRoom = useCallback(async () => {
    if (hasSwitched) {
      showToast('You have already switched rooms once', 'info');
      return;
    }
    if (isSpectator) {
      showToast('Spectators cannot switch rooms', 'info');
      return;
    }

    if (!currentUser?.id) {
      showToast('Please log in to switch rooms', 'error');
      return;
    }

    const newSide = userSide === 'agree' ? 'disagree' : 'agree';

    try {
      // Update localStorage with new side (this is the explicit "change side" action)
      const sideKey = `debateSide:${debateId}`;
      localStorage.setItem(sideKey, newSide);
      console.log('[Side Selection] Updated side in localStorage:', sideKey, newSide);

      // Call API to update side on server (this will update existing participant's side)
      await debateAPI.join(debateId, { userId: currentUser.id, side: newSide });

      // Update local state only after API call succeeds
      // This sets hasSwitched = true, which will hide the button
      switchSide(currentUser.id);

      // Update participants immediately to reflect the switch
      setParticipants(prev => {
        return prev.map(p => {
          if (p.userId === currentUser.id) {
            return { ...p, side: newSide };
          }
          return p;
        });
      });

      showToast(`Switched to ${newSide === 'agree' ? 'Agree' : 'Disagree'} side`, 'success');

      // Server will broadcast debate:participants_updated which will sync the UI
    } catch (error: any) {
      console.error('Failed to switch room:', error);

      // Handle specific error cases
      if (error?.status === 401 || error?.isUnauthorized) {
        showToast('Please log in to switch rooms', 'error');
        router.push('/login?next=/debates/' + debateId);
        return;
      }

      showToast('Failed to switch room. Please try again.', 'error');
      // Don't update local state if API call failed
    }
  }, [hasSwitched, isSpectator, userSide, switchSide, currentUser?.id, debateId, showToast, router]);

  const handleEndDebate = useCallback(async () => {
    console.log('[End Debate] handleEndDebate called');
    console.log('[End Debate] Current state:', {
      hasDebate: !!debate,
      hasCurrentUser: !!currentUser,
      debateId: debate?.id,
      userId: currentUser?.id,
      isAuthenticated,
      isHost,
    });

    if (!debate || !currentUser) {
      console.error('[End Debate] Missing debate or currentUser', { hasDebate: !!debate, hasCurrentUser: !!currentUser });
      showToast('Unable to end debate. Please refresh the page.', 'error');
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      console.error('[End Debate] User is not authenticated');
      showToast('Please log in to end the debate', 'error');
      setShowEndDebateModal(false);
      return;
    }

    // Verify user is host before attempting to end
    const hostId = debate.hostId || debate.host?.id;
    if (hostId !== currentUser.id) {
      console.error('[End Debate] User is not the host', { hostId, userId: currentUser.id, debateId: debate.id });
      showToast('Only the debate host can end the debate', 'error');
      setShowEndDebateModal(false);
      return;
    }

    try {
      console.log('[End Debate] Attempting to end debate:', debate.id, 'as host:', currentUser.id);
      console.log('[End Debate] Debate hostId:', debate.hostId, 'Current user id:', currentUser.id);
      console.log('[End Debate] Is authenticated:', isAuthenticated);
      console.log('[End Debate] Auth token exists:', typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : 'N/A (SSR)');
      console.log('[End Debate] debateAPI.update exists:', typeof debateAPI.update === 'function');

      const result = await debateAPI.update(debate.id, { status: 'ENDED' });
      console.log('[End Debate] API response:', result);

      console.log('[End Debate] ✅ Debate ended successfully');

      // Record stats for this debate (if not already recorded)
      await recordDebateStats(debate);

      endDebate(debate.id);
      setShowEndDebateModal(false);
      showToast('Debate ended', 'info');

      // CRITICAL: Only refresh if we haven't already refreshed, we're not leaving, AND user hasn't joined
      // Note: For manual end, we might want to refresh even if user has joined, but let's be safe
      if (!hasRefreshedRef.current && !isLeavingRef.current && !hasJoined) {
        // Perform one-time refresh
        performOneTimeRefresh('debate_ended');
      } else {
        console.log('[Debate] Manual end: Already refreshed, leaving, or user has joined, skipping refresh', {
          hasRefreshed: hasRefreshedRef.current,
          isLeaving: isLeavingRef.current,
          hasJoined,
        });
      }
    } catch (error: any) {
      console.error('[End Debate] ❌ Failed to end debate:', error);
      console.error('[End Debate] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      const errorMessage = error?.message || error?.error || 'Failed to end debate';
      console.error('[End Debate] Error details:', {
        message: errorMessage,
        status: error?.status,
        statusCode: error?.statusCode,
        isUnauthorized: error?.isUnauthorized,
        isForbidden: error?.isForbidden,
        name: error?.name,
        stack: error?.stack?.substring(0, 200),
      });

      // Show more specific error message
      if (error?.status === 401 || error?.statusCode === 401 || error?.isUnauthorized) {
        showToast('Authentication required. Please log in again.', 'error');
      } else if (error?.status === 403 || error?.statusCode === 403 || error?.isForbidden || errorMessage.includes('host') || errorMessage.includes('Only the debate host')) {
        showToast('Only the debate host can end the debate', 'error');
      } else if (error?.status === 404 || error?.statusCode === 404) {
        showToast('Debate not found. It may have already been deleted.', 'error');
      } else {
        showToast(errorMessage || 'Failed to end debate. Please try again.', 'error');
      }

      // Don't close modal on error so user can try again
      // setShowEndDebateModal(false);
    }
  }, [debate, currentUser, isAuthenticated, endDebate, showToast, performOneTimeRefresh, recordDebateStats, hasRefreshedRef, isLeavingRef, hasJoined]);

  const handleDeleteDebate = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this debate? This action cannot be undone.')) return;

    try {
      await debateAPI.delete(debateId);
      showToast('Debate deleted successfully', 'success');
      router.push('/debates');
    } catch (error) {
      console.error('Failed to delete debate:', error);
      showToast('Failed to delete debate', 'error');
    }
  }, [debateId, router, showToast]);


  const handleRemoveUser = useCallback(async (userId: string) => {
    try {
      // Call API to remove participant
      // TODO: Implement removeParticipant API method
      // await debateAPI.removeParticipant(debateId, userId);
      await debateAPI.leave(debateId, userId);

      // Update local state
      removeParticipant(userId);
      setRemovedUsers(prev => new Set(prev).add(userId));

      if (currentUser && userId === currentUser.id) {
        setShowRemovedMessage(true);
        setTimeout(() => {
          leaveRoom();
          router.push('/debates');
        }, 3000);
      } else {
        showToast('User removed', 'info');
        // Remove from participants list
        setParticipants(prev => prev.filter(p => p.userId !== userId));
      }
      setShowUserOptionsModal(false);
    } catch (error) {
      console.error('Failed to remove user:', error);
      showToast('Failed to remove user', 'error');
    }
  }, [debateId, currentUser?.id, removeParticipant, leaveRoom, router, setParticipants, showToast]);

  const handleParticipantClick = useCallback((participant: any) => {
    if (!currentUser) return;
    console.log('[DEBUG] handleParticipantClick called', { isHost, participantId: participant.id, currentUserId: currentUser.id });
    if (isHost && participant.id !== currentUser.id) {
      console.log('[DEBUG] Opening UserOptionsModal for participant:', participant);
      setSelectedUser(participant);
      setShowUserOptionsModal(true);
    } else {
      console.log('[DEBUG] Cannot open modal - isHost:', isHost, 'isSelf:', participant.id === currentUser.id);
    }
  }, [isHost, currentUser?.id]);

  // NOW we can do early returns - all hooks are defined above
  // Track if user is in the process of joining to prevent redirect during join
  const isJoiningRef = useRef(false);

  // Redirect to login if not authenticated (but only after auth check is complete and not during join)
  // Be more lenient - check cookie exists before redirecting
  useEffect(() => {
    // Wait a bit to ensure auth validation completes
    const timeoutId = setTimeout(() => {
      if (!authLoading && !isAuthenticated && !isJoiningRef.current && !currentUser) {
        // Double check cookie exists before redirecting
        const hasCookie = typeof document !== 'undefined' &&
          document.cookie.split(';').some(c => c.trim().startsWith('v_auth='));
        if (!hasCookie) {
          router.push('/login?next=/debates/' + debateId);
        }
      }
    }, 1000); // Give auth validation time to complete

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, authLoading, router, debateId, currentUser?.id]);

  // Don't render if not authenticated (but wait for auth check to complete and not during join)
  // Be more lenient - if cookie exists, assume authenticated even if validation is pending
  const hasAuthCookie = typeof document !== 'undefined' &&
    document.cookie.split(';').some(c => c.trim().startsWith('v_auth='));
  const shouldRender = authLoading || isJoiningRef.current || isAuthenticated || hasAuthCookie || currentUser;

  if (!shouldRender) {
    return null;
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0C1117] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C1117] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="min-h-screen bg-[#0C1117] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Debate not found</h1>
          <button
            onClick={() => router.push('/debates')}
            className="text-cyan-400 hover:text-cyan-300"
          >
            ← Back to debates
          </button>
        </div>
      </div>
    );
  }

  // Show waiting screen for scheduled debates
  if (isScheduled) {
    const startTime = new Date(debate.startTime);
    const now = new Date();
    const timeUntilStart = startTime.getTime() - now.getTime();
    const minutesUntilStart = Math.floor(timeUntilStart / 60000);
    const hoursUntilStart = Math.floor(minutesUntilStart / 60);

    return (
      <div className="min-h-screen bg-[#0C1117] flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">{debate.title}</h1>
          <p className="text-gray-400 mb-6">
            This debate is scheduled to start {hoursUntilStart > 0 ? `in ${hoursUntilStart} hour${hoursUntilStart > 1 ? 's' : ''}` : `in ${minutesUntilStart} minute${minutesUntilStart > 1 ? 's' : ''}`}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Start time: {startTime.toLocaleString()}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/debates')}
              className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
            >
              ← Back to Debates
            </button>

            {isHost && (
              <button
                onClick={handleDeleteDebate}
                className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                Delete Debate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filter and sort participants
  let agreeSide = participants.filter(p => p.side === 'agree' && !removedUsers.has(p.userId) && p.userId !== debate?.hostId);
  let disagreeSide = participants.filter(p => p.side === 'disagree' && !removedUsers.has(p.userId) && p.userId !== debate?.hostId);

  // FORCE RENDER logic removed as backend upsert fix handles this correctly now.
  // The merge logic in fetchDebate also handles optimistic updates.

  const currentSpeaker = participants.find(p => p.userId === currentSpeakerId);

  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get peer mute status for a participant
  const getPeerMuteStatus = (participantId: string): boolean => {
    const peer = liveKitPeers.find(p => p.userId === participantId);
    return peer?.isMuted ?? true;
  };

  return (
    <div className="min-h-screen bg-[#0C1117] text-gray-100">
      {/* Audio Players for remote participants */}
      {liveKitPeers.map((peer) => (
        <AudioPlayer
          key={peer.userId}
          stream={peer.stream}
          userId={peer.userId}
          isMuted={false}
          isRemoteMuted={peer.isMuted}
        />
      ))}

      {/* Safari Audio Unlock Banner - Show if audio is blocked */}
      {!audioUnlocked && liveKitPeers.length > 0 && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-16 left-0 right-0 z-50 bg-yellow-500/20 border-b border-yellow-500/30 backdrop-blur-md"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span className="text-sm text-yellow-200">
                Click anywhere to enable audio playback
              </span>
            </div>
            <button
              onClick={() => setAudioUnlocked(true)}
              className="text-xs text-yellow-300 hover:text-yellow-200 underline"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* Removed Message Modal */}
      <AnimatePresence>
        {showRemovedMessage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#1F2937] border border-white/[0.08] rounded-2xl shadow-2xl p-8 text-center max-w-md"
              >
                <div className="text-4xl mb-4">🚪</div>
                <h2 className="text-2xl font-bold text-gray-100 mb-2">
                  You've been removed from debate
                </h2>
                <p className="text-gray-400 mb-4">
                  Redirecting to debates list...
                </p>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>


      {/* Main Layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Host Queue Sidebar */}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-white/[0.08] gap-3">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => router.push('/debates')}
                className="text-gray-300 hover:text-white text-xl sm:text-2xl flex-shrink-0"
              >
                ←
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-100 truncate">{debate.title}</h1>
              </div>
            </div>

            {isHost && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {currentSpeaker && (
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-xs sm:text-sm">
                    <span className="text-cyan-400">Speaker:</span>
                    <span className="font-medium text-gray-200 truncate">{currentSpeaker.displayName}</span>
                    <span className="text-gray-400 whitespace-nowrap">{formatTimer(speakerTimer)} / 2:00</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => setShowEndDebateModal(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-xs sm:text-sm font-medium"
                  >
                    🔘 End Debate
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Host Stage */}
          {debate.hostId && (() => {
            // Only show host section if host has actually joined (is in participants list AND in LiveKit room)
            const host = participants.find(p => p.userId === debate.hostId);
            const hostInLiveKit = liveKitPeers.find(p => p.userId === debate.hostId);
            const isCurrentUserHost = currentUser?.id === debate.hostId;

            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log('[Host Stage] Host visibility check:', {
                hostId: debate.hostId,
                hostInParticipants: !!host,
                hostInLiveKit: !!hostInLiveKit,
                isCurrentUserHost,
                isLiveKitConnected,
                liveKitPeers: liveKitPeers.map(p => p.userId),
                participants: participants.map(p => p.userId),
              });
            }

            // Show host if they're in the participants list (joined the debate)
            // They don't need to be in LiveKit yet - we'll show them once they join the debate
            // This helps other users see that the host has joined, even if mic isn't enabled yet
            if (!host) {
              // Host hasn't joined the debate yet
              if (process.env.NODE_ENV === 'development') {
                console.log('[Host Stage] Host not in participants list');
              }
              return null;
            }

            // Host is in participants - show them
            // Note: They might not have published a LiveKit track yet (if mic not enabled)
            // But we still show them so others know the host has joined

            const isSpeaking = currentSpeakerId === host.id;
            const isCurrentUser = currentUser && (host.userId === currentUser.id || host.id === currentUser.id);

            // Use local mute state for current user, peer state for others
            const isMuted = isCurrentUser
              ? isLiveKitMuted  // Use LiveKit mute state
              : getPeerMuteStatus(host.userId || host.id);  // Use peer mute status

            return (
              <div className="flex justify-center py-4">
                <div
                  className={`flex flex-col items-center transition-transform`}
                >
                  <div className={`relative mb-2 transition-all duration-300 ${!isMuted ? 'ring-4 ring-green-400 ring-offset-4 ring-offset-[#0C1117] rounded-full' : isSpeaking ? 'ring-4 ring-cyan-400 ring-offset-4 ring-offset-[#0C1117] rounded-full' : ''}`}>
                    <Image
                      src={host.avatar || `https://ui-avatars.com/api/?name=${host.displayName || 'Host'}&background=random`}
                      alt={host.displayName}
                      width={80}
                      height={80}
                      className="rounded-full w-20 h-20 border-4 border-[#1F2937]"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#0C1117] z-10 ${isCurrentUser ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isCurrentUser) {
                          handleToggleSelfMute(e);
                        }
                      }}
                      onMouseDown={(e) => {
                        // Prevent any hover-related issues
                        e.stopPropagation();
                      }}
                      title={isCurrentUser ? (isMuted ? 'Click to unmute' : 'Click to mute') : (isMuted ? 'Muted' : 'Unmuted')}
                    >
                      {isMuted ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 3 3 0 .44-.03.65-.08l2.97 2.97c-.85.35-1.76.57-2.71.57V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2c0 1.45-.51 2.79-1.35 3.83L19.73 21 21 19.73 4.27 3z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-sm font-bold text-gray-100">{host.displayName}</p>
                    <p className="text-[10px] text-gray-400">@{host.handle || host.displayName.toLowerCase().replace(/\s+/g, '')}</p>
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded-full mt-1 border border-cyan-500/30">
                      HOST
                    </span>
                    {/* Pulse indicator when speaking */}
                    {!isMuted && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <motion.div
                          className="w-1.5 h-1.5 bg-green-400 rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <motion.div
                          className="w-1.5 h-1.5 bg-green-400 rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className="w-1.5 h-1.5 bg-green-400 rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.4,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Two Panels: Agree | Disagree */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 sm:p-4 overflow-y-auto">
            {/* Agree Panel */}
            <div className="bg-[#1A1F2E] rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-100">AGREE</h2>
                <span className="text-base sm:text-lg font-semibold text-gray-400">{agreeSide.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-5 sm:gap-6">
                {agreeSide.length === 0 ? (
                  <div className="w-full text-center text-gray-500 py-8 text-sm">No participants</div>
                ) : (
                  agreeSide.map((participant) => {
                    const isSpeaking = currentSpeakerId === participant.id;
                    const isCurrentUser = currentUser && (participant.userId === currentUser.id || participant.id === currentUser.id);
                    // Use local mute state for current user, peer state for others
                    const isMuted = isCurrentUser
                      ? isLiveKitMuted  // Use LiveKit mute state
                      : getPeerMuteStatus(participant.userId || participant.id);  // Use peer mute status

                    return (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        onClick={(e) => {
                          console.log('[DEBUG] Participant div clicked', { isHost, isCurrentUser, participantId: participant.id });
                          if (isHost && !isCurrentUser) {
                            e.stopPropagation();
                            handleParticipantClick(participant);
                          }
                        }}
                        className={`flex flex-col items-center ${isHost && !isCurrentUser ? 'cursor-pointer hover:opacity-80' : ''}`}
                      >
                        <div className={`relative mb-2 transition-all duration-300 ${!isMuted ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-[#1A1F2E] rounded-full' : isSpeaking ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-[#1A1F2E] rounded-full' : ''}`}>
                          <Image
                            src={participant.avatar || `https://ui-avatars.com/api/?name=${participant.displayName || participant.id}&background=random`}
                            alt={participant.displayName}
                            width={56}
                            height={56}
                            className="rounded-full w-14 h-14 sm:w-16 sm:h-16"
                          />
                          <div
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1A1F2E] z-10 ${isCurrentUser ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (isCurrentUser) {
                                handleToggleSelfMute(e);
                              }
                            }}
                            onMouseDown={(e) => {
                              // Prevent any hover-related issues
                              e.stopPropagation();
                            }}
                            title={isCurrentUser ? (isMuted ? 'Click to unmute' : 'Click to mute') : (isMuted ? 'Muted' : 'Unmuted')}
                          >
                            {isMuted ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 3 3 0 .44-.03.65-.08l2.97 2.97c-.85.35-1.76.57-2.71.57V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2c0 1.45-.51 2.79-1.35 3.83L19.73 21 21 19.73 4.27 3z" /></svg>
                            ) : (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-200 text-center truncate w-full">
                          {participant.displayName}
                        </p>
                        {/* Pulse indicator when speaking */}
                        {!isMuted && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <motion.div
                              className="w-1.5 h-1.5 bg-green-400 rounded-full"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                            <motion.div
                              className="w-1.5 h-1.5 bg-green-400 rounded-full"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2,
                              }}
                            />
                            <motion.div
                              className="w-1.5 h-1.5 bg-green-400 rounded-full"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.4,
                              }}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Disagree Panel */}
            <div className="bg-[#1A1F2E] rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-100">DISAGREE</h2>
                <span className="text-base sm:text-lg font-semibold text-gray-400">{disagreeSide.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-5 sm:gap-6">
                {disagreeSide.length === 0 ? (
                  <div className="w-full text-center text-gray-500 py-8 text-sm">No participants</div>
                ) : (
                  disagreeSide.map((participant) => {
                    const isSpeaking = currentSpeakerId === participant.id;
                    const isCurrentUser = currentUser && (participant.userId === currentUser.id || participant.id === currentUser.id);
                    // Use local mute state for current user, peer state for others
                    const isMuted = isCurrentUser
                      ? isLiveKitMuted  // Use LiveKit mute state
                      : getPeerMuteStatus(participant.userId || participant.id);  // Use peer mute status

                    return (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        onClick={(e) => {
                          console.log('[DEBUG] Participant div clicked', { isHost, isCurrentUser, participantId: participant.id });
                          if (isHost && !isCurrentUser) {
                            e.stopPropagation();
                            handleParticipantClick(participant);
                          }
                        }}
                        className={`flex flex-col items-center ${isHost && !isCurrentUser ? 'cursor-pointer hover:opacity-80' : ''}`}
                      >
                        <div className={`relative mb-2 transition-all duration-300 ${!isMuted ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-[#1A1F2E] rounded-full' : isSpeaking ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-[#1A1F2E] rounded-full' : ''}`}>
                          <Image
                            src={participant.avatar || `https://ui-avatars.com/api/?name=${participant.displayName || participant.id}&background=random`}
                            alt={participant.displayName}
                            width={56}
                            height={56}
                            className="rounded-full w-14 h-14 sm:w-16 sm:h-16"
                          />
                          <div
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1A1F2E] z-10 ${isCurrentUser ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (isCurrentUser) {
                                handleToggleSelfMute(e);
                              }
                            }}
                            onMouseDown={(e) => {
                              // Prevent any hover-related issues
                              e.stopPropagation();
                            }}
                            title={isCurrentUser ? (isMuted ? 'Click to unmute' : 'Click to mute') : (isMuted ? 'Muted' : 'Unmuted')}
                          >
                            {isMuted ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 3 3 0 .44-.03.65-.08l2.97 2.97c-.85.35-1.76.57-2.71.57V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2c0 1.45-.51 2.79-1.35 3.83L19.73 21 21 19.73 4.27 3z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-200 text-center truncate w-full">
                          {participant.displayName}
                        </p>
                        {/* Pulse indicator when speaking */}
                        {!isMuted && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <motion.div
                              className="w-1.5 h-1.5 bg-green-400 rounded-full"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                            <motion.div
                              className="w-1.5 h-1.5 bg-green-400 rounded-full"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2,
                              }}
                            />
                            <motion.div
                              className="w-1.5 h-1.5 bg-green-400 rounded-full"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.4,
                              }}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="relative border-t border-white/[0.08] bg-[#0C1117] px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">

              {/* Mic Toggle (Everyone except Spectators and Host) */}
              {!isSpectator && !isHost && (
                <motion.button
                  onClick={(e) => {
                    handleToggleSelfMute(e);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-all ${isLiveKitMuted
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500/30 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 border-2 border-green-500/30 hover:bg-green-500/30'
                    }`}
                  title={isLiveKitMuted ? 'Click to unmute your microphone' : 'Click to mute your microphone'}
                >
                  <div className="flex items-center gap-2">
                    {isLiveKitMuted ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 3 3 0 .44-.03.65-.08l2.97 2.97c-.85.35-1.76.57-2.71.57V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2c0 1.45-.51 2.79-1.35 3.83L19.73 21 21 19.73 4.27 3z" /></svg>
                        <span>🔇 Muted</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                        <span>🎤 Unmuted</span>
                      </>
                    )}
                  </div>
                </motion.button>
              )}

              {/* Switch Room (Non-Host) */}
              {!isHost && !isSpectator && (
                <motion.button
                  onClick={handleSwitchRoom}
                  disabled={hasSwitched}
                  whileHover={!hasSwitched ? { scale: 1.02 } : {}}
                  whileTap={!hasSwitched ? { scale: 0.98 } : {}}
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-all ${hasSwitched
                    ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                >
                  {hasSwitched ? 'Already Switched' : 'Switch Room'}
                </motion.button>
              )}

              {/* Leave Room (Everyone) */}
              <motion.button
                onClick={() => setShowLeaveConfirm(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                Leave Room
              </motion.button>

              {/* Host Specific Controls for Current Speaker (if not self) */}
              {isHost && currentSpeaker && currentUser && currentSpeaker.id !== currentUser.id && (
                <motion.button
                  onClick={() => handleRemoveUser(currentSpeaker.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30 transition-all"
                >
                  ❌ Remove Speaker
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Join Modal */}
      <JoinDebateModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSelectSide={handleJoinSide}
        debateTitle={debate.title}
      />

      {/* Microphone Permission Modal */}
      <MicrophonePermissionModal
        isOpen={showMicPermissionModal}
        onAllow={handleAllowMicrophone}
        onDeny={handleDenyMicrophone}
        isRequesting={isRequestingMic}
      />

      {/* User Options Modal */}
      <UserOptionsModal
        isOpen={showUserOptionsModal}
        onClose={() => setShowUserOptionsModal(false)}
        participant={selectedUser}
        onRemove={handleRemoveUser}
      />

      {/* Leave Confirmation */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaveConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#1F2937] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full"
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Leave Debate?</h3>
                <p className="text-gray-400 text-sm mb-4">Are you sure you want to leave this debate?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeave}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium"
                  >
                    Leave
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* End Debate Confirmation */}
      <AnimatePresence>
        {showEndDebateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEndDebateModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#1F2937] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full"
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-2">End Debate?</h3>
                <p className="text-gray-400 text-sm mb-4">This will end the debate for everyone. Are you sure?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEndDebateModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[End Debate Button] Clicked, calling handleEndDebate');
                      handleEndDebate();
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    End Debate
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>


      {/* Lock Explainer Modal */}
      <LockExplainerModal
        isOpen={showLockModal}
        onClose={() => router.push('/debates')}
        unlockPhase={2}
      />
    </div>
  );
}
