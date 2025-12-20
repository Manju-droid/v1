// Current user management - syncs with profileStore
// This ensures uploaded avatar and user info appear throughout the app

import { MockUser } from './mock';

// Current user - will be synced from profileStore
// No default guest user - must be authenticated
let currentUser: MockUser | null = null;

// Get current user (synced from profileStore)
// Returns null if not authenticated
export const getCurrentUser = (): MockUser | null => {
  return currentUser;
};

// Sync current user from backend
export const syncCurrentUser = async (): Promise<void> => {
  try {
    const { authAPI } = await import('@v/api-client');

    try {
      // Get current authenticated user
      const response = await authAPI.getCurrentUser();
      // Backend returns user object directly for /auth/me, but { user, token } for login/signup
      const user = response.user || response;

      if (user && user.id) {
        currentUser = {
          id: user.id,
          displayName: user.name,
          handle: user.handle,
          avatar: user.avatarUrl,
          bio: user.bio || '',
        };
        console.log('✅ Synced current user:', currentUser.handle, currentUser.displayName, currentUser.id);
      } else {
        // No user found - clear current user
        console.log('❌ No user found in response, clearing current user');
        currentUser = null;
      }
    } catch (e: any) {
      // Clear current user on auth failure
      currentUser = null;
      // Log auth errors for debugging
      const isAuthError = e.isUnauthorized || 
          e.status === 401 ||
          e.message?.includes('Invalid email or password') ||
          e.message?.includes('Unauthorized') ||
          e.message?.includes('401') ||
          e.message?.includes('Authorization header required');
      
      if (isAuthError) {
        console.log('[currentUser] Auth error (expected if not logged in):', e.message);
      } else {
        console.warn('[currentUser] Failed to fetch current user:', e.message);
      }
    }
  } catch (error) {
    console.error('Failed to sync current user:', error);
  }
};

// Update current user (for when avatar/name/handle changes)
// If updates is null, clears the current user
export const updateCurrentUser = (updates: Partial<MockUser> | null): void => {
  if (updates === null) {
    currentUser = null;
  } else if (currentUser) {
  currentUser = { ...currentUser, ...updates };
  }
};

// Don't auto-sync on module load - let useAuth hook handle auth validation
// This prevents auto-login when the app starts
// syncCurrentUser() should only be called explicitly after login or when needed

