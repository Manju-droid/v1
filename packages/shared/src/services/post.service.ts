/**
 * Post Service
 * 
 * Business logic for posts.
 * Platform-agnostic - works on both web and mobile.
 */

import { Post, CreatePostRequest, CreateCommentRequest, PostStatus } from '../domain/post';
import { POST_MAX_LENGTH, POST_MEDIA_LIMIT } from '../constants';

export class PostService {
  /**
   * Validate create post request
   */
  static validateCreatePost(request: CreatePostRequest): { valid: boolean; error?: string } {
    if (!request.authorId || !request.authorId.trim()) {
      return { valid: false, error: 'Author ID is required' };
    }

    if (!request.content || !request.content.trim()) {
      return { valid: false, error: 'Content is required' };
    }

    if (request.content.length > POST_MAX_LENGTH) {
      return { valid: false, error: `Content must be ${POST_MAX_LENGTH} characters or less` };
    }

    if (request.mediaUrl && !request.mediaType) {
      return { valid: false, error: 'Media type is required when media URL is provided' };
    }

    if (request.mediaType && !['image', 'video'].includes(request.mediaType)) {
      return { valid: false, error: 'Media type must be "image" or "video"' };
    }

    if (request.commentLimit !== undefined && request.commentLimit < 0) {
      return { valid: false, error: 'Comment limit must be non-negative' };
    }

    return { valid: true };
  }

  /**
   * Validate create comment request
   */
  static validateCreateComment(request: CreateCommentRequest): { valid: boolean; error?: string } {
    if (!request.postId || !request.postId.trim()) {
      return { valid: false, error: 'Post ID is required' };
    }

    if (!request.authorId || !request.authorId.trim()) {
      return { valid: false, error: 'Author ID is required' };
    }

    if (!request.content || !request.content.trim()) {
      return { valid: false, error: 'Content is required' };
    }

    if (request.content.length > 1000) {
      return { valid: false, error: 'Comment must be 1000 characters or less' };
    }

    return { valid: true };
  }

  /**
   * Check if post is visible
   */
  static isVisible(post: Post): boolean {
    return post.status === 'VISIBLE';
  }

  /**
   * Check if post is hidden
   */
  static isHidden(post: Post): boolean {
    return post.status === 'TEMP_HIDDEN' || post.status === 'REMOVED';
  }

  /**
   * Check if post has media
   */
  static hasMedia(post: Post): boolean {
    return !!post.mediaUrl && !!post.mediaType;
  }

  /**
   * Check if comments are enabled
   */
  static areCommentsEnabled(post: Post): boolean {
    return !post.commentsDisabled;
  }

  /**
   * Check if comment limit is reached
   */
  static isCommentLimitReached(post: Post): boolean {
    if (!post.commentLimit) return false;
    return post.commentCount >= post.commentLimit;
  }

  /**
   * Format post content (truncate if needed)
   */
  static formatContent(post: Post, maxLength: number = 200): string {
    if (post.content.length <= maxLength) return post.content;
    return post.content.slice(0, maxLength) + '...';
  }

  /**
   * Sort posts by date (newest first)
   */
  static sortByDate(posts: Post[]): Post[] {
    return [...posts].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Sort posts by engagement (reactions + comments)
   */
  static sortByEngagement(posts: Post[]): Post[] {
    return [...posts].sort((a, b) => {
      const engagementA = a.reactionCount + a.commentCount;
      const engagementB = b.reactionCount + b.commentCount;
      return engagementB - engagementA;
    });
  }

  /**
   * Filter visible posts
   */
  static filterVisible(posts: Post[]): Post[] {
    return posts.filter(p => this.isVisible(p));
  }
}
