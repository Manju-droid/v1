'use client';

import React, { use, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { useStore, Post } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { PostCard } from '@/features/posts';
import Image from 'next/image';
import { hashtagAPI, userAPI, postAPI } from '@v/api-client';

type FilterType = 'all' | 'top' | 'latest';
type SortType = 'top' | 'latest';

const POSTS_PER_PAGE = 10;

export default function HashtagDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { addPost } = useStore(); // Keep addPost for optimistic updates if needed, or use API directly
  const { addToast } = useToast();
  const currentUser = useStore(state => state.currentUser);
  const syncCurrentUser = useStore(state => state.syncCurrentUser);

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('top');

  const [composerText, setComposerText] = useState('');
  const [displayedCount, setDisplayedCount] = useState(POSTS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  const [hashtag, setHashtag] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  // Sync current user on mount
  useEffect(() => {
    syncCurrentUser();
  }, [syncCurrentUser]);

  // Fetch hashtag data and posts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Fetch hashtag details
        try {
          const hashtagData = await hashtagAPI.getBySlug(slug);
          if (hashtagData) {
            // Backend returns { hashtag: {...}, boosts, shouts, momentum }
            const h = (hashtagData as any).hashtag || hashtagData;
            const name = h.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

            setHashtag({
              ...h,
              name: name,
              slug: slug,
              posts: h.posts || 0,
              followers: h.followers || 0,
              description: h.description || '',
            });
          } else {
            // Fallback if not found (or create new)
            setHashtag({
              slug,
              name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              description: '',
              posts: 0,
              followers: 0,
            });
          }
        } catch (e) {
          console.warn('Hashtag not found, using fallback');
          setHashtag({
            slug,
            name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            description: '',
            posts: 0,
            followers: 0,
          });
        }

        // Fetch posts for hashtag
        const postsData = await hashtagAPI.getPosts(slug);
        console.log('[Hashtag Detail] Posts from API:', postsData);
        if (postsData) {
          setPosts(postsData);
        }

        // Fetch top users
        const usersData = await userAPI.list({ limit: 5 });
        if (usersData) {
          setTopUsers(usersData.filter((u: any) => currentUser && u.id !== currentUser.id));
        }

      } catch (error) {
        console.error('Failed to load hashtag data:', error);
        addToast('Failed to load data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [slug, addToast]);

  // Calculate actual stats from posts (or use API stats if available)
  const actualStats = useMemo(() => {
    if (!hashtag) return { posts: 0, boosts: 0, shouts: 0, momentum: 0 };

    // If API provides stats, use them. Otherwise calculate from loaded posts
    // For now, simple calculation based on loaded posts
    const totalPosts = posts.length;
    const boostsCount = posts.filter(post => post.content.toLowerCase().includes('#boost')).length;
    const shoutsCount = posts.filter(post => post.content.toLowerCase().includes('#shout')).length;

    return {
      posts: hashtag.posts || totalPosts,
      boosts: boostsCount,
      shouts: shoutsCount,
      momentum: boostsCount - shoutsCount,
    };
  }, [posts, hashtag]);

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = [...posts];

    // Apply filter
    if (filter === 'top') {
      filtered.sort((a, b) => {
        const aScore = (a.commentCount || a.comments || 0);
        const bScore = (b.commentCount || b.comments || 0);
        return bScore - aScore;
      });
    } else if (filter === 'latest') {
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Apply sort
    if (sortBy === 'top') {
      filtered.sort((a, b) => {
        const aScore = (a.commentCount || a.comments || 0);
        const bScore = (b.commentCount || b.comments || 0);
        return bScore - aScore;
      });
    } else if (sortBy === 'latest') {
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return filtered;
  }, [posts, filter, sortBy]);

  // Auto-switch tab if current tab has 0 results
  useEffect(() => {
    if (filteredAndSortedPosts.length === 0 && posts.length > 0) {
      // Logic to switch tabs if needed, simplified for now
    }
  }, [filteredAndSortedPosts.length, posts.length]);

  // Displayed posts (for infinite scroll)
  const displayedPosts = useMemo(() => {
    return filteredAndSortedPosts.slice(0, displayedCount);
  }, [filteredAndSortedPosts, displayedCount]);

  // Update hasMore when posts change
  useEffect(() => {
    setHasMore(displayedCount < filteredAndSortedPosts.length);
  }, [displayedCount, filteredAndSortedPosts.length]);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortMenu]);

  // Infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + POSTS_PER_PAGE, filteredAndSortedPosts.length));
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore, filteredAndSortedPosts.length]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading) {
        loadMore();
      }
    },
    [hasMore, isLoading, loadMore]
  );

  useEffect(() => {
    const element = observerTarget.current;
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });

    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  const handleBoost = async () => {
    if (!composerText.trim()) {
      addToast('Please enter your thoughts', 'error');
      return;
    }
    // Add #boost and hashtag to content
    const content = `${composerText} #boost #${hashtag.name}`;

    try {
      if (!currentUser?.id) {
        addToast('Please log in to post', 'error');
        return;
      }
      const newPost = await postAPI.create({ authorId: currentUser.id, content });

      // Link post to hashtag
      if (newPost && newPost.id) {
        await hashtagAPI.addPost(slug, newPost.id, true); // true = isBoost
      }


      // Refresh posts
      const postsData = await hashtagAPI.getPosts(slug);
      const validPosts = (postsData as any[]).filter((post: any) => post.author && post.author.id);
      setPosts(validPosts);

      setComposerText('');
      addToast('Boosted!', 'success');
    } catch (error) {
      console.error('Failed to boost:', error);
      addToast('Failed to boost', 'error');
    }
  };

  const handleShout = async () => {
    if (!composerText.trim()) {
      addToast('Please enter your thoughts', 'error');
      return;
    }
    // Add #shout and hashtag to content
    const content = `${composerText} #shout #${hashtag.name}`;

    try {
      if (!currentUser?.id) {
        addToast('Please log in to post', 'error');
        return;
      }
      const newPost = await postAPI.create({ authorId: currentUser.id, content });

      //Link post to hashtag
      if (newPost && newPost.id) {
        await hashtagAPI.addPost(slug, newPost.id, false); // false = isShout
      }

      // Refresh posts
      const postsData = await hashtagAPI.getPosts(slug);
      const validPosts = (postsData as any[]).filter((post: any) => post.author && post.author.id);
      setPosts(validPosts);

      setComposerText('');
      addToast('Shouted!', 'success');
    } catch (error) {
      console.error('Failed to shout:', error);
      addToast('Failed to shout', 'error');
    }
  };



  const handleFollowUser = (userId: string) => {
    setFollowingUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
        addToast('Unfollowed user', 'success');
      } else {
        newSet.add(userId);
        addToast('Following user', 'success');
      }
      return newSet;
    });
  };

  const handleDelete = (postId: string) => {
    // Remove post from local state immediately
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    addToast('Post deleted', 'success');
  };

  const handleQuote = (postId: string) => {
    // Handle quote functionality if needed
    // For now, we can leave it empty or navigate to post detail
  };

  const focusComposer = () => {
    composerRef.current?.focus();
  };

  // Format number with B suffix for boosts (e.g., 57B)
  const formatBoosts = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}B`;
    }
    return num.toString();
  };

  // Use actual stats calculated from posts
  const currentStats = {
    ...hashtag,
    ...actualStats,
  };
  const isComposerEmpty = !composerText.trim();

  return (
    <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
      {/* Layout Container */}
      <div className="relative">
        {/* Top Header */}
        <FeedHeader />

        {/* Left Navigation */}
        <LeftNav />

        {/* Main Content */}
        <main className="lg:ml-[72px] xl:mr-[340px] min-h-screen pt-16">
          {isLoading && !hashtag ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="max-w-[900px] mx-auto px-4 py-6 pb-24 lg:pb-6">
              {/* Header Section */}
              <div className="mb-6">
                {/* Back Button */}
                <div className="mb-4">
                  <motion.button
                    onClick={() => router.push('/hashtag')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back to Hashtag Hub</span>
                  </motion.button>
                </div>

                {/* Top Row: Hashtag + Follow/Sort */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-white">
                      #{currentStats.name}
                    </h1>
                    {currentStats.trending && (
                      <span className="text-xl">🔥</span>
                    )}
                  </div>
                  {/* Desktop: Follow and Sort on same row */}
                  <div className="hidden md:flex items-center gap-3">

                    <div className="relative" ref={sortMenuRef}>
                      <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1F2937] border border-white/[0.08] text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                      >
                        <span>Sort by {sortBy === 'top' ? 'Top' : 'Latest'}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {showSortMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 top-full mt-1 bg-[#1F2937] border border-white/[0.08] rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden"
                          >
                            <button
                              onClick={() => {
                                setSortBy('top');
                                setShowSortMenu(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors ${sortBy === 'top' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                              Top
                            </button>
                            <button
                              onClick={() => {
                                setSortBy('latest');
                                setShowSortMenu(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors ${sortBy === 'latest' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                              Latest
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Statistics Row */}
                <div className="flex items-center gap-4 mb-5 text-sm text-[#A0A0A0]">
                  <div>
                    <span className="font-semibold text-white">{actualStats.posts}</span> posts
                  </div>
                  <span>•</span>
                  <div>
                    <span className="font-semibold text-white">{actualStats.boosts}</span> boosts
                  </div>
                  <span>•</span>
                  <div>
                    <span className="font-semibold text-white">{actualStats.shouts}</span> shouts
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-white/[0.08] mb-5">
                  {(['all', 'top', 'latest'] as FilterType[]).map((filterType) => (
                    <button
                      key={filterType}
                      onClick={() => setFilter(filterType)}
                      className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${filter === filterType
                        ? 'text-white border-b-2 border-[#00C896]'
                        : 'text-[#A0A0A0] hover:text-gray-300'
                        }`}
                    >
                      {filterType}
                    </button>
                  ))}
                  {/* Mobile: Sort button */}
                  <div className="md:hidden ml-auto relative" ref={sortMenuRef}>
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="px-3 py-2 text-sm text-[#A0A0A0] hover:text-white transition-colors flex items-center gap-1"
                    >
                      <span>Sort</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {showSortMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 top-full mt-1 bg-[#1F2937] border border-white/[0.08] rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              setSortBy('top');
                              setShowSortMenu(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${sortBy === 'top' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                              }`}
                          >
                            Top
                          </button>
                          <button
                            onClick={() => {
                              setSortBy('latest');
                              setShowSortMenu(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${sortBy === 'latest' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                              }`}
                          >
                            Latest
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Community Guidelines */}
                <p className="text-sm text-[#A0A0A0] mb-6">
                  Be respectful. Review our{' '}
                  <a href="#" className="text-[#64B5F6] hover:text-[#90CAF9] transition-colors">
                    community guidelines
                  </a>
                  .
                </p>
              </div>

              {/* Composer Section */}
              <div className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-4 mb-6">
                <textarea
                  ref={composerRef}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder={`Share your thoughts on #${currentStats.name}...`}
                  className="w-full bg-transparent text-white placeholder-[#A0A0A0] resize-none focus:outline-none focus:ring-0 focus:border-0 mb-3 min-h-[80px] text-sm"
                  rows={3}
                  style={{ outline: 'none', border: 'none' }}
                />
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <motion.button
                    onClick={handleBoost}
                    disabled={isComposerEmpty}
                    whileHover={!isComposerEmpty ? { scale: 1.02 } : {}}
                    whileTap={!isComposerEmpty ? { scale: 0.98 } : {}}
                    style={!isComposerEmpty ? { backgroundColor: '#22c55e' } : {}}
                    className={`px-3 py-1.5 rounded-lg text-white font-medium transition-colors text-xs flex items-center justify-center gap-1.5 ${isComposerEmpty
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed opacity-60'
                      : 'hover:bg-[#16a34a]'
                      }`}
                    title={isComposerEmpty ? 'Add a thought first.' : ''}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Boost</span>
                  </motion.button>
                  <motion.button
                    onClick={handleShout}
                    disabled={isComposerEmpty}
                    whileHover={!isComposerEmpty ? { scale: 1.02 } : {}}
                    whileTap={!isComposerEmpty ? { scale: 0.98 } : {}}
                    style={!isComposerEmpty ? { backgroundColor: '#ef4444' } : {}}
                    className={`px-3 py-1.5 rounded-lg text-white font-medium transition-colors text-xs flex items-center justify-center gap-1.5 ${isComposerEmpty
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed opacity-60'
                      : 'hover:bg-[#dc2626]'
                      }`}
                    title={isComposerEmpty ? 'Add a thought first.' : ''}
                  >
                    <span className="text-sm">#</span>
                    <span>Shout</span>
                  </motion.button>
                </div>
                <p className="text-xs text-[#A0A0A0]">
                  Boost = support • Shout = challenge
                </p>
              </div>

              {/* Posts List */}
              <div className="space-y-5">
                {displayedPosts.length === 0 ? (
                  <div className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      <h2 className="text-xl font-semibold text-gray-400 mb-2">No posts yet</h2>
                      <p className="text-gray-500 text-sm mb-6">
                        Be the first to share your thoughts on #{currentStats.name}
                      </p>
                      <motion.button
                        onClick={focusComposer}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-6 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium transition-colors text-sm"
                      >
                        Share your thoughts
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <>
                    {displayedPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onQuote={handleQuote}
                        onDelete={handleDelete}
                        onReact={() => {
                          setPosts(prevPosts => prevPosts.map(p => {
                            if (p.id === post.id) {
                              // Toggle reaction locally
                              const newReacted = !p.reacted;
                              const newCount = (p.reactionCount || 0) + (newReacted ? 1 : -1);
                              return { ...p, reacted: newReacted, reactionCount: Math.max(0, newCount) };
                            }
                            return p;
                          }));
                        }}
                        onSaveChange={() => {
                          setPosts(prevPosts => prevPosts.map(p => {
                            if (p.id === post.id) {
                              // Toggle save locally
                              const newSaved = !p.saved;
                              const newCount = (p.saveCount || 0) + (newSaved ? 1 : -1);
                              return { ...p, saved: newSaved, saveCount: Math.max(0, newCount) };
                            }
                            return p;
                          }));
                        }}
                        source="hashtag"
                      />
                    ))}

                    {/* Infinite scroll trigger */}
                    {hasMore && (
                      <div ref={observerTarget} className="py-4 text-center">
                        {isLoading && (
                          <div className="text-gray-400 text-sm">Loading more posts...</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Top Users to Follow */}
        <div className="hidden xl:block fixed top-16 right-0 w-[320px] h-[calc(100vh-4rem)] overflow-y-auto pt-6 pr-6">
          <div className="sticky top-6">
            <div className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Top Users to Follow</h2>
              <div className="space-y-4">
                {topUsers.map((user) => {
                  const isFollowing = followingUsers.has(user.id);
                  return (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                        {user.avatar && user.avatar.trim() !== '' ? (
                          <Image
                            src={user.avatar}
                            alt={user.displayName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-semibold">
                            {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">
                          {user.displayName}
                        </div>
                        <div className="text-[#A0A0A0] text-xs truncate">
                          @{user.handle}
                        </div>
                        {user.bio && (
                          <div className="text-[#A0A0A0] text-xs mt-1 line-clamp-1">
                            {user.bio}
                          </div>
                        )}
                      </div>
                      <motion.button
                        onClick={() => handleFollowUser(user.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-1.5 rounded-lg font-medium transition-all text-xs whitespace-nowrap ${isFollowing
                          ? 'bg-[#1F2937] text-gray-300 hover:bg-gray-700 border border-white/[0.08]'
                          : 'bg-[#00C896] hover:bg-[#00B886] text-white'
                          }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </div >
    </div >
  );
}
