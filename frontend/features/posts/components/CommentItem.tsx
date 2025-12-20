'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { formatTimestamp, formatCount } from '@/lib/mock';
import { PulseIcon, SplineShareIcon } from '@/components/icons';
import { Composer } from './Composer';
import { useStore, currentUserMock, Comment } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { renderTextWithHashtags } from '@/lib/text-utils';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  allComments?: Comment[]; // For calculating depth
  focused?: boolean;
  onReply?: (commentId: string, content: string) => void;
  hasMoreReplies?: boolean;
  onViewThread?: (commentId: string) => void;
}

// Helper function to calculate comment depth
const getCommentDepth = (comment: Comment, allComments: Comment[] = []): number => {
  if (!comment.parentId) return 0;
  const parent = allComments.find(c => c.id === comment.parentId);
  if (!parent) return 0;
  return 1 + getCommentDepth(parent, allComments);
};

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  allComments = [],
  focused = false,
  onReply,
  hasMoreReplies = false,
  onViewThread
}) => {
  const depth = getCommentDepth(comment, allComments);
  const router = useRouter();
  const { toggleCommentReact, deleteComment } = useStore();
  const { addToast } = useToast();
  const [showReply, setShowReply] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwnComment = currentUserMock && comment.author.id === currentUserMock.id;

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

  const handleReaction = () => {
    toggleCommentReact(postId, comment.id);
  };

  const handleDelete = () => {
    if (confirm('Delete this comment? This will also delete all replies.')) {
      deleteComment(postId, comment.id);
      addToast('Comment deleted', 'success');
      setShowMenu(false);
    }
  };

  const handleReplySubmit = (content: string) => {
    if (onReply) {
      onReply(comment.id, content);
    }
    setShowReply(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${postId}?c=${comment.id}`;
    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied', 'success');
    } catch (err) {
      addToast('Failed to copy link', 'error');
    }
  };

  const commentUrl = `/post/${postId}?c=${comment.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${focused ? 'ring-1 ring-cyan-500/30 rounded-xl p-4 bg-gray-800/20' : ''}`}
      aria-current={focused ? 'true' : undefined}
    >
      {/* Thread connector */}
      {depth > 0 && !focused && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-gray-700/30 to-transparent"
          style={{ marginLeft: `${(depth - 1) * 24}px` }}
        />
      )}

      <div className={`flex gap-3 ${depth > 0 && !focused ? 'ml-6' : ''}`}>
        {/* Avatar */}
        <Link href={`/u/${comment.author.handle}`}>
          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/20 hover:ring-cyan-500/40 transition-all">
            {comment.author.avatar ? (
              <Image
                src={comment.author.avatar}
                alt={comment.author.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-white font-semibold text-xs">
                {comment.author.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <Link href={`/u/${comment.author.handle}`}>
                <span className={`font-semibold text-white hover:text-cyan-400 transition-colors ${focused ? 'text-base' : 'text-sm'}`}>
                  {comment.author.displayName}
                </span>
              </Link>
              <Link href={`/u/${comment.author.handle}`}>
                <span className={`text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer ${focused ? 'text-sm' : 'text-xs'}`}>
                  @{comment.author.handle}
                </span>
              </Link>
              <span className="text-gray-500 text-xs">·</span>
              <Link href={commentUrl}>
                <time className="text-gray-500 text-xs hover:underline">
                  {formatTimestamp(comment.timestamp)}
                </time>
              </Link>
            </div>

            {/* Overflow menu */}
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full transition-colors"
                aria-label="Comment options"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
                    className="absolute right-0 top-8 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10"
                  >
                    {isOwnComment && (
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Comment
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleShare();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share Link
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Comment text */}
          <Link href={commentUrl}>
            <p className={`text-gray-100 mb-2 hover:text-white transition-colors ${focused ? 'text-base leading-relaxed' : 'text-sm'
              }`}>
              {renderTextWithHashtags(comment.content)}
            </p>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* React */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleReaction}
              className={`group flex items-center gap-1.5 ${comment.reacted ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'
                }`}
              aria-label="React to comment"
            >
              <motion.div
                animate={comment.reacted ? { scale: [1, 1.25, 1] } : {}}
                transition={{ duration: 0.18 }}
              >
                <PulseIcon
                  active={comment.reacted}
                  filled={comment.reacted}
                  className="w-4 h-4"
                />
              </motion.div>
              <span className="text-xs font-medium">{formatCount(comment.reactions)}</span>
            </motion.button>

            {/* Reply */}
            <button
              onClick={() => setShowReply(!showReply)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-purple-400 transition-colors"
              aria-label="Reply to comment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-xs font-medium">Reply</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors"
            >
              <SplineShareIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Share</span>
            </button>
          </div>

          {/* Reply composer */}
          {showReply && (
            <div className="mt-3 pl-4 border-l-2 border-cyan-500/30">
              <Composer
                onPost={handleReplySubmit}
              />
            </div>
          )}

          {/* View more in thread */}
          {hasMoreReplies && onViewThread && !focused && (
            <button
              onClick={() => onViewThread(comment.id)}
              className="mt-3 flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              View more in thread
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

