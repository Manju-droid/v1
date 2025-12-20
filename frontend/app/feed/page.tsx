'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { RightSidebar } from '@/components/feed/RightSidebar';
import { Composer, PostCard, PostSkeleton, QuoteModal } from '@/features/posts';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth';

const POSTS_PER_PAGE = 5;
const POLL_INTERVAL = 10000; // Poll for new posts every 10 seconds

export default function FeedPage() {
  const { posts, addPost, followedUsers, isFollowing, initializeFromMock, currentUser, syncCurrentUser } = useStore();
  const { addToast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [displayedCount, setDisplayedCount] = useState(POSTS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [quoteModalPost, setQuoteModalPost] = useState<any>(null);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Sync current user when authenticated
  useEffect(() => {
    if (isAuthenticated && !currentUser && !authLoading) {
      console.log('[Feed Page] User authenticated but currentUser not set, syncing...');
      syncCurrentUser();
    }
  }, [isAuthenticated, currentUser?.id, authLoading, syncCurrentUser]);

  // Poll for new posts periodically
  useEffect(() => {
    // Refresh posts on mount
    initializeFromMock();

    // Set up polling interval
    const pollInterval = setInterval(() => {
      initializeFromMock();
    }, POLL_INTERVAL);

    // Also refresh when window regains focus
    const handleFocus = () => {
      initializeFromMock();
    };
    window.addEventListener('focus', handleFocus);

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        initializeFromMock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initializeFromMock]);

  // Filter and sort feed posts:
  // 1. Allow posts with hashtags (users can post with hashtags in feed)
  // 2. Exclude posts created via hashtag page composer (posts with #boost or #shout)
  // 3. Show posts from followed users OR general/global posts
  // 4. Sort: followed users first, then current user, then others (all sorted by newest first)
  const feedPosts = useMemo(() => {
    const filtered = posts.filter(post => {
      const content = post.content.toLowerCase();
      
      // Exclude posts created via hashtag page composer (these have #boost or #shout)
      // These posts should only appear in hashtag hub pages, not in feed
      const isHashtagPagePost = content.includes('#boost') || content.includes('#shout');
      if (isHashtagPagePost) {
        return false;
      }
      
      // Include all other posts (with or without hashtags)
      // Show posts from followed users, current user, or general posts
      const isFromFollowedUser = isFollowing(post.author.id);
      const isFromCurrentUser = currentUser && post.author.id === currentUser.id;
      
      // Show posts from followed users, current user, or general posts
      return isFromFollowedUser || isFromCurrentUser || true; // Show all posts (except hashtag page posts)
    });

    // Sort posts: followed users first, then current user, then others
    // Within each group, sort by timestamp (newest first)
    return filtered.sort((a, b) => {
      const aIsFollowed = isFollowing(a.author.id);
      const bIsFollowed = isFollowing(b.author.id);
      const aIsCurrentUser = currentUser && a.author.id === currentUser.id;
      const bIsCurrentUser = currentUser && b.author.id === currentUser.id;

      // Priority 1: Posts from followed users
      if (aIsFollowed && !bIsFollowed) return -1;
      if (!aIsFollowed && bIsFollowed) return 1;

      // Priority 2: Posts from current user (if not already followed)
      if (aIsCurrentUser && !bIsCurrentUser && !bIsFollowed) return -1;
      if (!aIsCurrentUser && bIsCurrentUser && !aIsFollowed) return 1;

      // Priority 3: Sort by timestamp (newest first) within same priority group
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime; // Newest first
    });
  }, [posts, followedUsers, isFollowing, currentUser]);

  // Update hasMore when feedPosts change
  useEffect(() => {
    setHasMore(displayedCount < feedPosts.length);
  }, [displayedCount, feedPosts.length]);

  // Infinite scroll observer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading) {
        loadMore();
      }
    },
    [hasMore, isLoading]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const option: IntersectionObserverInit = {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    };

    const observer = new IntersectionObserver(handleObserver, option);
    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  const loadMore = () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const newCount = displayedCount + POSTS_PER_PAGE;
      setDisplayedCount(newCount);
      
      if (newCount >= feedPosts.length) {
        setHasMore(false);
      }
      
      setIsLoading(false);
    }, 800);
  };

  const handlePost = async (content: string, media?: { type: 'image' | 'video'; file: File }, options?: { commentsDisabled?: boolean; commentLimit?: number }) => {
    // Create URL for media preview (UI-only, not uploaded anywhere)
    const mediaData = media ? {
      type: media.type,
      url: URL.createObjectURL(media.file),
    } : undefined;
    
    await addPost(content, mediaData, options);
    addToast('Posted', 'success');
  };

  const handleQuote = (postId: string) => {
    const post = feedPosts.find((p) => p.id === postId);
    if (post) {
      setQuoteModalPost(post);
    }
  };

  const handleQuoteSubmit = (quoteContent: string) => {
    console.log('Quote submitted:', quoteContent);
    // In a real app, this would create a quote post
  };

  const displayedPosts = feedPosts.slice(0, displayedCount);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      document.documentElement.classList.add('reduce-motion');
    }
  }, []);

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
          <div className="max-w-[900px] mx-auto px-4 py-6 pb-24 lg:pb-6">
            {/* Composer - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block mb-6">
              <Composer onPost={handlePost} />
            </div>

            {/* Feed */}
            <div className="space-y-4">
              {displayedPosts.map((post, index) => (
                <PostCard key={post.id} post={post} onQuote={handleQuote} />
              ))}

              {/* Loading skeletons */}
              {isLoading && (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              )}

              {/* Intersection observer target */}
              <div ref={observerTarget} className="h-4" />

              {/* End of feed message */}
              {!hasMore && feedPosts.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">You&apos;ve reached the end of your feed</p>
                  <p className="text-gray-600 text-xs mt-1">Check back later for more updates</p>
                </div>
              )}
              
              {/* Empty state */}
              {feedPosts.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No posts in your feed yet</p>
                  <p className="text-gray-500 text-xs mt-2">Follow users or create posts to see them here</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <RightSidebar />

        {/* Mobile Navigation */}
        <MobileNav />
      </div>

      {/* Quote Modal */}
      <AnimatePresence>
        {quoteModalPost && (
          <QuoteModal
            post={quoteModalPost}
            onClose={() => setQuoteModalPost(null)}
            onSubmit={handleQuoteSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
