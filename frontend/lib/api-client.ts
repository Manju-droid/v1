/**
 * Legacy API Client for V Social App
 * 
 * ⚠️ DEPRECATED: Most APIs have been migrated to @v/api-client
 * 
 * This file is kept for backward compatibility and contains:
 * - Base request helper (used by some legacy code)
 * - Legacy authAPI, postAPI, hashtagAPI, notificationAPI (for backward compatibility)
 * 
 * New code should import from '@v/api-client' instead.
 * 
 * Migrated APIs (use @v/api-client):
 * - userAPI, analyticsAPI, moderationAPI (Phase 6)
 * - messageAPI, debateAPI, debateStatsAPI (Phase 5)
 * - notificationAPI, postAPI, hashtagAPI, authAPI (Phase 3-5)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Auth token management
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
}

// Request helper
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = 10000 // Default 10 seconds, can be overridden
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const error = await response.json();
        if (error && typeof error === 'object' && error.error) {
          errorMessage = String(error.error) || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      } catch (e) {
        // If JSON parsing fails, use default message
        errorMessage = `HTTP error! status: ${response.status}`;
      }

      // Ensure errorMessage is never empty
      if (!errorMessage || errorMessage.trim() === '') {
        errorMessage = `HTTP error! status: ${response.status}`;
      }

      // For 404 errors, create a more specific error that can be handled gracefully
      if (response.status === 404) {
        const notFoundError = new Error(errorMessage);
        (notFoundError as any).status = 404;
        (notFoundError as any).isNotFound = true;
        // Suppress console error for expected 404s (they're handled gracefully)
        (notFoundError as any).suppressConsole = true;
        throw notFoundError;
      }

      // For 401 errors, mark them so they can be handled gracefully
      if (response.status === 401) {
        const authError = new Error(errorMessage || 'Unauthorized');
        (authError as any).status = 401;
        (authError as any).isUnauthorized = true;
        throw authError;
      }

      throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    const data = await response.json();
    return data.data || data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    // Handle abort/timeout errors
    if (error.name === 'AbortError') {
      console.warn(`API request timed out: ${endpoint}`);
      throw new Error('Request timed out. Please try again.');
    }
    // If it's a network error (backend not available), provide a more helpful message
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.warn(`API request failed (backend may not be running): ${endpoint}`);
      throw new Error('Backend service unavailable. Please ensure the backend server is running.');
    }
    // Re-throw error (don't log here - let the caller decide if they want to log it)
    // Errors with suppressConsole flag should not be logged
    throw error;
  }
}

// ============================================================================
// AUTH API
// ============================================================================

export interface SignupRequest {
  name: string;
  handle: string;
  email: string;
  password: string;
  phoneNumber: string;
  language: string;
  bio?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: any;
}

export const authAPI = {
  signup: (data: SignupRequest) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginRequest) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<any>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ============================================================================
// POST API
// ============================================================================

export const postAPI = {
  list: async (params?: { limit?: number; offset?: number; authorId?: string }) => {
    const data = await request<any>(`/posts?${new URLSearchParams(params as any)}`);
    // Backend returns { posts: [...], limit: ..., offset: ... }
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.posts)) {
      return data.posts;
    }
    return [];
  },

  create: (post: any) =>
    request<any>('/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    }),

  get: async (id: string) => {
    try {
      return await request<any>(`/posts/${id}`);
    } catch (error: any) {
      // Handle 404 gracefully - post might not exist in backend but exists in local store
      if (error?.isNotFound || error?.status === 404 || error?.message?.includes('not found')) {
        console.warn(`Post ${id} not found in backend (may exist in local store)`);
        throw error; // Re-throw so caller can handle it
      }
      throw error;
    }
  },

  update: (id: string, updates: any) =>
    request<any>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (id: string) =>
    request(`/posts/${id}`, {
      method: 'DELETE',
    }),

  // Comments
  createComment: (postId: string, comment: any) =>
    request<any>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    }),

  getComments: async (postId: string) => {
    const data = await request<any>(`/posts/${postId}/comments`);
    return Array.isArray(data) ? data : [];
  },

  deleteComment: (postId: string, commentId: string) =>
    request(`/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // Reactions
  react: (postId: string, data: { userId: string; commentId?: string }) =>
    request(`/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  unreact: (postId: string, data: { userId: string; commentId?: string }) =>
    request(`/posts/${postId}/react`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),

  // Saves
  save: (postId: string, data: { userId: string }) =>
    request(`/posts/${postId}/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  unsave: (postId: string, data: { userId: string }) =>
    request(`/posts/${postId}/save`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),

  getSavedPosts: async (userId: string) => {
    const data = await request<any>(`/posts/saved?userId=${userId}`);
    return Array.isArray(data) ? data : [];
  },

  // Reporting
  report: (postId: string, reporterId: string) =>
    request(`/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reporterId }),
    }),
};

// ============================================================================
// HASHTAG API
// ============================================================================

export const hashtagAPI = {
  list: async () => {
    const data = await request<any>('/hashtags');
    console.log('[hashtagAPI.list] Raw API response:', data);
    
    // Backend returns { success: true, data: { hashtags: [...] } }
    // Or it might be direct { hashtags: [...] }
    let hashtags = [];
    if (data && data.hashtags && Array.isArray(data.hashtags)) {
      hashtags = data.hashtags;
    } else if (Array.isArray(data)) {
      hashtags = data;
    } else if (data && data.data && data.data.hashtags && Array.isArray(data.data.hashtags)) {
      hashtags = data.data.hashtags;
    }
    
    console.log('[hashtagAPI.list] Extracted hashtags:', hashtags.length);
    
    // Flatten the hashtag objects if they're wrapped in a "hashtag" field
    return hashtags.map((item: any) => {
      if (item.hashtag) {
        // Backend wraps each hashtag in a "hashtag" field with stats
        return {
          ...item.hashtag,
          boosts: item.boosts || 0,
          shouts: item.shouts || 0,
          momentum: item.momentum || 0,
        };
      }
      return item;
    });
  },

  create: (hashtag: any) =>
    request<any>('/hashtags', {
      method: 'POST',
      body: JSON.stringify(hashtag),
    }),

  getBySlug: (slug: string) => request<any>(`/hashtags/${slug}`),

  delete: (slug: string) =>
    request(`/hashtags/${slug}`, {
      method: 'DELETE',
    }),

  addPost: (slug: string, postId: string) =>
    request(`/hashtags/${slug}/posts`, {
      method: 'POST',
      body: JSON.stringify({ postId }),
    }),

  getPosts: async (slug: string) => {
    const data = await request<any>(`/hashtags/${slug}/posts`);
    return Array.isArray(data) ? data : [];
  },
};

// ============================================================================
// NOTIFICATION API
// ============================================================================

export const notificationAPI = {
  list: async (params?: { limit?: number; offset?: number }) => {
    try {
    const data = await request<any>(`/notifications?${new URLSearchParams(params as any)}`);
      console.log('[Notification API] Raw response:', data);
      // Handle both array and object with notifications property
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.notifications)) {
        return data.notifications;
      }
      return [];
    } catch (error) {
      console.error('[Notification API] Error fetching notifications:', error);
      throw error;
    }
  },

  create: (notification: any) =>
    request<any>('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    }),

  get: (id: string) => request<any>(`/notifications/${id}`),

  markAsRead: (id: string) =>
    request(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    request('/notifications/read-all', {
      method: 'POST',
    }),

  delete: (id: string) =>
    request(`/notifications/${id}`, {
      method: 'DELETE',
    }),

  getUnreadCount: () => request<{ count: number }>('/notifications/unread/count'),
};

// ============================================================================
// MIGRATED APIs
// ============================================================================
// The following APIs have been migrated to @v/api-client:
// - userAPI (migrated in Phase 6.1)
// - analyticsAPI (migrated in Phase 6.2)
// - moderationAPI (migrated in Phase 6.3)
// - messageAPI (migrated in Phase 5)
// - debateAPI (migrated in Phase 5)
// - debateStatsAPI (migrated in Phase 5)
// - notificationAPI (migrated in Phase 3)
// - postAPI (migrated in Phase 5)
// - hashtagAPI (migrated in Phase 5)
// - authAPI (migrated in Phase 5)
//
// Please import these from '@v/api-client' instead of this file.
// This file now only contains the base request helper and authAPI for backward compatibility.

