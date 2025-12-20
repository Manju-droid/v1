/**
 * Debate Stats API Client
 *
 * API methods for debate statistics.
 */

import { request } from '../client';
import type {
  DebateTopicStats,
  RecordDebateStatsRequest,
} from '@v/shared';

/**
 * Record debate stats
 */
export async function recordDebateStats(
  data: RecordDebateStatsRequest
): Promise<DebateTopicStats> {
  return request<DebateTopicStats>('/debate-stats', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * List all debate stats
 */
export async function listDebateStats(): Promise<DebateTopicStats[]> {
  const data = await request<DebateTopicStats[]>('/debate-stats');
  return Array.isArray(data) ? data : [];
}

/**
 * Debate Stats API object
 */
export const debateStatsAPI = {
  record: recordDebateStats,
  list: listDebateStats,
};
