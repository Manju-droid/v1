/**
 * Shared TypeScript Types
 * 
 * Common types used across the application.
 */

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Common types
export type ID = string;
export type Timestamp = Date | string;

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error';
