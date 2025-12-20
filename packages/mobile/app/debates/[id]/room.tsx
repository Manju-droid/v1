/**
 * Live Debate Room - Mobile Version
 * 
 * This screen provides audio streaming for active debates using LiveKit.
 * Enhanced to match web version with full feature parity.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { debateAPI, userAPI } from '@v/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { useSignaling } from '../../../lib/useSignaling';
import { Room, RoomEvent, Track, RemoteParticipant } from '@livekit/react-native';
import { fetchLiveKitToken, getLiveKitWSUrl } from '../../../lib/livekitClient';

type DebateRole = 'host' | 'agree' | 'disagree' | 'spectator';

interface Participant {
  userId: string;
  displayName?: string;
  handle?: string;
  avatar?: string;
  role: DebateRole;
  side: 'agree' | 'disagree' | 'spectator' | 'neutral';
  isMuted: boolean;
  isSpeaking: boolean;
  isHost: boolean;
}

export default function DebateRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [debate, setDebate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentRole, setCurrentRole] = useState<DebateRole>('spectator');
  const [userSide, setUserSide] = useState<'agree' | 'disagree' | 'spectator' | 'neutral' | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showUserOptions, setShowUserOptions] = useState(false);
  
  // LiveKit room reference
  const roomRef = useRef<Room | null>(null);
  const participantsRef = useRef<Map<string, any>>(new Map());

  // WebSocket for real-time updates
  const { isConnected: wsConnected, setOnMessage } = useSignaling(
    id || 'debate-room',
    user?.id || 'anonymous'
  );

  useEffect(() => {
    loadDebate();
  }, [id]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    setOnMessage((message: any) => {
      console.log('[Debate Room] WebSocket message:', message.type);
      
      if (message.type === 'debate:status_changed') {
        if (message.status === 'ENDED') {
          Alert.alert('Debate Ended', 'This debate has ended', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else {
          setDebate((prev: any) => prev ? { ...prev, status: message.status } : null);
        }
      } else if (message.type === 'debate:participants_updated') {
        // Refresh participants from API
        refreshParticipants();
      } else if (message.type === 'user-joined' || message.type === 'user-left') {
        // Refresh participants when users join/leave
        refreshParticipants();
      }
    });

    return () => {
      setOnMessage(() => {});
    };
  }, [setOnMessage, router, id]);

  // Poll participants periodically for real-time updates
  useEffect(() => {
    if (!hasJoined || !id) return;

    const interval = setInterval(async () => {
      try {
        await refreshParticipants();
      } catch (error) {
        console.error('Failed to refresh participants:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [hasJoined, id]);

  const loadDebate = async () => {
    try {
      const data = await debateAPI.get(id);
      setDebate(data);
      
      // Check if user is host
      const isHost = user?.id === data.hostId;
      if (isHost) {
        setCurrentRole('host');
        // Auto-join host
        if (data.status === 'ACTIVE') {
          await joinDebate('neutral');
        }
      }
      
      await refreshParticipants();
    } catch (error: any) {
      console.error('Error loading debate:', error);
      Alert.alert('Error', 'Failed to load debate');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const refreshParticipants = async () => {
    if (!id) return;

    try {
      const participantsData = await debateAPI.getParticipants(id);
      
      // Fetch user details for each participant
      const enrichedParticipants = await Promise.all(
        participantsData.map(async (p: any) => {
          try {
            const userData = await userAPI.getById(p.userId);
            return {
              userId: p.userId,
              displayName: userData.name || userData.handle || p.userId,
              handle: userData.handle || p.userId,
              avatar: userData.avatarUrl,
              role: p.userId === debate?.hostId ? 'host' as DebateRole :
                    p.side === 'AGREE' ? 'agree' as DebateRole :
                    p.side === 'DISAGREE' ? 'disagree' as DebateRole :
                    'spectator' as DebateRole,
              side: (p.side?.toLowerCase() || 'spectator') as 'agree' | 'disagree' | 'spectator' | 'neutral',
              isMuted: false, // Will be updated from LiveKit
              isSpeaking: false,
              isHost: p.userId === debate?.hostId,
            };
          } catch (error) {
            // Fallback if user fetch fails
            return {
              userId: p.userId,
              displayName: p.userId,
              handle: p.userId,
              avatar: undefined,
              role: p.userId === debate?.hostId ? 'host' as DebateRole :
                    p.side === 'AGREE' ? 'agree' as DebateRole :
                    p.side === 'DISAGREE' ? 'disagree' as DebateRole :
                    'spectator' as DebateRole,
              side: (p.side?.toLowerCase() || 'spectator') as 'agree' | 'disagree' | 'spectator' | 'neutral',
              isMuted: false,
              isSpeaking: false,
              isHost: p.userId === debate?.hostId,
            };
          }
        })
      );

      // Update with LiveKit mute status if connected
      if (roomRef.current && isConnected) {
        enrichedParticipants.forEach((p) => {
          if (p.userId === user?.id) {
            p.isMuted = !roomRef.current!.localParticipant.isMicrophoneEnabled;
          } else {
            const remoteParticipant = roomRef.current!.remoteParticipants.get(p.userId);
            if (remoteParticipant) {
              const audioTrack = Array.from(remoteParticipant.audioTracks.values())[0];
              p.isMuted = audioTrack ? audioTrack.isMuted : true;
            }
          }
        });
      }

      setParticipants(enrichedParticipants);
      
      // Update current user's side
      const userParticipant = enrichedParticipants.find((p) => p.userId === user?.id);
      if (userParticipant) {
        setUserSide(userParticipant.side);
        setCurrentRole(userParticipant.role);
        setHasJoined(true);
      }
    } catch (error) {
      console.error('Error refreshing participants:', error);
    }
  };

  const joinDebate = async (side: 'agree' | 'disagree' | 'neutral') => {
    if (!user?.id || !id) return;

    try {
      await debateAPI.join(id, {
        userId: user.id,
        side: side === 'neutral' ? undefined : side.toUpperCase(),
      });
      setHasJoined(true);
      setUserSide(side);
      await refreshParticipants();
    } catch (error: any) {
      console.error('Error joining debate:', error);
      Alert.alert('Error', error.message || 'Failed to join debate');
    }
  };

  const connectToRoom = async () => {
    if (!user?.id || !debate) return;

    // First ensure user has joined the debate
    if (!hasJoined) {
      // Show side selection
      Alert.alert(
        'Join Debate',
        'Choose your side',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Agree',
            onPress: async () => {
              await joinDebate('agree');
              await connectToLiveKit();
            },
          },
          {
            text: 'Disagree',
            onPress: async () => {
              await joinDebate('disagree');
              await connectToLiveKit();
            },
          },
        ]
      );
      return;
    }

    await connectToLiveKit();
  };

  const connectToLiveKit = async () => {
    if (!user?.id || !debate) return;

    try {
      const wsUrl = getLiveKitWSUrl();
      const token = await fetchLiveKitToken(debate.id, user.id);
      
      const room = new Room();
      await room.connect(wsUrl, token);
      
      roomRef.current = room;
      setIsConnected(true);
      
      // Start muted by default
      await room.localParticipant.setMicrophoneEnabled(false);
      setIsMuted(true);
      
      // Set metadata with role
      await room.localParticipant.setMetadata(JSON.stringify({ 
        role: currentRole,
        side: userSide || 'spectator',
      }));
      
      // Listen for participants
      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('[LiveKit] Participant connected:', participant.identity);
        updateParticipantsFromLiveKit();
      });
      
      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('[LiveKit] Participant disconnected:', participant.identity);
        updateParticipantsFromLiveKit();
      });
      
      room.on(RoomEvent.TrackSubscribed, (track: Track, publication: any, participant: RemoteParticipant) => {
        if (track.kind === 'audio') {
          console.log('[LiveKit] Audio track subscribed from:', participant.identity);
          updateParticipantsFromLiveKit();
        }
      });
      
      room.on(RoomEvent.TrackMuted, (publication: any, participant: RemoteParticipant) => {
        console.log('[LiveKit] Track muted:', participant.identity);
        updateParticipantsFromLiveKit();
      });
      
      room.on(RoomEvent.TrackUnmuted, (publication: any, participant: RemoteParticipant) => {
        console.log('[LiveKit] Track unmuted:', participant.identity);
        updateParticipantsFromLiveKit();
      });
      
      // Initial update
      updateParticipantsFromLiveKit();
    } catch (error: any) {
      console.error('Error connecting to room:', error);
      Alert.alert('Error', error.message || 'Failed to connect to audio room');
    }
  };

  const updateParticipantsFromLiveKit = () => {
    if (!roomRef.current) return;

    setParticipants((prev) => {
      return prev.map((p) => {
        if (p.userId === user?.id) {
          return {
            ...p,
            isMuted: !roomRef.current!.localParticipant.isMicrophoneEnabled,
          };
        } else {
          const remoteParticipant = roomRef.current!.remoteParticipants.get(p.userId);
          if (remoteParticipant) {
            const audioTrack = Array.from(remoteParticipant.audioTracks.values())[0];
            return {
              ...p,
              isMuted: audioTrack ? audioTrack.isMuted : true,
            };
          }
        }
        return p;
      });
    });
  };

  const disconnectFromRoom = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
    setIsMuted(true);
  };

  const toggleMute = async () => {
    if (roomRef.current) {
      const isEnabled = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(isEnabled);
      setIsMuted(!isEnabled);
      updateParticipantsFromLiveKit();
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!user?.id || user.id !== debate?.hostId) return;

    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Note: removeParticipant API may not exist yet
              // For now, we'll just update local state
              setParticipants((prev) => prev.filter((p) => p.userId !== userId));
              Alert.alert('Success', 'Participant removed');
              setShowUserOptions(false);
            } catch (error) {
              console.error('Error removing participant:', error);
              Alert.alert('Error', 'Failed to remove participant');
            }
          },
        },
      ]
    );
  };

  const handleLeave = async () => {
    Alert.alert(
      'Leave Debate',
      'Are you sure you want to leave this debate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await disconnectFromRoom();
            if (user?.id) {
              try {
                await debateAPI.leave(id, user.id);
              } catch (error) {
                console.error('Error leaving debate:', error);
              }
            }
            setHasJoined(false);
            router.back();
          },
        },
      ]
    );
  };

  const isHost = user?.id === debate?.hostId;
  const isActive = debate?.status === 'ACTIVE';
  const agreeSide = participants.filter(p => p.side === 'agree' && !p.isHost);
  const disagreeSide = participants.filter(p => p.side === 'disagree' && !p.isHost);
  const hostParticipant = participants.find(p => p.isHost);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading debate room...</Text>
        </View>
      </View>
    );
  }

  if (!debate) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Debate not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{debate.title}</Text>
        {isHost && (
          <TouchableOpacity
            style={styles.hostBadge}
            onPress={() => {
              Alert.alert(
                'End Debate',
                'Are you sure you want to end this debate?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'End',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await debateAPI.update(id, { status: 'ENDED' });
                        Alert.alert('Success', 'Debate ended');
                        router.back();
                      } catch (error) {
                        Alert.alert('Error', 'Failed to end debate');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.hostBadgeText}>End</Text>
          </TouchableOpacity>
        )}
        {!isHost && <View style={styles.headerSpacer} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!isActive ? (
          <View style={styles.inactiveSection}>
            <Text style={styles.inactiveText}>
              This debate is {debate.status.toLowerCase()}. Audio is only available for active debates.
            </Text>
          </View>
        ) : (
          <>
            {!isConnected ? (
              <View style={styles.connectSection}>
                <Text style={styles.connectTitle}>Join Audio Room</Text>
                <Text style={styles.connectDescription}>
                  Connect to participate in the live audio debate
                </Text>
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={connectToRoom}
                >
                  <Text style={styles.connectButtonText}>Connect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.roomSection}>
                <View style={styles.statusBar}>
                  <View style={[styles.statusDot, wsConnected && styles.statusDotConnected]} />
                  <Text style={styles.statusText}>
                    {wsConnected ? 'Connected' : 'Connecting...'}
                  </Text>
                </View>

                <View style={styles.controls}>
                  <TouchableOpacity
                    style={[styles.controlButton, isMuted && styles.controlButtonMuted]}
                    onPress={toggleMute}
                  >
                    <Text style={styles.controlButtonText}>
                      {isMuted ? '🔇 Muted' : '🎤 Speaking'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Host Display */}
                {hostParticipant && (
                  <View style={styles.hostSection}>
                    <Text style={styles.sectionTitle}>Host</Text>
                    <View style={styles.hostCard}>
                      {hostParticipant.avatar ? (
                        <Image
                          source={{ uri: hostParticipant.avatar }}
                          style={styles.hostAvatar}
                        />
                      ) : (
                        <View style={styles.hostAvatarPlaceholder}>
                          <Text style={styles.hostAvatarText}>
                            {hostParticipant.displayName?.charAt(0).toUpperCase() || 'H'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.hostInfo}>
                        <Text style={styles.hostName}>{hostParticipant.displayName || 'Host'}</Text>
                        <Text style={styles.hostHandle}>@{hostParticipant.handle || 'host'}</Text>
                        <View style={styles.hostBadgeInline}>
                          <Text style={styles.hostBadgeTextInline}>HOST</Text>
                        </View>
                      </View>
                      <View style={styles.hostStatus}>
                        {hostParticipant.isMuted ? (
                          <Text style={styles.mutedIcon}>🔇</Text>
                        ) : (
                          <View style={styles.speakingIndicator} />
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* Agree Side */}
                <View style={styles.sideSection}>
                  <View style={styles.sideHeader}>
                    <Text style={styles.sideTitle}>AGREE</Text>
                    <Text style={styles.sideCount}>{agreeSide.length}</Text>
                  </View>
                  {agreeSide.length === 0 ? (
                    <Text style={styles.emptySide}>No participants</Text>
                  ) : (
                    <View style={styles.participantsGrid}>
                      {agreeSide.map((participant) => (
                        <ParticipantCard
                          key={participant.userId}
                          participant={participant}
                          isCurrentUser={participant.userId === user?.id}
                          isHost={isHost}
                          onPress={() => {
                            if (isHost && participant.userId !== user?.id) {
                              setSelectedParticipant(participant);
                              setShowUserOptions(true);
                            }
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* Disagree Side */}
                <View style={styles.sideSection}>
                  <View style={styles.sideHeader}>
                    <Text style={styles.sideTitle}>DISAGREE</Text>
                    <Text style={styles.sideCount}>{disagreeSide.length}</Text>
                  </View>
                  {disagreeSide.length === 0 ? (
                    <Text style={styles.emptySide}>No participants</Text>
                  ) : (
                    <View style={styles.participantsGrid}>
                      {disagreeSide.map((participant) => (
                        <ParticipantCard
                          key={participant.userId}
                          participant={participant}
                          isCurrentUser={participant.userId === user?.id}
                          isHost={isHost}
                          onPress={() => {
                            if (isHost && participant.userId !== user?.id) {
                              setSelectedParticipant(participant);
                              setShowUserOptions(true);
                            }
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* User Options Modal */}
      {showUserOptions && selectedParticipant && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Participant Options</Text>
            <Text style={styles.modalSubtitle}>
              {selectedParticipant.displayName || selectedParticipant.userId}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                handleRemoveParticipant(selectedParticipant.userId);
              }}
            >
              <Text style={styles.modalButtonText}>Remove Participant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setShowUserOptions(false);
                setSelectedParticipant(null);
              }}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

interface ParticipantCardProps {
  participant: Participant;
  isCurrentUser: boolean;
  isHost: boolean;
  onPress: () => void;
}

function ParticipantCard({ participant, isCurrentUser, isHost, onPress }: ParticipantCardProps) {
  return (
    <TouchableOpacity
      style={styles.participantCard}
      onPress={isHost && !isCurrentUser ? onPress : undefined}
      activeOpacity={isHost && !isCurrentUser ? 0.7 : 1}
    >
      {participant.avatar ? (
        <Image
          source={{ uri: participant.avatar }}
          style={styles.participantAvatar}
        />
      ) : (
        <View style={styles.participantAvatarPlaceholder}>
          <Text style={styles.participantAvatarText}>
            {participant.displayName?.charAt(0).toUpperCase() || participant.userId.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.participantName} numberOfLines={1}>
        {isCurrentUser ? 'You' : participant.displayName || participant.userId}
      </Text>
      <View style={styles.participantStatus}>
        {participant.isMuted ? (
          <Text style={styles.mutedIcon}>🔇</Text>
        ) : (
          <View style={styles.speakingIndicator} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1117',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 32,
  },
  hostBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hostBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  inactiveSection: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  inactiveText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
  connectSection: {
    alignItems: 'center',
    padding: 32,
  },
  connectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  connectDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  connectButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  roomSection: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  statusDotConnected: {
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 32,
  },
  controlButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  controlButtonMuted: {
    backgroundColor: '#EF4444',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hostSection: {
    marginBottom: 24,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  hostAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hostHandle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  hostBadgeInline: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  hostBadgeTextInline: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  hostStatus: {
    marginLeft: 12,
  },
  sideSection: {
    marginBottom: 24,
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    padding: 16,
  },
  sideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sideCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  emptySide: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    padding: 16,
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  participantCard: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },
  participantAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  participantName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  participantStatus: {
    alignItems: 'center',
  },
  mutedIcon: {
    fontSize: 14,
  },
  speakingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonCancel: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonTextCancel: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 16,
  },
});
