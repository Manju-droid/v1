/**
 * Moderation Domain Models
 * 
 * Domain models for moderation operations.
 */

import type { Post } from './post';

export interface ModerationQueueItem extends Post {
  // Post already has all the fields we need
  // This is just a type alias for clarity
}

export interface ReportPostRequest {
  reporterId: string;
}

export interface RejectPostRequest {
  applyPenalty?: boolean;
}

export interface ModerationQueueParams {
  limit?: number;
  offset?: number;
}


