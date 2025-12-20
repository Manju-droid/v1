/**
 * Authentication API Endpoints
 * 
 * API client methods for authentication operations.
 */

import { LoginRequest, SignupRequest, AuthResponse, ChangePasswordRequest } from '@v/shared';
import { apiClient, setAuthToken } from '../client';

export const authAPI = {
  /**
   * Sign up a new user
   */
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    
    // Automatically set auth token on successful signup
    if (response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },

  /**
   * Log in an existing user
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    
    // Automatically set auth token on successful login
    if (response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: (): Promise<any> => {
    return apiClient.get<any>('/auth/me');
  },

  /**
   * Change password
   */
  changePassword: (data: ChangePasswordRequest): Promise<void> => {
    return apiClient.post<void>('/auth/change-password', data);
  },

  /**
   * Logout (clear token)
   */
  logout: (): void => {
    setAuthToken(null);
  },
};
