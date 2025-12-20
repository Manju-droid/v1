import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { debateAPI } from '@v/api-client';
import type { Debate, DebateParticipant } from '@v/shared';
import { formatRelativeTime, formatDebateDuration } from '@v/shared';
import { useAuthStore } from '../../lib/auth-store';

export default function DebateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [debate, setDebate] = useState<Debate | null>(null);
  const [participants, setParticipants] = useState<DebateParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadDebate();
  }, [id]);

  const loadDebate = async () => {
    try {
      const [debateData, participantsData] = await Promise.all([
        debateAPI.get(id),
        debateAPI.getParticipants(id),
      ]);
      setDebate(debateData);
      setParticipants(participantsData || []);
    } catch (error: any) {
      console.error('Error loading debate:', error);
      Alert.alert('Error', 'Failed to load debate');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (side: 'AGREE' | 'DISAGREE') => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to join a debate');
      router.push('/login');
      return;
    }

    setJoining(true);
    try {
      await debateAPI.join(id, {
        userId: user.id,
        side,
      });
      Alert.alert('Success', `Joined as ${side}`, [
        { text: 'OK', onPress: () => loadDebate() },
      ]);
    } catch (error: any) {
      console.error('Error joining debate:', error);
      Alert.alert('Error', error.message || 'Failed to join debate');
    } finally {
      setJoining(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#10B981';
      case 'SCHEDULED':
        return '#3B82F6';
      case 'ENDED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading debate...</Text>
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

  const startTime = typeof debate.startTime === 'string'
    ? new Date(debate.startTime)
    : debate.startTime;
  const endTime = debate.endTime
    ? (typeof debate.endTime === 'string' ? new Date(debate.endTime) : debate.endTime)
    : null;
  const isActive = debate.status === 'ACTIVE';
  const isEnded = debate.status === 'ENDED';
  const isHost = user?.id === debate.hostId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(debate.status) },
          ]}
        >
          <Text style={styles.statusText}>{debate.status}</Text>
        </View>
        {isHost && (
          <View style={styles.hostBadge}>
            <Text style={styles.hostBadgeText}>HOST</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{debate.title}</Text>

      {debate.description && (
        <Text style={styles.description}>{debate.description}</Text>
      )}

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Start Time:</Text>
          <Text style={styles.infoValue}>
            {formatRelativeTime(startTime)}
          </Text>
        </View>
        {endTime && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>End Time:</Text>
            <Text style={styles.infoValue}>
              {formatRelativeTime(endTime)}
            </Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duration:</Text>
          <Text style={styles.infoValue}>
            {formatDebateDuration(debate.durationMinutes)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type:</Text>
          <Text style={styles.infoValue}>{debate.type}</Text>
        </View>
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{debate.agreeCount || 0}</Text>
          <Text style={styles.statLabel}>Agree</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{debate.disagreeCount || 0}</Text>
          <Text style={styles.statLabel}>Disagree</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{participants.length}</Text>
          <Text style={styles.statLabel}>Participants</Text>
        </View>
      </View>

      {!isEnded && isActive && (
        <View style={styles.joinSection}>
          <Text style={styles.joinTitle}>Join the Debate</Text>
          <View style={styles.joinButtons}>
            <TouchableOpacity
              style={[styles.joinButton, styles.agreeButton]}
              onPress={() => handleJoin('AGREE')}
              disabled={joining}
            >
              <Text style={styles.joinButtonText}>
                {joining ? 'Joining...' : 'Join as Agree'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinButton, styles.disagreeButton]}
              onPress={() => handleJoin('DISAGREE')}
              disabled={joining}
            >
              <Text style={styles.joinButtonText}>
                {joining ? 'Joining...' : 'Join as Disagree'}
              </Text>
            </TouchableOpacity>
          </View>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.audioRoomButton}
              onPress={() => router.push(`/debates/${id}/room`)}
            >
              <Text style={styles.audioRoomButtonText}>
                🎤 Join Audio Room
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isEnded && (
        <View style={styles.endedSection}>
          <Text style={styles.endedText}>This debate has ended</Text>
        </View>
      )}

      {participants.length > 0 && (
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>
                  {participant.userId}
                </Text>
                <Text style={styles.participantSide}>
                  {participant.side || 'Neutral'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1117',
  },
  content: {
    padding: 16,
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
    marginBottom: 16,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  hostBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hostBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoSection: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#06B6D4',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  joinSection: {
    marginBottom: 24,
  },
  joinTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  joinButtons: {
    gap: 12,
  },
  joinButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  agreeButton: {
    backgroundColor: '#10B981',
  },
  disagreeButton: {
    backgroundColor: '#EF4444',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  endedSection: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  endedText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  participantsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  participantItem: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  participantSide: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  audioRoomButton: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  audioRoomButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
