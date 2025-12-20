/**
 * Authentication Store
 * 
 * Zustand store for managing authentication state in the mobile app.
 */

import { create } from 'zustand';
import { authAPI, setAuthToken } from '@v/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatar?: string;
  bio?: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    name: string;
    handle: string;
    email: string;
    password: string;
    phoneNumber: string;
    language: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AUTH_TOKEN_KEY = '@v/auth_token';
const USER_KEY = '@v/user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authAPI.login({ email, password });
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      
      // Set token in API client
      setAuthToken(response.token);
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Login failed. Please try again.';
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
      });
      throw error;
    }
  },

  signup: async (data) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authAPI.signup(data);
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      
      // Set token in API client
      setAuthToken(response.token);
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Signup failed. Please try again.';
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      
      // Clear token in API client
      setAuthToken(null);
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear state even if storage fails
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      // Small delay to ensure React Native is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const userStr = await AsyncStorage.getItem(USER_KEY);
      
      if (!token || !userStr) {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
        });
        return;
      }
      
      // Set token in API client
      setAuthToken(token);
      
      // Verify token is still valid by fetching current user
      try {
        const user = await authAPI.getCurrentUser();
        
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        // Token is invalid, clear it
        try {
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          await AsyncStorage.removeItem(USER_KEY);
        } catch (e) {
          // Ignore storage errors
        }
        authAPI.logout();
        
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
