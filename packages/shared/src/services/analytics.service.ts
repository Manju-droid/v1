/**
 * Analytics Service
 * 
 * Business logic and validation for analytics operations.
 */

import type {
  RecordImpressionRequest,
  PostAnalytics,
  AnalyticsPostMetrics,
} from '../domain/analytics';

/**
 * Validate record impression request
 */
export function validateRecordImpressionRequest(request: RecordImpressionRequest): {
  valid: boolean;
  error?: string;
} {
  if (!request.postId || request.postId.trim().length === 0) {
    return { valid: false, error: 'Post ID is required' };
  }

  if (!request.userId || request.userId.trim().length === 0) {
    return { valid: false, error: 'User ID is required' };
  }

  return { valid: true };
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(
  reactions: number,
  comments: number,
  saves: number,
  impressions: number
): number {
  if (impressions === 0) return 0;
  const totalEngagements = reactions + comments + saves;
  return (totalEngagements / impressions) * 100;
}

/**
 * Format engagement rate as percentage
 */
export function formatEngagementRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

/**
 * Format reach number (with K/M suffix)
 */
export function formatReach(reach: number): string {
  if (reach >= 1000000) {
    return `${(reach / 1000000).toFixed(1)}M`;
  }
  if (reach >= 1000) {
    return `${(reach / 1000).toFixed(1)}K`;
  }
  return reach.toString();
}

/**
 * Check if analytics data is valid
 */
export function isValidAnalytics(analytics: PostAnalytics | AnalyticsPostMetrics): boolean {
  return (
    analytics.reach_24h >= 0 &&
    analytics.reach_all >= 0 &&
    analytics.impressions >= 0 &&
    analytics.engagement >= 0
  );
}


