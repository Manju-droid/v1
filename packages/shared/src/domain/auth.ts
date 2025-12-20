/**
 * Authentication Domain Models
 * 
 * Types and interfaces for authentication.
 */

import { User } from './index';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  handle: string;
  email: string;
  password: string;
  phoneNumber?: string;
  language?: string;
  bio?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
