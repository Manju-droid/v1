'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useStore, currentUserMock } from '@/lib/store';
import { formatCount } from '@/lib/mock';
import { getFollowers } from '../stores/profileAPI';

interface Follower {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  isFollowing: boolean;
}

interface FollowersModalProps {
  userId: string; // This is now a handle
  onClose: () => void;
}

export function FollowersModal({ userId, onClose }: FollowersModalProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const { toggleFollow, isFollowing: checkIsFollowing } = useStore();

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  const fetchFollowers = async (nextCursor?: string | null) => {
    try {
      const data = await getFollowers(userId, nextCursor || undefined);

      if (data.users) {
        const convertedFollowers: Follower[] = data.users.map(user => ({
          id: user.id,
          name: user.name,
          handle: user.handle,
          avatar: user.avatarUrl,
          bio: '',
          isFollowing: checkIsFollowing(user.id),
        }));

        setFollowers(prev => nextCursor ? [...prev, ...convertedFollowers] : convertedFollowers);
        setCursor(data.nextCursor || null);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
      setLoading(false);
    }
  };

  const handleFollow = (followerId: string) => {
    toggleFollow(followerId);
    setFollowers(prev =>
      prev.map(f =>
        f.id === followerId ? { ...f, isFollowing: !f.isFollowing } : f
      )
    );
  };

  const filteredFollowers = followers.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-gray-900 border border-white/[0.06] rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Followers</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search followers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-white/[0.06] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : filteredFollowers.length > 0 ? (
              <>
                {filteredFollowers.map((follower) => (
                  <div
                    key={follower.id}
                    className="p-4 border-b border-white/[0.06] hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/20">
                          {follower.avatar ? (
                            <Image
                              src={follower.avatar}
                              alt={follower.name}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-white font-semibold">
                              {follower.name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate">{follower.name}</h3>
                          <p className="text-gray-400 text-sm truncate">@{follower.handle}</p>
                          {follower.bio && (
                            <p className="text-gray-500 text-xs truncate mt-1">{follower.bio}</p>
                          )}
                        </div>
                      </div>
                      {currentUserMock && follower.id !== currentUserMock.id && (
                        <button
                          onClick={() => currentUserMock && handleFollow(follower.id)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${checkIsFollowing(follower.id)
                              ? 'bg-gray-800 hover:bg-gray-700 text-white'
                              : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                            }`}
                        >
                          {checkIsFollowing(follower.id) ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {cursor && (
                  <div className="p-4 text-center">
                    <button
                      onClick={() => fetchFollowers(cursor)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-gray-400">
                {searchQuery ? 'No followers found' : 'No followers yet'}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

