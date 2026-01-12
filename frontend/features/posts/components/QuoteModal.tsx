'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { MockPost, formatTimestamp, formatCount } from '@/lib/mock';

interface QuoteModalProps {
  post: MockPost;
  onClose: () => void;
  onSubmit?: (quoteContent: string) => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({ post, onClose, onSubmit }) => {
  const [content, setContent] = useState('');
  const maxChars = 280;
  const remaining = maxChars - content.length;

  const handleSubmit = () => {
    if (content.trim() && onSubmit) {
      onSubmit(content.trim());
      setContent('');
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 p-4"
      >
        <div className="bg-gray-900 border border-white/[0.06] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <h2 className="text-xl font-bold text-white">Quote Post</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Your quote input */}
            <div className="flex gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/20">
                <Image
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=CurrentUser"
                  alt="Your avatar"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Add your thoughts..."
                  className="w-full bg-transparent text-gray-100 placeholder-gray-500 text-base resize-none focus:outline-none min-h-[100px]"
                  maxLength={maxChars}
                  autoFocus
                />
              </div>
            </div>

            {/* Original post (quoted) */}
            <div className="border border-white/[0.06] rounded-xl p-4 bg-gray-800/30">
              <div className="flex items-start gap-3 mb-2">
                <Link
                  href={`/u/${post.author.handle}`}
                  className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 hover:ring-2 ring-cyan-500/40 transition-all cursor-pointer"
                >
                  {post.author.avatar ? (
                    <Image
                      src={post.author.avatar}
                      alt={post.author.displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-white font-semibold text-xs">
                      {post.author.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link
                      href={`/u/${post.author.handle}`}
                      className="font-semibold text-white text-sm hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      {post.author.displayName}
                    </Link>
                    <Link
                      href={`/u/${post.author.handle}`}
                      className="text-gray-400 text-xs hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      @{post.author.handle}
                    </Link>
                    <span className="text-gray-500 text-xs">·</span>
                    <time className="text-gray-500 text-xs">
                      {formatTimestamp(post.timestamp)}
                    </time>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 text-sm line-clamp-3">{post.content}</p>
              {post.media && post.media.length > 0 && (
                <div className="mt-3 rounded-lg overflow-hidden relative aspect-video max-h-48">
                  <Image
                    src={post.media[0].url}
                    alt="Post media"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-5 border-t border-white/[0.06]">
            <span
              className={`text-xs ${remaining < 20
                ? remaining < 0
                  ? 'text-red-400'
                  : 'text-yellow-400'
                : 'text-gray-500'
                }`}
            >
              {remaining < 50 && `${remaining} characters remaining`}
            </span>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg font-medium text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!content.trim() || remaining < 0}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${content.trim() && remaining >= 0
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:shadow-lg hover:shadow-cyan-500/30'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Quote
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

