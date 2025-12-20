/**
 * Post Domain Models
 * 
 * Types and interfaces for posts, comments, and reactions.
 */

export type PostStatus = 'VISIBLE' | 'ABUSIVE_FLAG' | 'TEMP_HIDDEN' | 'REMOVED';

export type MediaType = 'image' | 'video';

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaType?: MediaType;
  mediaUrl?: string;
  commentsDisabled: boolean;
  commentLimit?: number;
  reactionCount: number;
  commentCount: number;
  saveCount: number;
  reach24h?: number;
  reachAll?: number;
  status: PostStatus;
  reportCount?: number;
  inModerationQueue?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Reaction {
  userId: string;
  postId: string;
  commentId?: string;
  createdAt: Date | string;
}

export interface SavedPost {
  userId: string;
  postId: string;
  createdAt: Date | string;
}

export interface CreatePostRequest {
  authorId: string;
  content: string;
  mediaType?: MediaType;
  mediaUrl?: string;
  commentsDisabled?: boolean;
  commentLimit?: number;
  isHashtagPost?: boolean;
}

export interface CreateCommentRequest {
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
}

export interface PostListParams {
  limit?: number;
  offset?: number;
  userId?: string;
  authorId?: string; // Alias for userId (for backward compatibility)
  hashtag?: string;
}

export interface PostMetrics {
  reach24h: number;
  reachAll: number;
  reactionCount: number;
  commentCount: number;
  saveCount: number;
}
