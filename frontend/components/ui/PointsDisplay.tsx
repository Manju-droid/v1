'use client';

import React from 'react';
import { UserTier } from '@/features/users';
import { TierBadge } from './TierBadge';

interface PointsDisplayProps {
  points: number;
  tier: UserTier;
  subscriptionActive?: boolean;
  loginStreak?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
  points,
  tier,
  subscriptionActive = false,
  loginStreak = 0,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const pointsToNextTier = tier === 'SILVER' ? 1000 - points : 0;

  return (
    <div className={`flex flex-col gap-2 ${sizeClasses[size]}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Points:</span>
          <span className="font-bold text-white">{points.toLocaleString()}</span>
        </div>
        <TierBadge tier={tier} size={size === 'sm' ? 'sm' : 'md'} />
        {subscriptionActive && (
          <span className="text-xs text-purple-400 font-medium">Subscribed</span>
        )}
      </div>
      
      {tier === 'SILVER' && pointsToNextTier > 0 && (
        <div className="text-xs text-gray-500">
          {pointsToNextTier} points until Platinum
        </div>
      )}
      
      {loginStreak > 0 && (
        <div className="text-xs text-teal-400">
          🔥 {loginStreak} day streak
        </div>
      )}
    </div>
  );
};

