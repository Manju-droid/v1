'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { PostCard } from '@/features/posts';
import type { Post } from '@/lib/store';
import { userAPI, debateAPI, postAPI } from '@v/api-client';

interface UserResult {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
}

interface DebateResult {
  id: string;
  title: string;
  description: string;
  category: string;
  participantCount: number;
}

type Tab = 'all' | 'posts' | 'users' | 'debates';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [debates, setDebates] = useState<DebateResult[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggleFollow, isFollowing, currentUser } = useStore(); // Get currentUser to exclude from search

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users
      const usersData = await userAPI.list({ limit: 100 }); // Increased limit to get more users
      if (usersData && Array.isArray(usersData)) {
        // Get current user to exclude from results
        const currentUserId = currentUser?.id;
        const currentUserHandle = currentUser?.handle;

        const mappedUsers = usersData
          .filter((user: any) => {
            // Exclude current user
            return user.id !== currentUserId && user.handle !== currentUserHandle;
          })
          .map((user: any) => ({
            id: user.id,
            name: user.name || user.displayName || 'Unknown',
            handle: user.handle || '',
            avatarUrl: user.avatarUrl || user.avatar || '',
            bio: user.bio || '',
          }));

        setUsers(mappedUsers);
        console.log(`[Search] Loaded ${mappedUsers.length} users (excluded current user)`);
      } else {
        console.warn('[Search] No users data received or invalid format:', usersData);
        setUsers([]);
      }

      // Load debates
      const debatesData = await debateAPI.list({ limit: 50 });
      if (debatesData) {
        setDebates(debatesData.map((debate: any) => ({
          id: debate.id,
          title: debate.title,
          description: debate.description || '',
          category: debate.category,
          participantCount: debate.participants?.length || 0,
        })));
      }

      // Load posts
      const postsData = await postAPI.list({ limit: 50 });
      if (postsData) {
        setPosts(postsData as unknown as Post[]);
      }

    } catch (error) {
      console.error('Failed to load search data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id || null]); // Reload when current user changes to exclude them from results

  // Refresh data periodically to pick up new users/posts/debates
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Search filtering
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts; // Show all if no query, or empty? Original showed nothing if no query.
    // Original code: if (!searchQuery) return [];
    // But maybe better to show something? Let's stick to original behavior for now.
    if (!searchQuery) return [];

    const lowerQuery = searchQuery.toLowerCase();
    return posts.filter(post => {
      // Check if post has content
      const contentMatch = post.content?.toLowerCase().includes(lowerQuery) || false;

      // Check if post has author and author fields
      const authorMatch = post.author?.displayName?.toLowerCase().includes(lowerQuery) ||
        post.author?.handle?.toLowerCase().includes(lowerQuery) || false;

      return contentMatch || authorMatch;
    });
  }, [posts, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(user => {
      // Exclude current user from search results
      if (currentUser && (user.id === currentUser.id || user.handle === currentUser.handle)) {
        return false;
      }

      // Filter by search query
      return user.name.toLowerCase().includes(lowerQuery) ||
        user.handle.toLowerCase().includes(lowerQuery) ||
        (user.bio && user.bio.toLowerCase().includes(lowerQuery));
    });
  }, [users, searchQuery, currentUser]);

  const filteredDebates = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return debates.filter(debate =>
      debate.title.toLowerCase().includes(lowerQuery) ||
      debate.description.toLowerCase().includes(lowerQuery) ||
      debate.category.toLowerCase().includes(lowerQuery)
    );
  }, [debates, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: filteredPosts.length + filteredUsers.length + filteredDebates.length },
    { id: 'posts', label: 'Posts', count: filteredPosts.length },
    { id: 'users', label: 'Users', count: filteredUsers.length },
    { id: 'debates', label: 'Debates', count: filteredDebates.length },
  ];

  const showPosts = activeTab === 'all' || activeTab === 'posts';
  const showUsers = activeTab === 'all' || activeTab === 'users';
  const showDebates = activeTab === 'all' || activeTab === 'debates';

  const hasResults = filteredPosts.length > 0 || filteredUsers.length > 0 || filteredDebates.length > 0;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="fixed top-0 left-0 lg:left-[72px] right-0 z-30 bg-gray-900/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-4 px-4 lg:px-6 py-3">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for posts, users, debates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-gray-800/50 border border-white/[0.06] rounded-lg px-4 py-2 pl-10 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </form>
        </div>

        {/* Tabs */}
        {searchQuery && (
          <div className="flex items-center gap-6 px-4 lg:px-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 px-1 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 text-xs text-gray-500">({tab.count})</span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="pt-[120px] lg:ml-[72px] pb-20">
        <div className="max-w-2xl mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          ) : !searchQuery ? (
            // Empty state - no search query
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Search V</h2>
              <p className="text-gray-400">Find posts, users, and debates</p>
            </div>
          ) : !hasResults ? (
            // Empty state - no results
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No results found</h2>
              <p className="text-gray-400">Try searching for something else</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Users Section */}
              {showUsers && filteredUsers.length > 0 && (
                <section>
                  {activeTab === 'all' && (
                    <h2 className="text-lg font-bold text-white mb-4">Users</h2>
                  )}
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-gray-900/50 border border-white/[0.06] rounded-xl hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/u/${user.handle}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/20">
                              <Image
                                src={user.avatarUrl}
                                alt={user.name}
                                width={48}
                                height={48}
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold truncate">{user.name}</h3>
                              <p className="text-gray-400 text-sm truncate">@{user.handle}</p>
                              {user.bio && (
                                <p className="text-gray-500 text-sm truncate mt-1">{user.bio}</p>
                              )}
                            </div>
                          </div>
                          {user.id !== 'demo-user' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFollow(user.id);
                              }}
                              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${isFollowing(user.id)
                                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                                : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                }`}
                            >
                              {isFollowing(user.id) ? 'Following' : 'Follow'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Debates Section */}
              {showDebates && filteredDebates.length > 0 && (
                <section>
                  {activeTab === 'all' && (
                    <h2 className="text-lg font-bold text-white mb-4">Debates</h2>
                  )}
                  <div className="space-y-2">
                    {filteredDebates.map((debate) => (
                      <motion.div
                        key={debate.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-gray-900/50 border border-white/[0.06] rounded-xl hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/debates/${debate.id}`)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium">
                                {debate.category}
                              </span>
                            </div>
                            <h3 className="text-white font-semibold mb-1">{debate.title}</h3>
                            {debate.description && (
                              <p className="text-gray-400 text-sm line-clamp-2">{debate.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                {debate.participantCount}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/debates/${debate.id}`);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm font-semibold transition-colors flex-shrink-0"
                          >
                            Join
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Posts Section */}
              {showPosts && filteredPosts.length > 0 && (
                <section>
                  {activeTab === 'all' && (
                    <h2 className="text-lg font-bold text-white mb-4">Posts</h2>
                  )}
                  <div className="space-y-4">
                    {filteredPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

