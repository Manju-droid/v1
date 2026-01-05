/**
 * Hashtag Domain Models
 * 
 * Types and interfaces for hashtags.
 */

import { Post } from './post';

export interface Hashtag {
  id: string;
  name: string;
  slug: string;
  category?: string;
  createdBy: string;
  postCount?: number;
  createdAt: Date | string;
}

export interface HashtagPost {
  hashtagId: string;
  postId: string;
  isBoost: boolean; // true for boost, false for shout
  createdAt: Date | string;
}

export interface CreateHashtagRequest {
  name: string;
  slug?: string;
  category?: string;
  createdBy: string;
}

export interface HashtagListParams {
  limit?: number;
  offset?: number;
  search?: string;
}
