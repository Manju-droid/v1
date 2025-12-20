/**
 * Test Setup for API Client
 * 
 * This file sets up MSW (Mock Service Worker) for API mocking in tests.
 */

import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Create a mock server instance
export const server = setupServer();

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Export common mock handlers
export const handlers = [
  // Add common mock handlers here
];
