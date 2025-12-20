/**
 * Analytics API Endpoints
 * 
 * API client methods for analytics operations.
 */

import { request } from '../client';
import type {
  RecordImpressionRequest,
  PostAnalytics,
  AnalyticsPostMetrics,
} from '@v/shared';

/**
 * Record post impression
 */
export async function recordImpression(
  data: RecordImpressionRequest
): Promise<void> {
  return request<void>('/analytics/impression', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get post metrics
 */
export async function getPostMetrics(postId: string): Promise<AnalyticsPostMetrics> {
  return request<AnalyticsPostMetrics>(`/posts/${postId}/metrics`);
}

/**
 * Get post analytics
 */
export async function getPostAnalytics(postId: string): Promise<PostAnalytics> {
  return request<PostAnalytics>(`/posts/${postId}/analytics`);
}

/**
 * Analytics API object
 */
export const analyticsAPI = {
  recordImpression,
  getPostMetrics,
  getPostAnalytics,
};


