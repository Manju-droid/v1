'use client';

import { useState, useEffect } from 'react';
import { isAuthenticatedClient } from '@/lib/auth';
import { authAPI } from '@v/api-client';
import { useStore } from '@/lib/store';

/**
 * Client-side auth hook
 * Returns whether user is authenticated based on cookie presence AND valid session
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      // Check for force logout flag in localStorage (set by clear button or query param)
      if (typeof window !== 'undefined') {
        const forceLogout = localStorage.getItem('force_logout');
        if (forceLogout === 'true') {
          console.log('[Auth] Force logout flag detected, clearing all auth data');
          await clearInvalidSession();
          localStorage.removeItem('force_logout');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
      }

      // Check both cookie and localStorage as fallback (Safari compatibility)
      const hasCookie = isAuthenticatedClient();
      const hasLocalStorageToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      
      console.log('[Auth] Checking auth state - hasCookie:', hasCookie, 'hasLocalStorageToken:', !!hasLocalStorageToken);
      
      if (!hasCookie && !hasLocalStorageToken) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Cookie or localStorage token exists, validate with server
      try {
        // Try to get current user profile to validate session
        // Use a timeout to prevent hanging
        const user = await Promise.race([
          authAPI.getCurrentUser(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth validation timeout')), 5000)
          )
        ]) as any;
        
        console.log('[Auth] Validated user from server:', user?.id, user?.handle, user?.name);
        
        if (user && user.id) {
          setIsAuthenticated(true);
          // Sync user to store after successful validation
          await useStore.getState().syncCurrentUser();
          // Ensure cookie is set (in case it was lost)
          if (!hasCookie && hasLocalStorageToken) {
            const token = localStorage.getItem('auth_token');
            if (token) {
              const expires = new Date();
              expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
              document.cookie = `v_auth=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure=${location.protocol === 'https:'}`;
            }
          }
        } else {
          // Session invalid, clear auth
          console.log('[Auth] Session invalid, logging out');
          await clearInvalidSession();
          setIsAuthenticated(false);
        }
      } catch (error: any) {
        // Only clear session on 401/403 errors, not on network errors or timeouts
        const isAuthError = error?.status === 401 || error?.status === 403 || 
                           error?.message?.includes('401') || error?.message?.includes('403') ||
                           error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden');
        
        if (isAuthError) {
          console.log('[Auth] Session validation failed (auth error):', error?.message);
          await clearInvalidSession();
          setIsAuthenticated(false);
        } else {
          // Network error or timeout - be more conservative
          // Only keep session if we can verify the token format is valid
          // Otherwise, clear it to prevent stale sessions
          console.log('[Auth] Session validation failed (network/timeout):', error?.message);
          
          // Check if token exists and looks valid (basic check)
          const token = hasLocalStorageToken ? localStorage.getItem('auth_token') : null;
          const hasValidTokenFormat = token && token.length > 20; // Basic validation
          
          if (hasValidTokenFormat) {
            // Token exists and looks valid, assume still authenticated (network issue)
            setIsAuthenticated(true);
            
            // Try to restore cookie from localStorage if cookie is missing (Safari fallback)
            if (!hasCookie && hasLocalStorageToken) {
              if (token) {
                const expires = new Date();
                expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
                document.cookie = `v_auth=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure=${location.protocol === 'https:'}`;
              }
            }
          } else {
            // No valid token, clear session
            console.log('[Auth] No valid token found, clearing session');
            await clearInvalidSession();
            setIsAuthenticated(false);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateAuth();
  }, []);

  return { isAuthenticated, isLoading };
}

/**
 * Clear invalid session without redirecting
 */
async function clearInvalidSession() {
  console.log('[Auth] Clearing all auth data...');
  
  // Clear all possible cookie variations
  if (typeof document !== 'undefined') {
    const hostname = window.location.hostname;
    const domains = [hostname, '.' + hostname, ''];
    
    domains.forEach(domain => {
      document.cookie = `v_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain ? `; domain=${domain}` : ''}`;
    });
    
    // Also try to clear all cookies that start with v_auth
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('v_auth')) {
        domains.forEach(domain => {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain ? `; domain=${domain}` : ''}`;
        });
      }
    });
  }
  
  // Clear localStorage token
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    // Also clear any other auth-related items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('auth') || key.includes('token') || key.includes('user')) {
        localStorage.removeItem(key);
      }
    });
  }
  
  authAPI.logout();
  
  // Clear store state
  try {
    useStore.getState().logout();
  } catch (e) {
    // Ignore if store not available
  }
  
  // Clear currentUser module state
  try {
    const { updateCurrentUser } = await import('@/lib/currentUser');
    updateCurrentUser(null); // Clear user
  } catch (e) {
    // Ignore if module not available
  }
  
  console.log('[Auth] All auth data cleared');
}

