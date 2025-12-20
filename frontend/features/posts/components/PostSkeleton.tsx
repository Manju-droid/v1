'use client';

import React from 'react';

export const PostSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-700/50 rounded-full" />
          <div className="h-8 w-48 bg-gray-700/50 rounded-full" />
        </div>
        <div className="w-9 h-9 bg-gray-700/50 rounded-full" />
      </div>

      {/* Post content skeleton */}
      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <div className="h-4 bg-gray-700/50 rounded w-full" />
          <div className="h-4 bg-gray-700/50 rounded w-5/6" />
          <div className="h-4 bg-gray-700/50 rounded w-4/6" />
        </div>
        
        {/* Media skeleton */}
        <div className="aspect-video bg-gray-700/50 rounded-xl" />
        
        {/* Actions skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-24 bg-gray-700/50 rounded-lg" />
          <div className="h-10 w-24 bg-gray-700/50 rounded-lg" />
          <div className="h-10 w-24 bg-gray-700/50 rounded-lg" />
        </div>
      </div>

      {/* Composer skeleton */}
      <div className="h-32 bg-gray-700/50 rounded-xl mb-6" />

      {/* Comments skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-9 h-9 bg-gray-700/50 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-700/50 rounded w-32" />
              <div className="h-4 bg-gray-700/50 rounded w-full" />
              <div className="h-4 bg-gray-700/50 rounded w-4/6" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-700/50 rounded" />
                <div className="h-6 w-16 bg-gray-700/50 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CommentSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse flex gap-3">
      <div className="w-9 h-9 bg-gray-700/50 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-700/50 rounded w-32" />
        <div className="h-4 bg-gray-700/50 rounded w-full" />
        <div className="h-4 bg-gray-700/50 rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-gray-700/50 rounded" />
          <div className="h-6 w-16 bg-gray-700/50 rounded" />
        </div>
      </div>
    </div>
  );
};

