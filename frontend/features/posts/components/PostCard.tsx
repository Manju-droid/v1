'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { PulseIcon, HexSaveIcon, QuoteIcon, SplineShareIcon } from '@/components/icons';
import { formatTimestamp, formatCount } from '@/lib/mock';
import { useStore, currentUserMock, Post } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { renderTextWithHashtags } from '@/lib/text-utils';
import { trackReachImpression, isDocumentVisible } from '@/lib/analytics';
import { ReportButton } from './ReportButton';
import { getAvatarUrl } from '@/lib/avatar';
import { Avatar } from '@/components/ui/Avatar';

interface PostCardProps {
  post: Post;
  onQuote?: (postId: string) => void;
  source?: 'feed' | 'hashtag' | 'profile' | 'search';
  onSaveChange?: () => void;
  onReact?: () => void;
  onDelete?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onQuote, source = 'feed', onSaveChange, onReact, onDelete }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleReact, toggleSave, deletePost } = useStore();
  const { addToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [reachCount, setReachCount] = useState(post.reach_24h || 0);
  const menuRef = useRef<HTMLDivElement>(null);
  const justIncrementedRef = useRef(false);

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Sync reachCount with post prop when it changes
  // For self-views, always use backend count (which excludes self-views)
  // For other posts, only update if higher to avoid decreasing
  useEffect(() => {
    if (justIncrementedRef.current) {
      justIncrementedRef.current = false;
      return; // Skip sync if we just incremented
    }

    const postReach = post.reach_24h || 0;
    const isSelfView = currentUserMock && post.author.id === currentUserMock.id;

    setReachCount(prev => {
      if (isSelfView) {
        // For self-views, always use backend count (excludes self-views)
        return postReach;
      } else {
        // For other posts, only update if the post's reach is higher than current
        return postReach > prev ? postReach : prev;
      }
    });
  }, [post.reach_24h, post.author?.id || null]);
  const cardRef = useRef<HTMLElement>(null);
  const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTrackedRef = useRef(false);

  const isOwnPost = currentUserMock && post.author.id === currentUserMock.id;

  // Determine source from pathname if not provided
  const postSource = source || (pathname?.includes('/hashtag/') ? 'hashtag' :
    pathname?.includes('/profile/') ? 'profile' :
      pathname?.includes('/search') ? 'search' : 'feed');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Track reach when post becomes visible (≥60% visible for ≥800ms)
  useEffect(() => {
    if (!cardRef.current || hasTrackedRef.current) return;

    let isVisible = false;
    let visibilityStartTime: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const intersectionRatio = entry.intersectionRatio;
          const isIntersecting = entry.isIntersecting && intersectionRatio >= 0.6;

          if (isIntersecting && !isVisible && isDocumentVisible()) {
            // Post is ≥60% visible
            isVisible = true;
            visibilityStartTime = Date.now();

            // Start 800ms timer
            visibilityTimerRef.current = setTimeout(() => {
              if (isVisible && isDocumentVisible() && !hasTrackedRef.current) {
                hasTrackedRef.current = true;

                // Check if user has already viewed this post (track in localStorage)
                const viewedPostsKey = 'v_viewed_posts';
                const viewedPosts = new Set<string>(
                  typeof window !== 'undefined'
                    ? JSON.parse(localStorage.getItem(viewedPostsKey) || '[]')
                    : []
                );

                // Only track if this is a new unique view
                // IMPORTANT: Don't track self-views (post author viewing their own post)
                const isSelfView = currentUserMock?.id && post.author.id === currentUserMock.id;
                if (!viewedPosts.has(post.id) && !isSelfView) {
                  // Mark this post as viewed by this user
                  viewedPosts.add(post.id);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(viewedPostsKey, JSON.stringify(Array.from(viewedPosts)));
                  }

                  // Track reach impression (exclude self-views)
                  if (currentUserMock?.id) {
                    trackReachImpression(post.id, postSource, currentUserMock.id).then(() => {
                      // Fetch updated metrics from API (which calculates unique viewers)
                      return fetch(`/api/posts/${post.id}/metrics`)
                        .then(res => res.json())
                        .then(async data => {
                          if (data.reach_24h !== undefined) {
                            setReachCount(prev => {
                              // If API returns a lower value than current, increment instead
                              // This preserves initial mock values and prevents count from decreasing
                              let finalCount: number;
                              if (data.reach_24h < prev) {
                                // API calculated from scratch and got a lower value, increment current count
                                finalCount = prev + 1;
                              } else {
                                // API has a higher or equal value, use it
                                finalCount = data.reach_24h;
                              }

                              justIncrementedRef.current = true; // Mark that we updated

                              // Update the post in the store to persist the new reach count
                              const postId = post.id;
                              Promise.resolve().then(async () => {
                                const { useStore } = await import('@/lib/store');
                                const store = useStore.getState();
                                const updatedPosts = store.posts.map(p =>
                                  p.id === postId
                                    ? { ...p, reach_24h: finalCount, reach_all: data.reach_all || p.reach_all || 0 }
                                    : p
                                );
                                useStore.setState({ posts: updatedPosts });
                              });

                              return finalCount;
                            });
                          }
                          return undefined;
                        })
                        .catch(err => console.error('Failed to fetch metrics:', err));
                    });
                  } else {
                    // User has already viewed this post OR it's a self-view
                    // For self-views, always use backend count (which excludes self-views)
                    // For already-viewed posts, use the higher value
                    fetch(`/api/posts/${post.id}/metrics`)
                      .then(res => res.json())
                      .then(async data => {
                        if (data.reach_24h !== undefined) {
                          if (isSelfView) {
                            // For self-views, always use backend count (excludes self-views)
                            setReachCount(data.reach_24h);
                            // Update the post in the store
                            const postId = post.id;
                            Promise.resolve().then(async () => {
                              const { useStore } = await import('@/lib/store');
                              const store = useStore.getState();
                              const updatedPosts = store.posts.map(p =>
                                p.id === postId
                                  ? { ...p, reach_24h: data.reach_24h, reach_all: data.reach_all || p.reach_all || 0 }
                                  : p
                              );
                              useStore.setState({ posts: updatedPosts });
                            });
                          } else {
                            // For already-viewed posts, only update if API value is higher, never decrease
                            setReachCount(prev => Math.max(prev, data.reach_24h));
                          }
                        }
                      })
                      .catch(err => console.error('Failed to fetch metrics:', err));
                  }
                }
              }
            }, 800);
          } else if (!isIntersecting || intersectionRatio < 0.6) {
            // Post is no longer ≥60% visible
            isVisible = false;
            visibilityStartTime = null;

            // Clear timer if post leaves viewport
            if (visibilityTimerRef.current) {
              clearTimeout(visibilityTimerRef.current);
              visibilityTimerRef.current = null;
            }
          }
        });
      },
      { threshold: [0, 0.6, 1.0] } // Track at 0%, 60%, and 100%
    );

    observer.observe(cardRef.current);

    return () => {
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current);
      }
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [post.id, postSource]);

  const handleReaction = async () => {
    await toggleReact(post.id);
    if (onReact) {
      onReact();
    }
  };

  const handleSave = async () => {
    await toggleSave(post.id, { saved: post.saved });
    // Notify parent component if callback provided
    if (onSaveChange) {
      onSaveChange();
    }
  };

  const handleDelete = () => {
    console.log('DEBUG: Delete button clicked for post:', post.id);
    if (confirm('Delete this post? This action cannot be undone.')) {
      console.log('DEBUG: User confirmed delete. Calling onDelete and deletePost');
      // Call parent callback first for instant UI update
      if (onDelete) {
        onDelete(post.id);
      }
      // Then delete from backend
      deletePost(post.id)
        .then(() => console.log('DEBUG: deletePost promise resolved'))
        .catch(err => console.error('DEBUG: deletePost failed:', err));

      addToast('Post deleted', 'success');
      setShowMenu(false);
    } else {
      console.log('DEBUG: User cancelled delete');
    }
  };

  const handleQuote = () => {
    // Open quote modal via URL query
    const currentPath = window.location.pathname;
    const newUrl = `${currentPath}?quote=${post.id}`;
    router.push(newUrl);

    if (onQuote) {
      onQuote(post.id);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied', 'success');
    } catch (err) {
      addToast('Failed to copy link', 'error');
    }
  };

  const handleTranslate = async () => {
    if (showTranslation) {
      // Toggle back to original
      setShowTranslation(false);
      return;
    }

    // If already translated, just show it
    if (translatedContent) {
      setShowTranslation(true);
      return;
    }

    // Get user's secondary language (default to Telugu if not set)
    const targetLang = currentUserMock?.languages?.[1] || 'te';

    // Use the backend API URL
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

    setIsTranslating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${post.id}/translate?lang=${targetLang}`);
      if (!response.ok) throw new Error('Translation failed');

      const result = await response.json();
      // Backend returns { success: true, data: { translatedContent: "..." } }
      const translated = result.data?.translatedContent || result.translatedContent || '';
      setTranslatedContent(translated);
      setShowTranslation(true);
      addToast('Translated successfully', 'success');
    } catch (err) {
      addToast('Translation failed', 'error');
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl shadow-md hover:shadow-cyan-500/10 hover:shadow-xl transition-all duration-300 p-4 md:p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href={`/u/${post.author.handle}`}
            onClick={(e) => e.stopPropagation()}
            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/20 hover:ring-cyan-500/40 transition-all cursor-pointer"
          >
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 cursor-pointer">
              <Avatar
                user={post.author}
                size="100%"
                className="w-full h-full"
                showBorder
              />
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <Link
                href={`/u/${post.author.handle}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-white text-sm md:text-base truncate hover:text-cyan-400 transition-colors cursor-pointer"
              >
                {post.author.displayName}
              </Link>
              <Link
                href={`/u/${post.author.handle}`}
                onClick={(e) => e.stopPropagation()}
                className="text-gray-400 text-xs md:text-sm truncate hover:text-cyan-400 transition-colors cursor-pointer"
              >
                @{post.author.handle}
              </Link>
              <span className="text-gray-500 text-xs">·</span>
              <time className="text-gray-500 text-xs whitespace-nowrap">
                {formatTimestamp(post.timestamp)}
              </time>
            </div>
          </div>
        </div>

        {/* Overflow menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full transition-colors"
            aria-label="Post options"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10"
              >
                {isOwnPost && (
                  <>
                    <Link
                      href={`/post/${post.id}/analytics`}
                      className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-3"
                      onClick={() => setShowMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Analytics
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Post
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    handleShare();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Link
                </button>
                {!isOwnPost && (
                  <>
                    <div className="border-t border-gray-700" />
                    <ReportButton
                      postId={post.id}
                      onReported={() => {
                        setShowMenu(false);
                        addToast('Post reported', 'success');
                      }}
                    />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-gray-100 text-sm md:text-base leading-relaxed line-clamp-4">
          {showTranslation ? translatedContent : renderTextWithHashtags(post.content)}
        </p>
        {showTranslation && translatedContent && (
          <p className="text-purple-400/60 text-xs mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Translated from original
          </p>
        )}
      </div>

      {/* Media */}
      {post.media && post.media.length > 0 && post.media[0].url && (
        <div className="mb-4 rounded-xl overflow-hidden bg-gray-800/30 relative aspect-video">
          <Image
            src={post.media[0].url}
            alt="Post media"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 720px"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1 md:gap-2">
          {/* Reach */}
          <div
            className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 text-gray-400 group relative"
            title="Unique accounts who saw this post"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span className="text-xs md:text-sm font-semibold">
              {formatCount(reachCount)}
            </span>
          </div>

          {/* React */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReaction}
            className={`group flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-colors ${post.reacted ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'
              }`}
            aria-label={`React to post`}
          >
            <motion.div
              animate={post.reacted ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.18 }}
            >
              <PulseIcon
                active={post.reacted}
                filled={post.reacted}
                className="w-5 h-5"
              />
            </motion.div>
            <span className="text-xs md:text-sm font-semibold">
              {formatCount(post.reactionCount || 0)}
            </span>
          </motion.button>

          {/* Comment */}
          <Link href={`/post/${post.id}`}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
              aria-label={`View comments. ${post.comments} comments`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs md:text-sm font-semibold">
                {formatCount(post.comments)}
              </span>
            </motion.button>
          </Link>

          {/* Save */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className={`group flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-lg hover:bg-teal-500/10 transition-colors ${post.saved ? 'text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
            aria-label={`${post.saved ? 'Unsave' : 'Save'} post. ${post.saveCount || 0} saves`}
          >
            <motion.div
              animate={post.saved ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.12 }}
            >
              <HexSaveIcon
                saved={post.saved}
                className="w-5 h-5"
              />
            </motion.div>
            <span className="text-xs md:text-sm font-semibold">
              {formatCount(post.saveCount || 0)}
            </span>
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          {/* Translate feature disabled
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleTranslate}
            disabled={isTranslating}
            className={`group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors ${showTranslation
              ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
              } ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={showTranslation ? 'Show original' : 'Translate post'}
          >
            {isTranslating ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            )}
            <span className="text-xs md:text-sm font-semibold hidden md:inline">
              {showTranslation ? 'Original' : 'Translate'}
            </span>
          </motion.button>
          */}

          {/* Share */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            aria-label="Share post"
          >
            <SplineShareIcon className="w-5 h-5" />
            <span className="text-xs md:text-sm font-semibold hidden md:inline">Share</span>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};

