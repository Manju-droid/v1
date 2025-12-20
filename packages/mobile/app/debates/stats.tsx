import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { debateStatsAPI } from '@v/api-client';
import type { DebateTopicStats } from '@v/shared';

export default function DebateStatsScreen() {
  const [stats, setStats] = useState<DebateTopicStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'lastUpdated' | 'totalParticipants'>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await debateStatsAPI.list();
      setStats(data || []);
    } catch (err: any) {
      console.error('Failed to load debate stats:', err);
      Alert.alert('Error', err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSortBy: 'lastUpdated' | 'totalParticipants') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'lastUpdated') {
      const timeA = typeof a.lastUpdated === 'string' ? new Date(a.lastUpdated).getTime() : a.lastUpdated.getTime();
      const timeB = typeof b.lastUpdated === 'string' ? new Date(b.lastUpdated).getTime() : b.lastUpdated.getTime();
      comparison = timeA - timeB;
    } else {
      comparison = a.totalParticipants - b.totalParticipants;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const formatPercentage = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const renderStatItem = ({ item }: { item: DebateTopicStats }) => {
    const totalVotes = item.totalAgree + item.totalDisagree;
    const agreePercent = formatPercentage(item.totalAgree, totalVotes);
    const disagreePercent = formatPercentage(item.totalDisagree, totalVotes);

    return (
      <View style={styles.statCard}>
        <Text style={styles.topicTitle}>{item.topic}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.sessionsCount}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.totalParticipants}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
        </View>

        <View style={styles.votesSection}>
          <View style={styles.voteRow}>
            <View style={styles.voteBarContainer}>
              <View style={[styles.voteBar, styles.agreeBar, { width: `${(item.totalAgree / totalVotes) * 100}%` }]} />
              <Text style={styles.voteLabel}>Agree: {item.totalAgree} ({agreePercent})</Text>
            </View>
          </View>
          <View style={styles.voteRow}>
            <View style={styles.voteBarContainer}>
              <View style={[styles.voteBar, styles.disagreeBar, { width: `${(item.totalDisagree / totalVotes) * 100}%` }]} />
              <Text style={styles.voteLabel}>Disagree: {item.totalDisagree} ({disagreePercent})</Text>
            </View>
          </View>
        </View>

        <Text style={styles.lastUpdated}>
          Last updated: {typeof item.lastUpdated === 'string' 
            ? new Date(item.lastUpdated).toLocaleDateString()
            : item.lastUpdated.toLocaleDateString()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading stats...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Debate Statistics</Text>
      </View>

      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'lastUpdated' && styles.sortButtonActive]}
          onPress={() => handleSortChange('lastUpdated')}
        >
          <Text style={[styles.sortText, sortBy === 'lastUpdated' && styles.sortTextActive]}>
            Last Updated {sortBy === 'lastUpdated' && (sortOrder === 'desc' ? '↓' : '↑')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'totalParticipants' && styles.sortButtonActive]}
          onPress={() => handleSortChange('totalParticipants')}
        >
          <Text style={[styles.sortText, sortBy === 'totalParticipants' && styles.sortTextActive]}>
            Participants {sortBy === 'totalParticipants' && (sortOrder === 'desc' ? '↓' : '↑')}
          </Text>
        </TouchableOpacity>
      </View>

      {sortedStats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No statistics available</Text>
        </View>
      ) : (
        <FlatList
          data={sortedStats}
          renderItem={renderStatItem}
          keyExtractor={(item) => item.topic}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  sortButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#06B6D4',
  },
  sortText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  sortTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  statCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
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
  votesSection: {
    marginBottom: 12,
  },
  voteRow: {
    marginBottom: 8,
  },
  voteBarContainer: {
    height: 24,
    backgroundColor: '#374151',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  voteBar: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  agreeBar: {
    backgroundColor: '#10B981',
  },
  disagreeBar: {
    backgroundColor: '#EF4444',
  },
  voteLabel: {
    position: 'absolute',
    left: 8,
    top: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    zIndex: 1,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
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
  },
});
