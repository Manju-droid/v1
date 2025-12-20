/**
 * Moderation API Endpoints
 * 
 * API client methods for moderation operations.
 */

import { request } from '../client';
import type {
  ModerationQueueItem,
  ReportPostRequest,
  RejectPostRequest,
  ModerationQueueParams,
} from '@v/shared';

/**
 * Get moderation queue
 */
export async function getModerationQueue(
  params?: ModerationQueueParams
): Promise<ModerationQueueItem[]> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const endpoint = `/moderation/queue${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const data = await request<any>(endpoint);
  
  // Backend returns { posts: [...], limit: ..., offset: ... }
  if (Array.isArray(data)) {
    return data;
  } else if (data && Array.isArray(data.posts)) {
    return data.posts;
  }
  return [];
}

/**
 * Report a post
 */
export async function reportPost(
  postId: string,
  data: ReportPostRequest
): Promise<void> {
  return request<void>(`/moderation/posts/${postId}/report`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Approve post
 */
export async function approvePost(postId: string): Promise<void> {
  return request<void>(`/moderation/posts/${postId}/approve`, {
    method: 'POST',
  });
}

/**
 * Reject post
 */
export async function rejectPost(
  postId: string,
  data?: RejectPostRequest
): Promise<void> {
  return request<void>(`/moderation/posts/${postId}/reject`, {
    method: 'POST',
    body: JSON.stringify(data || { applyPenalty: true }),
  });
}

/**
 * Moderation API object
 */
export const moderationAPI = {
  getQueue: getModerationQueue,
  reportPost,
  approvePost,
  rejectPost,
};


