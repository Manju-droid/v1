'use client';

import React from 'react';

export const PostSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl shadow-md p-4 md:p-5 animate-pulse">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800/50" />
        <div className="flex-1">
          <div className="h-4 bg-gray-800/50 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-800/50 rounded w-24" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-800/50 rounded w-full" />
        <div className="h-4 bg-gray-800/50 rounded w-5/6" />
        <div className="h-4 bg-gray-800/50 rounded w-4/6" />
      </div>

      {/* Media placeholder (50% chance) */}
      {Math.random() > 0.5 && (
        <div className="h-64 bg-gray-800/30 rounded-xl mb-4" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
        <div className="h-8 bg-gray-800/50 rounded-lg w-16" />
        <div className="h-8 bg-gray-800/50 rounded-lg w-16" />
        <div className="h-8 bg-gray-800/50 rounded-lg w-16" />
        <div className="h-8 bg-gray-800/50 rounded-lg w-16 ml-auto" />
      </div>
    </div>
  );
};

