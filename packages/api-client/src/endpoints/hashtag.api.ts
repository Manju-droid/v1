/**
 * Hashtag API Endpoints
 * 
 * API client methods for hashtag operations.
 */

import { Hashtag, Post, CreateHashtagRequest, HashtagListParams } from '@v/shared';
import { apiClient } from '../client';

export const hashtagAPI = {
  /**
   * List hashtags with optional filters
   */
  list: async (params?: HashtagListParams): Promise<Hashtag[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.search) queryParams.append('search', params.search);

      const queryString = queryParams.toString();
      const endpoint = `/hashtags${queryString ? `?${queryString}` : ''}`;

      const data = await apiClient.get<any>(endpoint);

      // Handle both array and object with hashtags property
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.hashtags)) {
        return data.hashtags;
      }
      return [];
    } catch (error) {
      console.error('[Hashtag API] Error fetching hashtags:', error);
      throw error;
    }
  },

  /**
   * Get a single hashtag by slug
   */
  getBySlug: (slug: string): Promise<Hashtag> => {
    return apiClient.get<Hashtag>(`/hashtags/${slug}`);
  },

  /**
   * Create a new hashtag
   */
  create: (hashtag: CreateHashtagRequest): Promise<Hashtag> => {
    return apiClient.post<Hashtag>('/hashtags', hashtag);
  },

  /**
   * Delete a hashtag
   */
  delete: (slug: string): Promise<void> => {
    return apiClient.delete<void>(`/hashtags/${slug}`);
  },

  /**
   * Get posts for a hashtag
   */
  getPosts: async (slug: string, params?: { limit?: number; offset?: number }): Promise<Post[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const queryString = queryParams.toString();
      const endpoint = `/hashtags/${slug}/posts${queryString ? `?${queryString}` : ''}`;

      const data = await apiClient.get<any>(endpoint);

      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.posts)) {
        return data.posts;
      }
      return [];
    } catch (error) {
      console.error('[Hashtag API] Error fetching posts:', error);
      throw error;
    }
  },

  /**
   * Add a post to a hashtag
   */
  addPost: (slug: string, postId: string, isBoost: boolean): Promise<void> => {
    return apiClient.post<void>(`/hashtags/${slug}/posts`, { postId, isBoost });
  },

  /**
   * Follow a hashtag
   */
  follow: (slug: string): Promise<void> => {
    return apiClient.post<void>(`/hashtags/${slug}/follow`, {});
  },

  /**
   * Unfollow a hashtag
   */
  unfollow: (slug: string): Promise<void> => {
    return apiClient.delete<void>(`/hashtags/${slug}/follow`);
  },

  /**
   * Get trending hashtags
   */
  getTrending: async (): Promise<{
    trending_1h: Hashtag[];
    trending_24h: Hashtag[];
    trending_by_category_1h: Record<string, Hashtag[]>;
    trending_by_category_24h: Record<string, Hashtag[]>;
    popular_all_time: Hashtag[];
  }> => {
    return apiClient.get<any>('/hashtags/trending');
  },
};
