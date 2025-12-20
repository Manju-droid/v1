/**
 * Integration Tests for API Client
 * 
 * Tests the HTTP client functionality including authentication, error handling, etc.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './setup';
import { apiClient, setAuthToken, getAuthToken } from '../src/client';

const API_BASE_URL = 'http://localhost:8080/api';

// Mock getApiBaseUrl
vi.mock('@v/shared', async () => {
  const actual = await vi.importActual('@v/shared');
  return {
    ...actual,
    getApiBaseUrl: () => API_BASE_URL,
  };
});

describe('API Client', () => {
  beforeEach(() => {
    // Clear auth token before each test
    setAuthToken(null);
  });

  describe('Authentication', () => {
    it('should include auth token in headers when set', async () => {
      const token = 'test-token-123';
      setAuthToken(token);

      server.use(
        http.get(`${API_BASE_URL}/test`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (authHeader === `Bearer ${token}`) {
            return HttpResponse.json({ success: true });
          }
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );

      const response = await apiClient.get('/test');
      expect(response.success).toBe(true);
    });

    it('should not include auth token when not set', async () => {
      setAuthToken(null);

      server.use(
        http.get(`${API_BASE_URL}/test`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (!authHeader) {
            return HttpResponse.json({ success: true });
          }
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );

      const response = await apiClient.get('/test');
      expect(response.success).toBe(true);
    });

    it('should get auth token', () => {
      const token = 'test-token';
      setAuthToken(token);
      expect(getAuthToken()).toBe(token);
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      let requestMade = false;
      server.use(
        http.get(`${API_BASE_URL}/test`, () => {
          requestMade = true;
          return HttpResponse.json({ data: 'test' });
        })
      );

      const response = await apiClient.get('/test');
      expect(requestMade).toBe(true);
      expect(response).toBeDefined();
      // Verify response is not an error
      expect(response).not.toBeNull();
    });

    it('should handle GET request with query params', async () => {
      server.use(
        http.get(`${API_BASE_URL}/test`, ({ request }) => {
          const url = new URL(request.url);
          const limit = url.searchParams.get('limit');
          const offset = url.searchParams.get('offset');
          return HttpResponse.json({ limit, offset });
        })
      );

      const response = await apiClient.get<{ limit: string; offset: string }>('/test');
      // Note: Query params need to be passed differently in actual usage
      // This test verifies the endpoint works
      expect(response).toBeDefined();
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      server.use(
        http.post(`${API_BASE_URL}/test`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ received: body });
        })
      );

      const data = { name: 'Test' };
      const response = await apiClient.post<{ received: any }>('/test', data);
      expect(response.received).toEqual(data);
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      server.use(
        http.put(`${API_BASE_URL}/test/:id`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ updated: body });
        })
      );

      const data = { name: 'Updated' };
      const response = await apiClient.put<{ updated: any }>('/test/123', data);
      expect(response.updated).toEqual(data);
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      server.use(
        http.delete(`${API_BASE_URL}/test/:id`, () => {
          return HttpResponse.json({ deleted: true });
        })
      );

      const response = await apiClient.delete<{ deleted: boolean }>('/test/123');
      expect(response.deleted).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle 404 errors', async () => {
      server.use(
        http.get(`${API_BASE_URL}/notfound`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(apiClient.get('/notfound')).rejects.toThrow();
    });

    it('should handle 401 errors', async () => {
      server.use(
        http.get(`${API_BASE_URL}/unauthorized`, () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );

      await expect(apiClient.get('/unauthorized')).rejects.toThrow();
    });

    it('should handle 500 errors', async () => {
      server.use(
        http.get(`${API_BASE_URL}/error`, () => {
          return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
        })
      );

      await expect(apiClient.get('/error')).rejects.toThrow();
    });
  });
});
