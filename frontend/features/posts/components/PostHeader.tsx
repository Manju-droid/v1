'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MockUser } from '@/lib/mock';
import { PostMenu } from './PostMenu';

interface PostHeaderProps {
  author: MockUser;
  showBackButton?: boolean;
  postId: string;
}

export const PostHeader: React.FC<PostHeaderProps> = ({ author, showBackButton = true, postId }) => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.04] lg:static sticky top-16 bg-[#0C1117] z-10 py-2 lg:py-0">
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        {showBackButton && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
        )}

        <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-gray-800/30 rounded-full min-w-0 flex-1 lg:flex-initial">
          <div className="relative w-6 h-6 flex-shrink-0 rounded-full overflow-hidden">
            {author.avatar ? (
              <Image
                src={author.avatar}
                alt={author.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-white font-bold text-xs">
                {author.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <span className="text-xs md:text-sm font-medium text-white truncate">{author.displayName}</span>
          <span className="text-xs text-gray-400 truncate hidden sm:inline">@{author.handle}</span>
        </div>
      </div>

      <PostMenu postId={postId} authorId={author.id} />
    </div>
  );
};

