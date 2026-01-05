'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { hashtagAPI, userAPI } from '@v/api-client';
import { Avatar } from '@/components/ui/Avatar';

export const RightSidebar: React.FC = () => {
  const router = useRouter();
  const { toggleFollow, isFollowing, currentUser } = useStore();

  const [activeTab, setActiveTab] = useState<'1h' | '24h' | 'all'>('24h');
  const [trendingData, setTrendingData] = useState<{
    trending_1h: any[];
    trending_24h: any[];
    popular_all_time: any[];
  }>({ trending_1h: [], trending_24h: [], popular_all_time: [] });

  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [trendResp, usersResp] = await Promise.all([
          hashtagAPI.getTrending(),
          userAPI.list({ limit: 20 })
        ]);

        if (trendResp) {
          setTrendingData({
            trending_1h: trendResp.trending_1h || [],
            trending_24h: trendResp.trending_24h || [],
            popular_all_time: trendResp.popular_all_time || []
          });
        }

        const usersData = Array.isArray(usersResp) ? usersResp : [];
        if (Array.isArray(usersData)) {
          // Filter out current user and already followed users
          const filteredUsers = usersData.filter((user: any) => {
            const isMe = currentUser?.id === user.id;
            const isFollowed = isFollowing(user.id);
            return !isMe && !isFollowed;
          });
          setSuggestedUsers(filteredUsers.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to load sidebar data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser?.id]); // Re-run when user changes

  const handleFollow = async (user: any) => {
    // Update global Zustand store (which handles backend sync)
    toggleFollow(user.id);
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  if (loading) {
    return (
      <aside className="hidden xl:block w-[340px] h-full fixed right-0 top-16 overflow-y-auto py-6 px-4 space-y-6">
        <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 h-48 animate-pulse" />
        <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 h-64 animate-pulse" />
      </aside>
    );
  }

  const displayedHashtags = activeTab === '1h' ? trendingData.trending_1h
    : activeTab === '24h' ? trendingData.trending_24h
      : trendingData.popular_all_time;

  return (
    <aside className="hidden xl:block w-[340px] h-full fixed right-0 top-16 overflow-y-auto py-6 px-4 space-y-6">
      {/* Trending Topics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Trending</h2>
          <div className="flex bg-gray-800/50 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('1h')}
              className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md transition-all ${activeTab === '1h' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
            >
              1h
            </button>
            <button
              onClick={() => setActiveTab('24h')}
              className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md transition-all ${activeTab === '24h' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
            >
              24h
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md transition-all ${activeTab === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
            >
              All
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {displayedHashtags.length === 0 ? (
            <div className="text-center py-6 px-2">
              <p className="text-gray-400 text-sm font-medium mb-1">No trending topics yet</p>
              <p className="text-xs text-gray-500">Trends appear when topics spike in conversation.</p>
            </div>
          ) : (
            displayedHashtags.map((hashtag, index) => {
              return (
                <motion.div
                  key={hashtag.slug || index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => router.push(`/hashtag/${hashtag.slug}`)}
                  className="flex items-center gap-3 group hover:bg-gray-800/30 p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-cyan-400">
                        #{hashtag.name || hashtag.slug}
                      </span>
                      {(index < 3 && activeTab !== 'all') && (
                        <span className="text-orange-400 text-xs">🔥</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatCount(hashtag.boosts || 0)} boosts</span>
                      <span>{formatCount(hashtag.shouts || 0)} shouts</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Who to Follow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5"
      >
        <h2 className="text-lg font-bold text-white mb-4">Who to Follow</h2>
        <div className="space-y-3">
          {suggestedUsers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No suggestions yet</p>
          ) : (
            suggestedUsers.map((user, index) => {
              const userIsFollowing = isFollowing(user.id);
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  className="flex items-center gap-3 group hover:bg-gray-800/30 p-2 rounded-lg transition-colors"
                >
                  <Link
                    href={`/u/${user.handle}`}
                    className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/20 hover:ring-cyan-500/40 transition-all cursor-pointer"
                  >
                    <Avatar
                      user={user}
                      size="100%"
                      className="w-full h-full"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/u/${user.handle}`}
                      className="block"
                    >
                      <h3 className="font-semibold text-white text-sm truncate hover:text-cyan-400 transition-colors">
                        {user.name}
                      </h3>
                      <p className="text-gray-400 text-xs truncate">@{user.handle}</p>
                    </Link>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(user);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${userIsFollowing
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                      }`}
                  >
                    {userIsFollowing ? 'Following' : 'Follow'}
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Footer Links */}
      <div className="text-xs text-gray-500 space-y-2 px-3">
        <div className="flex flex-wrap gap-3">
          <a href="#" className="hover:text-gray-400 transition-colors">About</a>
          <a href="#" className="hover:text-gray-400 transition-colors">Help</a>
          <a href="#" className="hover:text-gray-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-gray-400 transition-colors">Privacy</a>
        </div>
        <p>© 2025 Vunite, Inc.</p>
      </div>
    </aside>
  );
};

