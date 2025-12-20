'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { EmojiPicker } from './EmojiPicker';
import { useStore, getCurrentUserMock, currentUserMock } from '@/lib/store';
import { syncCurrentUser } from '@/lib/currentUser';
import { updateUserProfile, getUser, useUserStore } from '@/features/users';
import { checkAbusiveContent } from '@/lib/abuse-detection';

interface ComposerProps {
  onPost?: (content: string, media?: { type: 'image' | 'video'; file: File }, options?: { commentsDisabled?: boolean; commentLimit?: number }) => void;
  isMobile?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({ onPost, isMobile = false }) => {
  const { userCommentPreferences, setUserCommentPreferences } = useStore();
  const { userPoints } = useUserStore();
  const [currentUser, setCurrentUser] = useState(getCurrentUserMock());
  const [isSynced, setIsSynced] = useState(false);
  
  const [content, setContent] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{ type: 'image' | 'video'; file: File; preview: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCommentSettings, setShowCommentSettings] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(userCommentPreferences.commentsDisabled);
  const [commentLimit, setCommentLimit] = useState<number | undefined>(userCommentPreferences.commentLimit);
  const [followersOnlyComments, setFollowersOnlyComments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // Check for abusive content
  const isAbusive = content.trim() ? checkAbusiveContent(content) : false;
  const isMuted = !!(userPoints?.temporarilyMuted && userPoints.mutedUntil && new Date(userPoints.mutedUntil) > new Date());
  
  // Sync current user on mount
  useEffect(() => {
    syncCurrentUser().then(() => {
      setCurrentUser(getCurrentUserMock());
      setIsSynced(true);
    });
  }, []);

  // Load user's followersOnlyComments setting
  useEffect(() => {
    if (isSynced && currentUserMock?.handle) {
      getUser(currentUserMock.handle).then(profile => {
        if (profile) {
          setFollowersOnlyComments(profile.followersOnlyComments || false);
        }
      });
    }
  }, [isSynced]);
  
  const maxChars = 280;
  const remaining = maxChars - content.length;
  
  // Sync local state with store preferences
  useEffect(() => {
    setCommentsDisabled(userCommentPreferences.commentsDisabled);
    setCommentLimit(userCommentPreferences.commentLimit);
  }, [userCommentPreferences]);

  const handlePost = () => {
    if (content.trim() && onPost) {
      onPost(
        content.trim(), 
        attachedMedia ? { type: attachedMedia.type, file: attachedMedia.file } : undefined,
        { commentsDisabled, commentLimit }
      );
      setContent('');
      setAttachedMedia(null);
      // DON'T reset comment settings - they persist
      // setCommentsDisabled(false);
      // setCommentLimit(undefined);
      // setShowCommentSettings(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && content.trim()) {
      handlePost();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setAttachedMedia({ type: 'image', file, preview });
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const preview = URL.createObjectURL(file);
      setAttachedMedia({ type: 'video', file, preview });
    }
  };

  const removeMedia = () => {
    if (attachedMedia) {
      URL.revokeObjectURL(attachedMedia.preview);
      setAttachedMedia(null);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setContent(content + emoji);
    }
  };

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      if (attachedMedia) {
        URL.revokeObjectURL(attachedMedia.preview);
      }
    };
  }, [attachedMedia]);

  return (
    <motion.div
      initial={isMobile ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 20 }}
      animate={isMobile ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl shadow-md p-4 md:p-5"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/20 bg-gray-800">
          {isSynced && currentUser?.avatar ? (
            <Image
              src={currentUser.avatar}
              alt={currentUser.displayName || 'User'}
              fill
              className="object-cover"
              key={currentUser.avatar} // Force re-render when avatar changes
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            className="w-full bg-transparent text-gray-100 placeholder-gray-500 text-sm md:text-base resize-none focus:outline-none focus:ring-0 focus:border-0 focus:border-transparent min-h-[80px] md:min-h-[100px]"
            style={{ outline: 'none', border: 'none' }}
            maxLength={maxChars}
            aria-label="Post content"
          />

          {/* Media Preview */}
          <AnimatePresence>
            {attachedMedia && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative mt-3 rounded-xl overflow-hidden bg-gray-800/30 border border-white/[0.06]"
              >
                {attachedMedia.type === 'image' ? (
                  <div className="relative w-full aspect-video">
                    <Image
                      src={attachedMedia.preview}
                      alt="Attached image"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <video
                    src={attachedMedia.preview}
                    controls
                    className="w-full aspect-video"
                  />
                )}
                
                {/* Remove button */}
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-gray-900/80 hover:bg-gray-900 text-white rounded-full transition-colors"
                  aria-label="Remove media"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comment Settings Panel */}
          <AnimatePresence>
            {showCommentSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-gray-800/40 rounded-lg border border-white/[0.06] space-y-3"
              >
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Comment Settings</h4>
                
                {/* Disable Comments Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-200">Disable Comments</p>
                    <p className="text-xs text-gray-500">Turn off commenting on this post</p>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !commentsDisabled;
                      setCommentsDisabled(newValue);
                      setUserCommentPreferences({ commentsDisabled: newValue });
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      commentsDisabled ? 'bg-cyan-500' : 'bg-gray-700'
                    }`}
                  >
                    <motion.div
                      animate={{ x: commentsDisabled ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full"
                    />
                  </button>
                </div>
                
                {/* Followers Only Comments Toggle */}
                {!commentsDisabled && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-t border-white/[0.06] pt-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-200">Followers Only Comments</p>
                        <p className="text-xs text-gray-500">Only your followers can comment</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !followersOnlyComments;
                          setFollowersOnlyComments(newValue);
                          try {
                            await updateUserProfile({ followersOnlyComments: newValue });
                          } catch (error) {
                            console.error('Failed to update followers only comments setting:', error);
                            // Revert on error
                            setFollowersOnlyComments(!newValue);
                          }
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          followersOnlyComments ? 'bg-cyan-500' : 'bg-gray-700'
                        }`}
                      >
                        <motion.div
                          animate={{ x: followersOnlyComments ? 20 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full"
                        />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Comment Limit */}
                {!commentsDisabled && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-200">Comment Limit</p>
                        <p className="text-xs text-gray-500">Max number of comments allowed</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="9999"
                        placeholder="No limit"
                        value={commentLimit || ''}
                        onChange={(e) => {
                          const newValue = e.target.value ? parseInt(e.target.value) : undefined;
                          setCommentLimit(newValue);
                          setUserCommentPreferences({ commentLimit: newValue });
                        }}
                        className="w-20 px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Abuse Warning */}
          {isAbusive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-2"
            >
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 text-sm font-medium">Inappropriate content detected</p>
                <p className="text-red-300/80 text-xs mt-1">
                  This post contains language that may violate our community guidelines. Posting may result in point penalties.
                </p>
              </div>
            </motion.div>
          )}

          {/* Mute Warning */}
          {isMuted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-start gap-2"
            >
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-yellow-400 text-sm font-medium">You are temporarily muted</p>
                <p className="text-yellow-300/80 text-xs mt-1">
                  You cannot post until {userPoints.mutedUntil ? new Date(userPoints.mutedUntil).toLocaleString() : 'later'}.
                </p>
              </div>
            </motion.div>
          )}

          {/* Actions bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
            <div className="flex items-center gap-2 relative">
              {/* Hidden file inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />

              {/* Image attachment button */}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={!!attachedMedia}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Attach image"
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {/* Video attachment button */}
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={!!attachedMedia}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Attach video"
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {/* Emoji button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                aria-label="Add emoji"
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
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Emoji Picker */}
              <EmojiPicker
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onEmojiSelect={handleEmojiSelect}
              />

              {/* Comment Settings button */}
              <button
                onClick={() => setShowCommentSettings(!showCommentSettings)}
                className={`w-8 h-8 flex items-center justify-center ${
                  commentsDisabled || commentLimit 
                    ? 'text-cyan-400 bg-cyan-500/20' 
                    : 'text-gray-400 hover:text-teal-400 hover:bg-teal-500/10'
                } rounded-lg transition-colors`}
                aria-label="Comment settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Character counter */}
              <span
                className={`text-xs ${
                  remaining < 20
                    ? remaining < 0
                      ? 'text-red-400'
                      : 'text-yellow-400'
                    : 'text-gray-500'
                }`}
              >
                {remaining < 50 && remaining}
              </span>
            </div>

            {/* Post button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePost}
              disabled={!content.trim() || remaining < 0 || isMuted}
              className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                content.trim() && remaining >= 0 && !isMuted
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:shadow-lg hover:shadow-cyan-500/30'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isMuted ? 'Muted' : 'Post'}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

