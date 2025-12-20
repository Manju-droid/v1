/**
 * Authentication utilities
 */
import { authAPI } from '@v/api-client';
import { useStore } from './store';

/**
 * Logout - clears auth cookie and redirects to home
 */
export async function logout(): Promise<void> {
  try {
    // Call logout API to clear HttpOnly cookie
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
      // Ignore errors - continue with client-side cleanup
    });

    // Clear all cookies
    if (typeof document !== 'undefined') {
      const hostname = window.location.hostname;
      const domains = [hostname, '.' + hostname, ''];
      domains.forEach(domain => {
        document.cookie = `v_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain ? `; domain=${domain}` : ''}`;
      });
    }

    // Clear local storage and in-memory token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      // Clear any other auth-related items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth') || key.includes('token') || key.includes('user')) {
          localStorage.removeItem(key);
        }
      });
    }

    authAPI.logout();

    // Clear store state
    useStore.getState().logout();

    // Clear currentUser module state
    try {
      const { updateCurrentUser } = await import('./currentUser');
      updateCurrentUser(null);
    } catch (e) {
      // Ignore if module not available
    }

    // Redirect to home
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect anyway
    window.location.href = '/';
  }
}

/**
 * Client-side check for auth cookie
 */
export function isAuthenticatedClient(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if v_auth cookie exists
  return document.cookie.split(';').some(cookie => {
    return cookie.trim().startsWith('v_auth=');
  });
}

