'use client';

/**
 * Post Detail Modal - Intercepting Route
 * 
 * This modal intercepts navigation to /post/[id] when coming from the /feed page.
 * - Clicking a post card in feed → Opens this modal overlay
 * - Direct navigation to /post/[id] → Shows full page (app/post/[id]/page.tsx)
 * - Click outside or ESC → Closes modal and returns to feed
 * 
 * Uses Next.js 13+ Intercepting Routes: (.)post/[id]
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PostCard, Composer, CommentItem } from '@/features/posts';
import { useStore, Comment } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';

export default function PostModal() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const postId = params.id as string;
  const focusedCommentId = searchParams.get('c');

  const { posts, commentsByPost, addComment, isFollowing } = useStore();
  const { addToast } = useToast();
  const [postAuthorProfile, setPostAuthorProfile] = useState<{ followersOnlyComments?: boolean; id: string } | null>(null);
  
  const post = posts.find(p => p.id === postId);
  const allComments = commentsByPost[postId] || [];
  const [focusedComment, setFocusedComment] = useState<Comment | null>(null);
  
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
        });
      });
    }
  }, [post?.author?.handle]);

  const handleClose = () => {
    router.back();
  };

  useEffect(() => {
    if (focusedCommentId) {
      const focused = allComments.find(c => c.id === focusedCommentId) || null;
      setFocusedComment(focused);
    }
  }, [focusedCommentId, allComments]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleNewComment = (content: string) => {
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
    
    addComment(postId, content);
    addToast('Comment added', 'success');
  };

  const handleReply = (commentId: string, content: string) => {
    addComment(postId, content, commentId);
    addToast('Reply added', 'success');
  };

  if (!post) {
    return null;
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

  const displayComments = focusedCommentId
    ? sortedComments.filter(c => 
        c.id === focusedCommentId || 
        c.parentId === focusedCommentId ||
        c.id === focusedComment?.parentId
      )
    : sortedComments.filter(c => getCommentDepth(c, allComments) < 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto px-0 md:px-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-[600px] mx-auto my-0 md:my-8 lg:my-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="hidden md:flex absolute -top-12 right-0 w-10 h-10 items-center justify-center rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal content */}
        <div className="bg-[#0F1621] md:rounded-2xl shadow-2xl border-x-0 md:border-x border-y-0 md:border-y border-white/[0.06] overflow-hidden max-h-screen md:max-h-[85vh] flex flex-col">
          {/* Mobile header with close button */}
          <div className="md:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#0F1621] border-b border-white/[0.06]">
            <button
              onClick={handleClose}
              className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-white">Post</span>
            <div className="w-9"></div> {/* Spacer for centering */}
          </div>
          {/* Post */}
          <div className="p-4 border-b border-white/[0.06]">
            <PostCard post={post} onQuote={() => {}} />
          </div>

          {/* Scrollable comments section */}
          <div className="flex-1 overflow-y-auto">
            {/* Composer for new comment or disabled message */}
            {!focusedComment && (
              <>
                {post.commentsDisabled ? (
                  <div className="p-4 border-b border-white/[0.06] bg-gray-800/30">
                    <div className="flex items-center gap-3 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <p className="text-sm">Comments are turned off for this post</p>
                    </div>
                  </div>
                ) : postAuthorProfile?.followersOnlyComments && post?.author?.id && !isFollowing(post.author.id) ? (
                  <div className="p-4 border-b border-white/[0.06] bg-gray-800/30">
                    <div className="flex items-center gap-3 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-sm">Only followers can comment on this post</p>
                    </div>
                  </div>
                ) : post.commentLimit && allComments.length >= post.commentLimit ? (
                  <div className="p-4 border-b border-white/[0.06] bg-amber-500/10">
                    <div className="flex items-center gap-3 text-amber-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm">Comment limit of {post.commentLimit} reached</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-b border-white/[0.06] bg-[#0C1117]">
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

            {/* Comments header */}
            <div className="p-4 pb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {focusedComment ? 'Thread' : `Comments (${allComments.length})`}
              </h2>
            </div>

            {/* Comments list */}
            <div className="px-4 pb-4 space-y-4">
              {post.commentsDisabled ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <p className="text-sm font-medium">Comments are turned off</p>
                  <p className="text-xs mt-1">The author has disabled comments on this post</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {displayComments.length > 0 ? (
                    displayComments.map((comment, index) => (
                      <motion.div 
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <CommentItem
                          comment={comment}
                          postId={postId}
                          allComments={allComments}
                          focused={comment.id === focusedCommentId}
                          onReply={handleReply}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-sm">No comments yet</p>
                      <p className="text-xs mt-1">Be the first to comment!</p>
                    </div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

