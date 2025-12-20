import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { debateAPI } from '@v/api-client';
import { userAPI } from '@v/api-client';
import type { Debate, DebateStatus } from '@v/shared';
import { formatRelativeTime } from '@v/shared';
import { useAuthStore } from '../lib/auth-store';
import { useSignaling } from '../lib/useSignaling';

export default function DebatesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DebateStatus | 'ALL'>('ALL');
  const [registeredDebates, setRegisteredDebates] = useState<Set<string>>(new Set());
  const [debateParticipants, setDebateParticipants] = useState<Record<string, number>>({});
  const [userPoints, setUserPoints] = useState<any>(null);
  const [canHostDebate, setCanHostDebate] = useState(true);

  // WebSocket for real-time updates
  const { isConnected: wsConnected, setOnMessage } = useSignaling(
    'debates-list',
    user?.id || 'anonymous'
  );

  // Load user points to check if can host debate
  useEffect(() => {
    if (user?.id) {
      userAPI.getById(user.id)
        .then((userData) => {
          setUserPoints({
            tier: userData.tier || 'SILVER',
            subscriptionActive: userData.subscriptionActive || false,
            debatesHostedToday: userData.debatesHostedToday || 0,
          });
          const isPlatinum = userData.tier === 'PLATINUM' || userData.subscriptionActive;
          setCanHostDebate(isPlatinum || (userData.debatesHostedToday || 0) < 1);
        })
        .catch(console.error);
    }
  }, [user?.id]);

  const loadDebates = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (filter !== 'ALL') {
        params.status = filter;
      }
      
      const data = await debateAPI.list(params);
      if (data) {
        // Fetch participant counts for all debates
        const debatesWithCounts = await Promise.all(
          data.map(async (debate: Debate) => {
            try {
              const participants = await debateAPI.getParticipants(debate.id);
              return { ...debate, totalParticipants: participants.length };
            } catch (error) {
              return { ...debate, totalParticipants: 0 };
            }
          })
        );
        setDebates(debatesWithCounts);
        
        // Update participant counts
        debatesWithCounts.forEach((debate: any) => {
          setDebateParticipants(prev => ({
            ...prev,
            [debate.id]: debate.totalParticipants || 0,
          }));
        });
      }
    } catch (error: any) {
      console.error('Error fetching debates:', error);
      if (error?.status !== 401) {
        Alert.alert('Error', 'Failed to load debates');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadDebates();
  }, [loadDebates]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    setOnMessage((message: any) => {
      console.log('[Debates] Received WebSocket message:', message.type);
      
      if (message.type === 'debate:created') {
        console.log('[Debates] New debate created, refreshing...');
        loadDebates();
      } else if (message.type === 'debate:status_changed') {
        console.log('[Debates] Debate status changed, refreshing...');
        loadDebates();
      }
    });

    return () => {
      setOnMessage(() => {});
    };
  }, [setOnMessage, loadDebates]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const debatesData = await debateAPI.list({ limit: 50 });
        if (debatesData) {
          const now = new Date();
          
          // Auto-end debates that have passed their end time
          for (const debate of debatesData) {
            if (debate.endTime && new Date(debate.endTime) < now) {
              const status = debate.status?.toLowerCase();
              if (status === 'active' || status === 'live' || status === 'running') {
                try {
                  await debateAPI.update(debate.id, { status: 'ENDED' });
                  console.log(`Auto-ended debate: ${debate.title}`);
                } catch (error) {
                  console.error(`Failed to auto-end debate ${debate.id}:`, error);
                }
              }
            }
          }
          
          // Refresh debates list
          loadDebates();
        }
      } catch (error) {
        console.error('Failed to refresh debates:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDebates]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDebates();
  };

  const handleCreateDebate = () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to create a debate');
      router.push('/login');
      return;
    }
    if (!canHostDebate) {
      Alert.alert(
        'Limit Reached',
        'You have reached your daily debate hosting limit. Upgrade to Platinum for unlimited hosting.'
      );
      return;
    }
    router.push('/debates/create');
  };

  const handleDebatePress = (debate: Debate) => {
    router.push(`/debates/${debate.id}`);
  };

  const handleRegister = async (debateId: string) => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to register for debates');
      router.push('/login');
      return;
    }

    if (!registeredDebates.has(debateId)) {
      try {
        await debateAPI.join(debateId, { userId: user.id, side: 'AGREE' });
        setRegisteredDebates(prev => new Set(prev).add(debateId));

        // Fetch updated participant count
        try {
          const participants = await debateAPI.getParticipants(debateId);
          setDebateParticipants(prev => ({
            ...prev,
            [debateId]: participants.length,
          }));
        } catch (error) {
          const baseDebate = debates.find(d => d.id === debateId);
          const currentCount = debateParticipants[debateId] ?? (baseDebate as any)?.totalParticipants ?? 0;
          setDebateParticipants(prev => ({
            ...prev,
            [debateId]: currentCount + 1,
          }));
        }

        Alert.alert('Success', 'Registered for debate');
      } catch (error: any) {
        if (error.message?.includes('already participating')) {
          setRegisteredDebates(prev => new Set(prev).add(debateId));
          Alert.alert('Info', 'You are already registered for this debate');
        } else {
          console.error('Failed to register:', error);
          Alert.alert('Error', 'Failed to register');
        }
      }
    }
  };

  const handleUnregister = async (debateId: string) => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Error', 'Please sign in');
      return;
    }

    if (registeredDebates.has(debateId)) {
      try {
        await debateAPI.leave(debateId, user.id);
        setRegisteredDebates(prev => {
          const newSet = new Set(prev);
          newSet.delete(debateId);
          return newSet;
        });

        // Fetch updated participant count
        try {
          const participants = await debateAPI.getParticipants(debateId);
          setDebateParticipants(prev => ({
            ...prev,
            [debateId]: participants.length,
          }));
        } catch (error) {
          const baseDebate = debates.find(d => d.id === debateId);
          const currentCount = debateParticipants[debateId] ?? (baseDebate as any)?.totalParticipants ?? 0;
          setDebateParticipants(prev => ({
            ...prev,
            [debateId]: Math.max(0, currentCount - 1),
          }));
        }

        Alert.alert('Success', 'Unregistered from debate');
      } catch (error) {
        console.error('Failed to unregister:', error);
        Alert.alert('Error', 'Failed to unregister');
      }
    }
  };

  const handleDeleteDebate = async (debateId: string) => {
    Alert.alert(
      'Delete Debate',
      'Are you sure you want to delete this debate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await debateAPI.delete(debateId);
              Alert.alert('Success', 'Debate deleted successfully');
              loadDebates();
            } catch (error) {
              console.error('Failed to delete debate:', error);
              Alert.alert('Error', 'Failed to delete debate');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: DebateStatus) => {
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

  const renderDebateItem = ({ item }: { item: Debate }) => {
    const startTime = typeof item.startTime === 'string' 
      ? new Date(item.startTime) 
      : item.startTime;
    const endTime = item.endTime 
      ? (typeof item.endTime === 'string' ? new Date(item.endTime) : item.endTime)
      : null;
    const isRunning = item.status === 'ACTIVE';
    const isScheduled = item.status === 'SCHEDULED';
    const isHost = user?.id === item.hostId;
    const isRegistered = registeredDebates.has(item.id);
    const participantCount = debateParticipants[item.id] ?? (item as any).totalParticipants ?? 0;

    return (
      <TouchableOpacity
        style={styles.debateCard}
        onPress={() => handleDebatePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.debateHeader}>
          <Text style={styles.debateTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.debateDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.debateMeta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Start:</Text>
            <Text style={styles.metaValue}>
              {formatRelativeTime(startTime)}
            </Text>
          </View>
          {endTime && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>End:</Text>
              <Text style={styles.metaValue}>
                {formatRelativeTime(endTime)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.debateStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.agreeCount || 0}</Text>
            <Text style={styles.statLabel}>Agree</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.disagreeCount || 0}</Text>
            <Text style={styles.statLabel}>Disagree</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{participantCount}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isScheduled && !isHost && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                isRegistered ? styles.unregisterButton : styles.registerButton,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                if (isRegistered) {
                  handleUnregister(item.id);
                } else {
                  handleRegister(item.id);
                }
              }}
            >
              <Text style={styles.actionButtonText}>
                {isRegistered ? 'Unregister' : 'Register'}
              </Text>
            </TouchableOpacity>
          )}
          {isHost && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteDebate(item.id);
              }}
            >
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Filter debates
  const runningDebates = debates.filter(debate =>
    debate.status?.toLowerCase() === 'live' || 
    debate.status?.toLowerCase() === 'active' || 
    debate.status?.toLowerCase() === 'running'
  );

  const upcomingDebates = debates.filter(debate =>
    debate.status?.toLowerCase() === 'upcoming' || 
    debate.status?.toLowerCase() === 'scheduled'
  );

  if (loading && debates.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading debates...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Debates</Text>
        <TouchableOpacity
          style={[styles.createButton, !canHostDebate && styles.createButtonDisabled]}
          onPress={handleCreateDebate}
          disabled={!canHostDebate}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {!canHostDebate && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitText}>
            Daily limit reached. Upgrade to Platinum for unlimited hosting.
          </Text>
        </View>
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'ALL' && styles.filterButtonActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'ACTIVE' && styles.filterButtonActive]}
          onPress={() => setFilter('ACTIVE')}
        >
          <Text style={[styles.filterText, filter === 'ACTIVE' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'SCHEDULED' && styles.filterButtonActive]}
          onPress={() => setFilter('SCHEDULED')}
        >
          <Text style={[styles.filterText, filter === 'SCHEDULED' && styles.filterTextActive]}>
            Scheduled
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'ENDED' && styles.filterButtonActive]}
          onPress={() => setFilter('ENDED')}
        >
          <Text style={[styles.filterText, filter === 'ENDED' && styles.filterTextActive]}>
            Ended
          </Text>
        </TouchableOpacity>
      </View>

      {filter === 'ALL' && (runningDebates.length > 0 || upcomingDebates.length > 0) ? (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#06B6D4"
            />
          }
        >
          {runningDebates.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Running Debates</Text>
              {runningDebates.map((debate) => (
                <View key={debate.id}>
                  {renderDebateItem({ item: debate })}
                </View>
              ))}
            </View>
          )}

          {upcomingDebates.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming Debates</Text>
              {upcomingDebates.map((debate) => (
                <View key={debate.id}>
                  {renderDebateItem({ item: debate })}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : debates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No debates found</Text>
          <Text style={styles.emptySubtext}>
            {filter !== 'ALL' 
              ? `No ${filter.toLowerCase()} debates`
              : 'Create the first debate!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={debates}
          renderItem={renderDebateItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#06B6D4"
            />
          }
        />
      )}

      {/* Stats Link */}
      <TouchableOpacity
        style={styles.statsButton}
        onPress={() => router.push('/debates/stats')}
      >
        <Text style={styles.statsButtonText}>View Topic Statistics</Text>
      </TouchableOpacity>
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#1F2937',
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  limitBanner: {
    backgroundColor: '#F59E0B',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  limitText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1F2937',
  },
  filterButtonActive: {
    backgroundColor: '#06B6D4',
  },
  filterText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  debateCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  debateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  debateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  debateDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  debateMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  metaValue: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  debateStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#06B6D4',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButton: {
    backgroundColor: '#06B6D4',
  },
  unregisterButton: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  statsButton: {
    backgroundColor: '#1F2937',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statsButtonText: {
    color: '#06B6D4',
    fontWeight: '600',
    fontSize: 14,
  },
});
