'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { useToast } from '@/components/ui/Toast';
import { useStore } from '@/lib/store';
import { hashtagAPI } from '@v/api-client';
import { useSignaling } from '@/features/debates';

interface LocalHashtag {
  slug: string;
  name: string;
  posts: number;
  boosts: number;
  shouts: number;
  momentum: number; // boosts - shouts
  isTrending?: boolean;
  category?: string; // New field
  createdBy?: string; // userId of the creator
}

type SortField = 'name' | 'posts' | 'boosts' | 'shouts' | 'trending';
type SortDirection = 'asc' | 'desc';



export default function LocalHashtagHubPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const currentUser = useStore(state => state.currentUser);
  const syncCurrentUser = useStore(state => state.syncCurrentUser);
  const [hashtags, setHashtags] = useState<LocalHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('trending');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLocalHashtagName, setNewLocalHashtagName] = useState('');
  const [newLocalHashtagCategory, setNewLocalHashtagCategory] = useState('General');
  const [openMenuSlug, setOpenMenuSlug] = useState<string | null>(null);

  // WebSocket connection for real-time hashtag updates
  const { isConnected: wsConnected, setOnMessage } = useSignaling(
    'hashtags-list', // Special room for hashtags list updates
    currentUser?.id || 'anonymous'
  );

  // Fetch hashtags from API
  const loadHashtags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await hashtagAPI.list();
      console.log('[Hashtags Page] Loaded hashtags:', data);

      if (data && Array.isArray(data) && data.length > 0) {
        const formattedHashtags: LocalHashtag[] = data.map((item: any) => {
          // Backend nests hashtag: { hashtag: {...}, boosts, shouts, momentum }
          const h = item.hashtag || item;

          // Fallback: if name is missing, derive it from slug
          const name = h.name || h.slug?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown';

          return {
            slug: h.slug,
            name: name,
            posts: h.posts || item.posts || 0,
            boosts: item.boosts !== undefined ? item.boosts : (h.boosts || 0),
            shouts: item.shouts !== undefined ? item.shouts : (h.shouts || 0),
            momentum: item.momentum !== undefined ? item.momentum : ((item.boosts || 0) - (item.shouts || 0)),
            itemCategory: h.category || 'General', // Store as temp to avoid conflict with interface if needed, or just category
            category: h.category || 'General',
            isTrending: (h.posts || item.posts || 0) > 100,
            createdBy: h.createdBy,
          };
        });
        console.log('[Hashtags Page] Formatted hashtags:', formattedHashtags);
        setHashtags(formattedHashtags);
      } else {
        console.log('[Hashtags Page] No hashtags found or empty array');
        setHashtags([]);
      }
    } catch (error) {
      console.error('Failed to load hashtags:', error);
      addToast('Failed to load hashtags', 'error');
      setHashtags([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    loadHashtags();
  }, [loadHashtags]);

  // Sync current user on mount
  useEffect(() => {
    syncCurrentUser();
  }, [syncCurrentUser]);

  // Listen for real-time hashtag creation/updates via WebSocket
  useEffect(() => {
    const userId = currentUser?.id || 'anonymous';
    console.log('[Hashtags Page] Setting up WebSocket listener', {
      wsConnected,
      userId,
      roomId: 'hashtags-list',
    });

    setOnMessage((message: any) => {
      console.log('[Hashtags Page] Received WebSocket message:', message.type, message);

      if (message.type === 'hashtag:created') {
        console.log('[Hashtags Page] New hashtag created, refreshing list...', message.hashtag);
        // Refresh the hashtags list to include the new hashtag
        loadHashtags();
      }
    });

    return () => {
      console.log('[Hashtags Page] Cleaning up WebSocket listener');
      setOnMessage(() => { }); // Clear handler on unmount
    };
  }, [setOnMessage, loadHashtags, currentUser?.id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (openMenuSlug && !(target instanceof Element && target.closest('.hashtag-menu'))) {
        setOpenMenuSlug(null);
      }
    };

    if (openMenuSlug) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuSlug]);

  // Filter and sort hashtags
  const filteredAndSortedLocalHashtags = useMemo(() => {
    let filtered = hashtags;

    // Filter by search query
    if (searchQuery) {
      filtered = hashtags.filter(h =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'posts':
          aValue = a.posts;
          bValue = b.posts;
          break;
        case 'boosts':
          aValue = a.boosts;
          bValue = b.boosts;
          break;
        case 'shouts':
          aValue = a.shouts;
          bValue = b.shouts;
          break;
        case 'trending':
        default:
          aValue = a.momentum;
          bValue = b.momentum;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return sorted;
  }, [hashtags, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (slug: string) => {
    router.push(`/hashtag/${slug}`);
  };

  const handleCreateLocalHashtag = async () => {
    if (!newLocalHashtagName.trim()) {
      addToast('Please enter a hashtag name', 'error');
      return;
    }

    // Strip # symbol if user somehow entered it
    const cleanName = newLocalHashtagName.trim().replace(/#/g, '');
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Validate slug is not empty
    if (!slug) {
      addToast('Please enter a valid hashtag name', 'error');
      return;
    }

    try {
      if (!currentUser?.id) {
        addToast('You must be logged in to create a hashtag', 'error');
        return;
      }

      console.log('[Hashtag Create] Creating hashtag:', { name: cleanName, slug, category: newLocalHashtagCategory, createdBy: currentUser.id });

      const newHashtag = await hashtagAPI.create({
        name: cleanName,
        slug: slug,
        category: newLocalHashtagCategory,
        createdBy: currentUser.id,
      });

      console.log('[Hashtag Create] API response:', newHashtag);

      if (newHashtag && newHashtag.slug) {
        const formattedHashtag: LocalHashtag = {
          slug: newHashtag.slug,
          name: newHashtag.name || cleanName, // Fallback to cleanName if backend doesn't return name
          category: newHashtag.category || newLocalHashtagCategory,
          posts: 0,
          boosts: 0,
          shouts: 0,
          momentum: 0,
          createdBy: newHashtag.createdBy || currentUser.id,
        };

        console.log('[Hashtag Create] Formatted hashtag:', formattedHashtag);

        setHashtags([formattedHashtag, ...hashtags]);
        setShowCreateModal(false);
        setNewLocalHashtagName('');
        setNewLocalHashtagCategory('General');
        addToast('Hashtag created successfully!', 'success');
      } else {
        console.warn('[Hashtag Create] Invalid response:', newHashtag);
        addToast('Failed to create hashtag: Invalid response from server', 'error');
      }
    } catch (error: any) {
      console.error('Failed to create hashtag:', error);
      const errorMessage = error?.message || error?.error || 'Failed to create hashtag';
      addToast(errorMessage, 'error');
    }
  };

  const handleDeleteLocalHashtag = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    const hashtag = hashtags.find(h => h.slug === slug);
    if (hashtag && currentUser && hashtag.createdBy === currentUser.id) {
      try {
        await hashtagAPI.delete(slug);
        setHashtags(hashtags.filter(h => h.slug !== slug));
        addToast('Hashtag deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete hashtag:', error);
        addToast('Failed to delete hashtag', 'error');
      }
    } else {
      addToast('You can only delete hashtags you created', 'error');
    }
  };



  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#0C1117] text-gray-100">
      <div className="flex h-screen overflow-hidden">
        <LeftNav />
        <div className="flex-1 flex flex-col overflow-hidden">
          <FeedHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search hashtags..."
          />
          <div className="flex-1 flex flex-col overflow-hidden pt-16">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex flex-col flex-1 min-h-0">
              {/* Header - Fixed */}
              <div className="flex items-center justify-between mb-8 pt-8 flex-shrink-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">LocalHashtag Hub</h1>
              </div>

              {/* Trending Section - Fixed */}
              <div className="mb-6 flex items-center gap-4 flex-wrap flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-100">Trending</h2>
                <button
                  onClick={() => router.push('/trending')}
                  className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-medium"
                >
                  See What's Trending
                </button>
              </div>

              {/* All LocalHashtags Section - Fixed */}
              <div className="mb-6 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-100">All LocalHashtags</h2>
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-medium transition-all text-sm"
                >
                  + Create New LocalHashtag
                </motion.button>
              </div>

              {/* Search Results Counter */}
              {searchQuery && (
                <div className="mb-4 flex items-center justify-between bg-gray-800/30 border border-white/[0.06] rounded-lg px-4 py-2 flex-shrink-0">
                  <span className="text-sm text-gray-300">
                    Found <span className="font-semibold text-white">{filteredAndSortedLocalHashtags.length}</span> hashtag{filteredAndSortedLocalHashtags.length !== 1 ? 's' : ''} matching <span className="text-cyan-400">"{searchQuery}"</span>
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                </div>
              )}

              {/* Scrollable Table/Cards Container */}
              <div className="flex-1 overflow-y-auto min-h-0 pb-8" style={{ height: 0 }}>
                {/* Table - Desktop */}
                <div className="hidden lg:block">
                  <table className="w-full">
                    <thead className="bg-gray-800/50 border-b border-white/[0.08] sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <button
                            onClick={() => handleSort('name')}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                          >
                            LocalHashtag
                            <SortIcon field="name" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-center w-24">
                          <button
                            onClick={() => handleSort('posts')}
                            className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors mx-auto"
                          >
                            Posts
                            <SortIcon field="posts" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-center w-24">
                          <button
                            onClick={() => handleSort('boosts')}
                            className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors mx-auto"
                          >
                            Boosts
                            <SortIcon field="boosts" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-center w-24">
                          <button
                            onClick={() => handleSort('shouts')}
                            className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors mx-auto"
                          >
                            Shouts
                            <SortIcon field="shouts" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex justify-center">
                              <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                            </div>
                          </td>
                        </tr>
                      ) : filteredAndSortedLocalHashtags.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <div>
                                <p className="text-gray-400 font-medium mb-1">
                                  {searchQuery ? `No hashtags match "${searchQuery}"` : 'No hashtags found'}
                                </p>
                                {searchQuery && (
                                  <p className="text-gray-500 text-sm">
                                    Try a different search term
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedLocalHashtags.map((hashtag, index) => (
                          <tr
                            key={hashtag.slug || `hashtag-${index}`}
                            onClick={() => handleRowClick(hashtag.slug)}
                            className="border-b border-white/[0.08] hover:bg-gray-800/30 cursor-pointer transition-colors relative"
                            style={{ zIndex: openMenuSlug === hashtag.slug ? 10 : 1 }}
                          >
                            <td className="px-6 py-4">
                              <span className={`font-medium ${hashtag.shouts > hashtag.boosts
                                ? 'text-red-400'
                                : hashtag.shouts === hashtag.boosts
                                  ? 'text-orange-400'
                                  : 'text-green-400'
                                }`}>
                                #{hashtag.name}
                              </span>
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-700 text-xs text-gray-400 border border-gray-600">
                                {hashtag.category || 'General'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-gray-300 tabular-nums font-medium w-24">{hashtag.posts}</td>
                            <td className="px-6 py-4 text-center text-gray-300 tabular-nums font-medium w-24">{hashtag.boosts}</td>
                            <td className="px-6 py-4 text-center text-gray-300 tabular-nums font-medium w-24 relative" onClick={(e) => e.stopPropagation()}>
                              {hashtag.shouts}
                              {currentUser && hashtag.createdBy === currentUser.id && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 hashtag-menu" style={{ zIndex: 100 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuSlug(openMenuSlug === hashtag.slug ? null : hashtag.slug);
                                    }}
                                    className="text-gray-400 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-700/50"
                                    title="More options"
                                    aria-label="More options"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </button>
                                  {openMenuSlug === hashtag.slug && (
                                    <div className="absolute right-0 top-full mt-1 bg-[#1F2937] border border-white/[0.08] rounded-lg shadow-lg z-50 min-w-[120px] hashtag-menu" style={{ zIndex: 100 }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteLocalHashtag(hashtag.slug, e);
                                          setOpenMenuSlug(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* List - Mobile */}
                <div className="lg:hidden space-y-4 pb-4">
                  {filteredAndSortedLocalHashtags.length === 0 ? (
                    <div className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <div>
                          <p className="text-gray-400 font-medium mb-1">
                            {searchQuery ? `No hashtags match "${searchQuery}"` : 'No hashtags found'}
                          </p>
                          {searchQuery && (
                            <p className="text-gray-500 text-sm">
                              Try a different search term
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    filteredAndSortedLocalHashtags.map((hashtag, index) => (
                      <motion.div
                        key={hashtag.slug || `hashtag-mobile-${index}`}
                        onClick={() => handleRowClick(hashtag.slug)}
                        whileHover={{ scale: 1.01 }}
                        className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-4 cursor-pointer relative"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className={`font-medium ${hashtag.shouts > hashtag.boosts
                            ? 'text-red-400'
                            : hashtag.shouts === hashtag.boosts
                              ? 'text-orange-400'
                              : 'text-green-400'
                            }`}>
                            #{hashtag.name}
                          </span>
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-700 text-xs text-gray-400 border border-gray-600">
                            {hashtag.category || 'General'}
                          </span>
                          {currentUser && hashtag.createdBy === currentUser.id && (
                            <div className="relative hashtag-menu" style={{ zIndex: 100 }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuSlug(openMenuSlug === hashtag.slug ? null : hashtag.slug);
                                }}
                                className="text-gray-400 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-700/50"
                                title="More options"
                                aria-label="More options"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                              {openMenuSlug === hashtag.slug && (
                                <div className="absolute right-0 top-full mt-1 bg-[#1F2937] border border-white/[0.08] rounded-lg shadow-lg z-50 min-w-[120px] hashtag-menu" style={{ zIndex: 100 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteLocalHashtag(hashtag.slug, e);
                                      setOpenMenuSlug(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Posts</div>
                            <div className="text-gray-300 font-medium">{hashtag.posts}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Boosts</div>
                            <div className="text-gray-300 font-medium">{hashtag.boosts}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Shouts</div>
                            <div className="text-gray-300 font-medium">{hashtag.shouts}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create LocalHashtag Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateLocalHashtagModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setNewLocalHashtagName('');
            }}
            onCreate={handleCreateLocalHashtag}
            hashtagName={newLocalHashtagName}
            setLocalHashtagName={setNewLocalHashtagName}
            hashtagCategory={newLocalHashtagCategory}
            setLocalHashtagCategory={setNewLocalHashtagCategory}
          />
        )}
      </AnimatePresence>

      <MobileNav />
    </div>
  );
}

// Create LocalHashtag Modal Component
interface CreateLocalHashtagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  hashtagName: string;
  setLocalHashtagName: (name: string) => void;
  hashtagCategory: string;
  setLocalHashtagCategory: (category: string) => void;
}

const CATEGORIES = ['General', 'Technology', 'Entertainment', 'Politics', 'Sports', 'Education'];

const CreateLocalHashtagModal: React.FC<CreateLocalHashtagModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  hashtagName,
  setLocalHashtagName,
  hashtagCategory,
  setLocalHashtagCategory,
}) => {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-[#1F2937] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-100">Create New LocalHashtag</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              LocalHashtag Name
            </label>
            <input
              type="text"
              value={hashtagName}
              onChange={(e) => {
                // Strip # symbol if user types it
                const value = e.target.value.replace(/#/g, '');
                setLocalHashtagName(value);
              }}
              placeholder="Enter hashtag name (e.g., WebDesign)"
              className="w-full px-4 py-3 bg-gray-800/50 border border-white/[0.08] rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCreate();
                } else if (e.key === 'Escape') {
                  onClose();
                }
              }}
            />
            <p className="mt-2 text-xs text-gray-500">
              The hashtag will be created as #{hashtagName || 'hashtag'}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <div className="relative">
              <select
                value={hashtagCategory}
                onChange={(e) => setLocalHashtagCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-white/[0.08] rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 appearance-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#1F2937]">
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium transition-all"
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={onCreate}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-medium transition-all"
            >
              Create
            </motion.button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

