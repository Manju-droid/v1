/**
 * Constants
 * 
 * Shared constants used across the application.
 */

// API Configuration
// Note: process.env is handled at build time by the consuming application
export const getApiBaseUrl = (): string => {
  // Check for environment variable first (highest priority)
  if (typeof process !== 'undefined') {
    // For React Native/Expo, check EXPO_PUBLIC_API_URL
    if (process.env?.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    // For Next.js/web, check NEXT_PUBLIC_API_URL
    if (process.env?.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
  }
  
  // For React Native, try to detect and use Mac's IP
  // This is a runtime check, so it's safe for TypeScript
  try {
    // @ts-ignore - navigator may not exist in all environments
    if (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative') {
      // Default to Mac's IP for React Native (update 10.0.0.171 to your Mac's actual IP)
      // Users should set EXPO_PUBLIC_API_URL environment variable for their setup
      return 'http://10.0.0.171:8080/api';
    }
  } catch (e) {
    // Ignore errors in non-browser environments
  }
  
  // Default fallback for web/Node.js
  return 'http://localhost:8080/api';
};

// Debates
export const DEBATE_DURATIONS = {
  SHORT: 30,      // 30 minutes
  MEDIUM: 60,     // 1 hour
  LONG: 360,      // 6 hours
  EXTENDED: 1440, // 24 hours
} as const;

export const DEBATE_STATUS = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
} as const;

export const DEBATE_TYPES = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const;

// Posts
export const POST_MAX_LENGTH = 500;
export const POST_MEDIA_LIMIT = 4;

// User
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
export const NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 160;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
