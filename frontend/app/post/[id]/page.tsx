'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { PostCard, Composer, PostHeader, CommentItem, PostSkeleton, QuoteModal } from '@/features/posts';
import { useStore, Comment, currentUserMock } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { renderTextWithHashtags } from '@/lib/text-utils';
import { analyticsAPI } from '@v/api-client';
import Link from 'next/link';

function PostDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const postId = params.id as string;
  const focusedCommentId = searchParams.get('c');

  const { posts, commentsByPost, addComment, loadComments, isFollowing } = useStore();
  const { addToast } = useToast();
  const [postAuthorProfile, setPostAuthorProfile] = useState<{ followersOnlyComments?: boolean; id: string } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const post = posts.find(p => p.id === postId);
  const allComments = commentsByPost[postId] || [];
  const [focusedComment, setFocusedComment] = useState<Comment | null>(null);

  // Load comments from backend when post loads
  useEffect(() => {
    if (postId) {
      loadComments(postId);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      setIsLoading(true);

      // Simulate loading
      setTimeout(() => {
        if (focusedCommentId) {
          const allCommentsSnapshot = commentsByPost[postId] || [];
          const comment = allCommentsSnapshot.find(c => c.id === focusedCommentId) || null;
          setFocusedComment(comment);

          // Scroll to focused comment after render
          setTimeout(() => {
            const element = document.getElementById(`comment-${focusedCommentId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }

        setIsLoading(false);
      }, 300);
    }
  }, [postId, focusedCommentId]); // Removed allComments dependency to prevent flickering

  // Load post author's profile to check followersOnlyComments setting
  useEffect(() => {
    if (post?.author?.handle) {
      import('@/features/users').then(({ getUser }) => {
        getUser(post.author.handle).then(profile => {
          if (profile) {
            setPostAuthorProfile({
              followersOnlyComments: profile.followersOnlyComments,
              id: profile.id
            });
          }
        }).catch((error) => {
          console.error('Failed to load post author profile:', error);
        });
      }).catch((error) => {
        console.error('Failed to import profileAPI:', error);
      });
    }
  }, [post?.author?.handle]);

  // Record impression and update metrics
  useEffect(() => {
    if (postId && currentUserMock?.id) {
      // Small delay to ensure it's a valid view
      const timer = setTimeout(() => {
        if (!currentUserMock?.id) return;
        analyticsAPI.recordImpression({ postId, userId: currentUserMock.id })
          .then(() => {
            // Fetch updated metrics
            return analyticsAPI.getPostMetrics(postId);
          })
          .then((metrics) => {
            // Update store with new metrics
            const store = useStore.getState();
            const updatedPosts = store.posts.map(p =>
              p.id === postId
                ? { ...p, reach_24h: metrics.reach_24h, reach_all: metrics.reach_all }
                : p
            );
            useStore.setState({ posts: updatedPosts });
          })
          .catch(err => {
            console.error('Failed to record impression or update metrics:', err);
          });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [postId]);

  const handleNewComment = async (content: string) => {
    // Check if comments are disabled
    if (post?.commentsDisabled) {
      addToast('Comments are disabled for this post', 'error');
      return;
    }

    // Check if only followers can comment
    if (postAuthorProfile?.followersOnlyComments && post?.author?.id) {
      const viewerIsFollower = isFollowing(post.author.id);
      if (!viewerIsFollower) {
        addToast('Only followers can comment on this post', 'error');
        return;
      }
    }

    // Check if comment limit reached
    if (post?.commentLimit && allComments.length >= post.commentLimit) {
      addToast(`Comment limit of ${post.commentLimit} reached`, 'error');
      return;
    }

    await addComment(postId, content);
    // Reload comments to show the new comment
    await loadComments(postId);
    addToast('Comment added', 'success');
  };

  const handleReply = async (commentId: string, content: string) => {
    await addComment(postId, content, commentId);
    // Reload comments to show the new reply
    await loadComments(postId);
    addToast('Reply added', 'success');
  };

  const handleViewThread = (commentId: string) => {
    router.push(`/post/${postId}?c=${commentId}`);
  };

  if (!isLoading && !post) {
    return (
      <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Post not found</h1>
          <Link href="/feed" className="text-cyan-400 hover:text-cyan-300">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !post) {
    return (
      <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
        <div className="relative">
          <FeedHeader />
          <LeftNav />
          <main className="lg:ml-[72px] min-h-screen pt-16">
            <div className="max-w-[720px] mx-auto px-4 py-6 pb-24 lg:pb-6">
              <PostSkeleton />
            </div>
          </main>
          <MobileNav />
        </div>
      </div>
    );
  }

  // Helper function to calculate comment depth
  const getCommentDepth = (comment: Comment, allComments: Comment[]): number => {
    if (!comment.parentId) return 0;
    const parent = allComments.find(c => c.id === comment.parentId);
    if (!parent) return 0;
    return 1 + getCommentDepth(parent, allComments);
  };

  // Sort comments: newest top-level comments first, with replies threaded below their parent
  const sortedComments = (() => {
    // Separate top-level comments and replies
    const topLevel = allComments.filter(c => !c.parentId);
    const replies = allComments.filter(c => c.parentId !== null);

    // Sort top-level comments by newest first
    const sortedTopLevel = topLevel.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Function to get all replies for a comment (recursively)
    const getRepliesFor = (parentId: string): Comment[] => {
      const directReplies = replies
        .filter(c => c.parentId === parentId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Replies chronological

      const allReplies: Comment[] = [];
      directReplies.forEach(reply => {
        allReplies.push(reply);
        allReplies.push(...getRepliesFor(reply.id)); // Recursively add nested replies
      });

      return allReplies;
    };

    // Build final array: each top-level comment followed by its threaded replies
    const result: Comment[] = [];
    sortedTopLevel.forEach(comment => {
      result.push(comment);
      result.push(...getRepliesFor(comment.id));
    });

    return result;
  })();

  // Get parent comment if focused comment has one
  const parentComment = focusedComment?.parentId
    ? sortedComments.find(c => c.id === focusedComment.parentId)
    : null;

  // Filter comments based on view mode
  const displayComments = focusedCommentId
    ? sortedComments.filter(c =>
      c.id === focusedCommentId ||
      c.parentId === focusedCommentId ||
      c.id === focusedComment?.parentId
    )
    : sortedComments.filter(c => getCommentDepth(c, allComments) < 3); // Show up to 2 levels deep

  return (
    <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
      <div className="relative">
        <FeedHeader />
        <LeftNav />

        <main className="lg:ml-[72px] min-h-screen pt-16">
          <div className="max-w-[720px] mx-auto px-4 py-6 pb-24 lg:pb-6">
            {/* Quote Modal - TODO: Implement quote functionality */}
            {/* <QuoteModal post={post} onClose={() => {}} /> */}

            {/* Post Header */}
            <PostHeader author={post.author} showBackButton={true} />

            {/* Context for focused comment */}
            {focusedComment && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  <Link href={`/post/${postId}`} className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                    View full post
                  </Link>
                </div>

                {parentComment && (
                  <div className="text-sm text-gray-300 mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Reply to <Link href={`/u/${parentComment.author.handle}`} className="text-cyan-400 hover:underline font-medium">
                      @{parentComment.author.handle}
                    </Link>
                  </div>
                )}

                <div className="text-xs text-gray-400 flex items-start gap-2 bg-gray-900/40 p-2 rounded">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="line-clamp-2">
                    <span className="font-medium text-gray-300">{post.author.displayName}:</span> {renderTextWithHashtags(post.content)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Main Post */}
            {!focusedComment && (
              <div className="mb-6">
                <PostCard post={post} onQuote={() => { }} />
              </div>
            )}

            {/* Composer for new comment or disabled message */}
            {!focusedComment && (
              <>
                {post.commentsDisabled ? (
                  <div className="mb-6 p-4 bg-gray-800/30 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-center gap-3 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <p className="text-sm">Comments are turned off for this post</p>
                    </div>
                  </div>
                ) : postAuthorProfile?.followersOnlyComments && post?.author?.id && !isFollowing(post.author.id) ? (
                  <div className="mb-6 p-4 bg-gray-800/30 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-center gap-3 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-sm">Only followers can comment on this post</p>
                    </div>
                  </div>
                ) : post.commentLimit && allComments.length >= post.commentLimit ? (
                  <div className="mb-6 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center gap-3 text-amber-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm">Comment limit of {post.commentLimit} reached</p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6">
                    <Composer onPost={handleNewComment} />
                    {post.commentLimit && (
                      <p className="text-xs text-gray-500 mt-2">
                        {allComments.length} / {post.commentLimit} comments
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Comments */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                {focusedComment ? (
                  <>
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Thread
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    {`Comments (${allComments.length})`}
                  </>
                )}
              </h2>

              {post.commentsDisabled ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <p className="font-medium">Comments are turned off</p>
                  <p className="text-sm mt-1">The author has disabled comments on this post</p>
                </div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    {displayComments.map((comment, index) => {
                      // Check if comment has deep replies
                      const hasDeepReplies = allComments.some(c =>
                        c.parentId === comment.id && getCommentDepth(c, allComments) >= 2
                      );

                      return (
                        <motion.div
                          key={comment.id}
                          id={`comment-${comment.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <CommentItem
                            comment={comment}
                            postId={postId}
                            allComments={allComments}
                            focused={comment.id === focusedCommentId}
                            onReply={handleReply}
                            hasMoreReplies={hasDeepReplies && getCommentDepth(comment, allComments) === 1}
                            onViewThread={handleViewThread}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {!focusedCommentId && allComments.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>No comments yet</p>
                      <p className="text-sm mt-1">Be the first to comment!</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0C1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    }>
      <PostDetailContent />
    </Suspense>
  );
}

