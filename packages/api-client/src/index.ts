/**
 * @v/api-client - API Client Package
 * 
 * This package contains:
 * - Base HTTP client
 * - API endpoint modules
 * - Request/response types
 * 
 * Used by both web and mobile applications
 */

export * from './client';
export * from './endpoints';

// Export auth token management functions
export { setAuthToken, getAuthToken } from './client';
