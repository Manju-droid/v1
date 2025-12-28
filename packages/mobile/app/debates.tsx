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
import { LockExplainerModal } from '../components/LockExplainerModal';
import { Ionicons } from '@expo/vector-icons';

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
  const [showLockModal, setShowLockModal] = useState(false);

  // WebSocket for real-time updates
  const { isConnected: wsConnected, setOnMessage } = useSignaling(
    'debates-list',
    user?.id || 'anonymous'
  );

  // ... (Load user points logic remains same)

  // ... (loadDebates logic remains same)

  // ... (useEffect logic remains same)

  // ... (WebSocket listener logic remains same)

  // ... (Auto-refresh logic remains same)

  const onRefresh = () => {
    setRefreshing(true);
    loadDebates();
  };

  const handleCreateDebate = () => {
    // Soft-lock Phase 1: Prevent creation
    setShowLockModal(true);
    return;

    /* Original logic commented out for Phase 1
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
    */
  };

  const handleDebatePress = (debate: Debate) => {
    // Soft-lock Phase 1: Check if locked
    // Check both backend isLocked flag AND default to locked if strictly not false (for safety)
    const isLocked = (debate as any).isLocked !== false;

    if (isLocked) {
      setShowLockModal(true);
      return;
    }
    router.push(`/debates/${debate.id}`);
  };

  // ... (handleRegister, handleUnregister, handleDeleteDebate remains same)

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

    // Check lock status
    const isLocked = (item as any).isLocked !== false;

    return (
      <TouchableOpacity
        style={[styles.debateCard, isLocked && styles.debateCardLocked]}
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
              { backgroundColor: isLocked ? '#22D3EE' : getStatusColor(item.status) },
            ]}
          >
            <Text style={[styles.statusText, isLocked && { color: '#000' }]}>
              {isLocked ? 'COMING SOON' : item.status}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.debateDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {isLocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={20} color="#6B7280" style={{ marginRight: 6 }} />
            <Text style={{ color: '#6B7280', fontSize: 12, fontStyle: 'italic' }}>
              Locked for Phase 1
            </Text>
          </View>
        )}

        <View style={[styles.debateMeta, isLocked && { opacity: 0.5 }]}>
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

        {!isLocked && (
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
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isLocked ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(34, 211, 238, 0.1)', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)' }]}
              onPress={() => setShowLockModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed-outline" size={16} color="#22D3EE" style={{ marginRight: 6 }} />
                <Text style={[styles.actionButtonText, { color: '#22D3EE' }]}>
                  Unlock Preview
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <>
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
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ... (Filter logic remains same)

  // ... (Loading state remains same)

  return (
    <View style={styles.container}>
      <LockExplainerModal
        visible={showLockModal}
        onClose={() => setShowLockModal(false)}
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Debates</Text>
        <TouchableOpacity
          style={[styles.createButton, !canHostDebate && styles.createButtonDisabled]}
          onPress={handleCreateDebate}
        // disabled={!canHostDebate} // Enabled so we can capture click for soft-lock
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
  debateCardLocked: {
    borderColor: 'rgba(34, 211, 238, 0.2)',
    backgroundColor: '#131B26', // Slightly darker, premium
  },
  lockOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -4,
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
