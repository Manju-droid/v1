'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { debateAPI } from '@v/api-client';

export const QuickStats: React.FC = () => {
  const [stats, setStats] = useState({
    activeDebates: 0,
    totalParticipants: 0,
    newToday: 0,
  });
  const [trendingDebates, setTrendingDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
      try {
        const debates = await debateAPI.list({ limit: 50 });

        if (Array.isArray(debates)) {
        const now = new Date();
        
        // Check for active debates (case-insensitive) AND not past end time
        const runningDebates = debates.filter((d: any) => {
          const status = d.status?.toLowerCase();
          const isActiveStatus = status === 'live' || status === 'active' || status === 'running';
          
          // Also check if end time has passed
          const endTime = d.endTime ? new Date(d.endTime) : null;
          const hasEnded = endTime && endTime < now;
          
          // Only count as running if status is active AND time hasn't ended
          return isActiveStatus && !hasEnded;
        });

        console.log('[QuickStats] Debates:', debates.map((d: any) => ({ 
          id: d.id, 
          title: d.title, 
          status: d.status, 
          endTime: d.endTime 
        })));
        console.log('[QuickStats] Running debates:', runningDebates.length);

          setStats({
            activeDebates: runningDebates.length,
            totalParticipants: runningDebates.reduce((sum: number, d: any) => sum + (d.participants?.length || 0), 0),
            newToday: debates.filter((d: any) =>
              new Date(d.createdAt).toDateString() === new Date().toDateString()
            ).length,
          });

          // Sort by participant count for trending
          const trending = [...runningDebates]
            .sort((a: any, b: any) => (b.participants?.length || 0) - (a.participants?.length || 0))
            .slice(0, 5);

          setTrendingDebates(trending);
        }
      } catch (error) {
        console.error('Failed to load quick stats:', error);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadData();

    // Refresh every 10 seconds for more responsive updates
    const interval = setInterval(loadData, 10000);
    
    // Also refresh when window regains focus (user comes back to tab)
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    
    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
    loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-5 h-40 animate-pulse" />
        <div className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-5 h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-5"
      >
        <h3 className="text-base font-semibold text-gray-100 mb-4">Quick Stats</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Active Debates</span>
            <span className="text-lg font-bold text-cyan-400">{stats.activeDebates}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Total Participants</span>
            <span className="text-lg font-bold text-cyan-400">
              {stats.totalParticipants.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">New Today</span>
            <span className="text-lg font-bold text-cyan-400">{stats.newToday}</span>
          </div>
        </div>
      </motion.div>

      {/* Trending Debates */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-5"
      >
        <h3 className="text-base font-semibold text-gray-100 mb-4">Trending Debates</h3>

        <div className="space-y-2">
          {trendingDebates.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-2">No trending debates</p>
          ) : (
            trendingDebates.map((debate, index) => (
              <motion.div
                key={debate.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
                className="group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-0.5">{debate.category}</div>
                    <h4 className="text-sm text-gray-300 font-medium truncate group-hover:text-cyan-400 transition-colors">
                      {debate.title}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-cyan-400 font-semibold text-sm">{debate.participants?.length || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

