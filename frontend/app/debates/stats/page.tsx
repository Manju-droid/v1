'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { debateStatsAPI } from '@v/api-client';
import type { DebateTopicStats } from '@v/shared';
import { LeftNav } from '@/components/feed/LeftNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { useStore } from '@/lib/store';
import { useAuth } from '@/features/auth';

export default function DebateStatsPage() {
  const { currentUser } = useStore();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DebateTopicStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'lastUpdated' | 'totalParticipants'>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await debateStatsAPI.list();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load debate stats:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSortBy: 'lastUpdated' | 'totalParticipants') => {
    if (sortBy === newSortBy) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc'); // Default to descending
    }
  };

  // Sort stats when sortBy or sortOrder changes
  const sortedStats = [...stats].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'lastUpdated') {
      comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
    } else {
      comparison = a.totalParticipants - b.totalParticipants;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const formatPercentage = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#0C1117] text-gray-100">
      {/* Main Layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Left Navigation */}
        <LeftNav />

        {/* Center Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <FeedHeader />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Debate Topic Statistics</h1>
                    <p className="text-gray-400">
                      Aggregated sentiment stats across all debates by topic
                    </p>
                  </div>
                  <Link
                    href="/debates"
                    className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 border border-gray-700 hover:border-gray-600"
                  >
                    ← Back to Debates
                  </Link>
                </div>
              </motion.div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                  <p className="mt-4 text-gray-400">Loading stats...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-red-400">{error}</p>
                  <button
                    onClick={loadStats}
                    className="mt-2 px-4 py-2 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Stats Table */}
              {!loading && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden"
                >
                  {stats.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-gray-400 text-lg mb-2">No debate stats yet</p>
                      <p className="text-gray-500 text-sm">
                        Stats will appear here after debates end
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-800/50 border-b border-gray-700">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                              Topic
                            </th>
                            <th
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                              onClick={() => handleSortChange('totalParticipants')}
                            >
                              <div className="flex items-center gap-2">
                                Sessions
                                {sortBy === 'totalParticipants' && (
                                  <span className="text-teal-400">
                                    {sortOrder === 'desc' ? '↓' : '↑'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                              Total Participants
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                              Agree
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                              Disagree
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                              Agree %
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                              Disagree %
                            </th>
                            <th
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                              onClick={() => handleSortChange('lastUpdated')}
                            >
                              <div className="flex items-center gap-2">
                                Last Updated
                                {sortBy === 'lastUpdated' && (
                                  <span className="text-teal-400">
                                    {sortOrder === 'desc' ? '↓' : '↑'}
                                  </span>
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {sortedStats.map((stat, index) => (
                            <motion.tr
                              key={stat.topic}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">
                                  {stat.topic}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">
                                  {stat.sessionsCount}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">
                                  {stat.totalParticipants}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-teal-400 font-medium">
                                  {stat.totalAgree}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-purple-400 font-medium">
                                  {stat.totalDisagree}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-teal-400">
                                  {formatPercentage(stat.totalAgree, stat.totalParticipants)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-purple-400">
                                  {formatPercentage(stat.totalDisagree, stat.totalParticipants)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-400">
                                  {formatDate(typeof stat.lastUpdated === 'string' ? stat.lastUpdated : stat.lastUpdated.toISOString())}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Summary Stats */}
              {!loading && !error && stats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Total Topics</div>
                    <div className="text-2xl font-bold text-white">{stats.length}</div>
                  </div>
                  <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Total Sessions</div>
                    <div className="text-2xl font-bold text-white">
                      {stats.reduce((sum, s) => sum + s.sessionsCount, 0)}
                    </div>
                  </div>
                  <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Total Participants</div>
                    <div className="text-2xl font-bold text-white">
                      {stats.reduce((sum, s) => sum + s.totalParticipants, 0)}
                    </div>
                  </div>
                  <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Total Agree</div>
                    <div className="text-2xl font-bold text-teal-400">
                      {stats.reduce((sum, s) => sum + s.totalAgree, 0)}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

