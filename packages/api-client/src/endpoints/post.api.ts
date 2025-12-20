/**
 * Post API Endpoints
 * 
 * API client methods for post operations.
 */

import {
  Post,
  Comment,
  CreatePostRequest,
  CreateCommentRequest,
  PostListParams,
  PostMetrics
} from '@v/shared';
import { apiClient } from '../client';

export const postAPI = {
  /**
   * List posts with optional filters
   */
  list: async (params?: PostListParams): Promise<Post[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.userId) queryParams.append('userId', params.userId);
      if (params?.authorId) queryParams.append('authorId', params.authorId); // Support both
      if (params?.hashtag) queryParams.append('hashtag', params.hashtag);

      const queryString = queryParams.toString();
      const endpoint = `/posts${queryString ? `?${queryString}` : ''}`;

      const data = await apiClient.get<any>(endpoint);

      // Handle both array and object with posts property
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.posts)) {
        return data.posts;
      }
      return [];
    } catch (error) {
      console.error('[Post API] Error fetching posts:', error);
      throw error;
    }
  },

  /**
   * Get a single post by ID
   */
  get: (id: string): Promise<Post> => {
    return apiClient.get<Post>(`/posts/${id}`);
  },

  /**
   * Create a new post
   */
  create: (post: CreatePostRequest): Promise<Post> => {
    return apiClient.post<Post>('/posts', post);
  },

  /**
   * Update a post
   */
  update: (id: string, updates: Partial<Post>): Promise<Post> => {
    return apiClient.put<Post>(`/posts/${id}`, updates);
  },

  /**
   * Delete a post
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete<void>(`/posts/${id}`);
  },

  /**
   * Get comments for a post
   */
  getComments: async (postId: string): Promise<Comment[]> => {
    const data = await apiClient.get<any>(`/posts/${postId}/comments`);
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.comments)) {
      return data.comments;
    }
    return [];
  },

  /**
   * Create a comment on a post
   */
  createComment: (postId: string, comment: CreateCommentRequest): Promise<Comment> => {
    return apiClient.post<Comment>(`/posts/${postId}/comments`, comment);
  },

  /**
   * Delete a comment
   */
  deleteComment: (postId: string, commentId: string): Promise<void> => {
    return apiClient.delete<void>(`/posts/${postId}/comments/${commentId}`);
  },

  /**
   * React to a post
   */
  react: (postId: string, userId: string): Promise<void> => {
    return apiClient.post<void>(`/posts/${postId}/react`, { userId });
  },

  /**
   * Remove reaction from a post
   */
  unreact: (postId: string, userId: string): Promise<void> => {
    return apiClient.delete<void>(`/posts/${postId}/react`, { userId });
  },

  /**
   * Save a post
   */
  save: (postId: string, userId: string): Promise<void> => {
    return apiClient.post<void>(`/posts/${postId}/save`, { userId });
  },

  /**
   * Unsave a post
   */
  unsave: (postId: string, userId: string): Promise<void> => {
    return apiClient.delete<void>(`/posts/${postId}/save`, { userId });
  },

  /**
   * Get saved posts for a user
   */
  getSavedPosts: async (userId: string): Promise<Post[]> => {
    const data = await apiClient.get<any>(`/posts/saved?userId=${userId}`);
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.posts)) {
      return data.posts;
    }
    return [];
  },

  /**
   * Report a post
   */
  report: (postId: string, reason?: string): Promise<void> => {
    return apiClient.post<void>(`/posts/${postId}/report`, { reason });
  },

  /**
   * Get post metrics
   */
  getMetrics: (postId: string): Promise<PostMetrics> => {
    return apiClient.get<PostMetrics>(`/posts/${postId}/metrics`);
  },

  /**
   * Get post analytics
   */
  getAnalytics: (postId: string): Promise<any> => {
    return apiClient.get<any>(`/posts/${postId}/analytics`);
  },
};
