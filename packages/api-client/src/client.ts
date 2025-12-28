/**
 * Base API Client
 * 
 * Handles HTTP requests to the backend API.
 * Used by all API endpoint modules.
 */

import { getApiBaseUrl } from '@v/shared';

// Auth token management
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token && typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  } else if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
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
export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Log warning if auth is required but no token (for debugging)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[API Client] No auth token found for request:', endpoint);
    }
  }

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const error = await response.json();
        if (error && typeof error === 'object' && 'error' in error) {
          errorMessage = String((error as any).error) || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      } catch (e) {
        // If JSON parsing fails, use default message
      }

      if (response.status === 404) {
        const notFoundError = new Error(errorMessage);
        (notFoundError as any).status = 404;
        (notFoundError as any).isNotFound = true;
        throw notFoundError;
      }

      if (response.status === 401) {
        const authError = new Error(errorMessage || 'Unauthorized');
        (authError as any).status = 401;
        (authError as any).isUnauthorized = true;
        throw authError;
      }

      if (response.status === 403) {
        const forbiddenError = new Error(errorMessage || 'Forbidden');
        (forbiddenError as any).status = 403;
        (forbiddenError as any).isForbidden = true;
        (forbiddenError as any).isUnauthorized = false; // Distinguish from 401
        throw forbiddenError;
      }

      throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      // Handle backend response wrapper
      if (data && typeof data === 'object' && 'data' in data) {
        return data.data as T;
      }
      return data as T;
    }

    return {} as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// API Client methods
export const apiClient = {
  get: <T>(endpoint: string, timeout?: number) =>
    request<T>(endpoint, { method: 'GET' }, timeout),

  post: <T>(endpoint: string, data?: any, timeout?: number) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, timeout),

  put: <T>(endpoint: string, data?: any, timeout?: number) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, timeout),

  patch: <T>(endpoint: string, data?: any, timeout?: number) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }, timeout),

  delete: <T>(endpoint: string, data?: any, timeout?: number) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    }, timeout),
};
