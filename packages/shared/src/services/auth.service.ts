/**
 * Authentication Service
 * 
 * Business logic for authentication.
 * Platform-agnostic - works on both web and mobile.
 */

import { LoginRequest, SignupRequest, ChangePasswordRequest } from '../domain/auth';
import { isValidEmail, isValidHandle } from '../utils';

export class AuthService {
  /**
   * Validate login request
   */
  static validateLoginRequest(request: LoginRequest): { valid: boolean; error?: string } {
    if (!request.email || !request.email.trim()) {
      return { valid: false, error: 'Email is required' };
    }

    if (!isValidEmail(request.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (!request.password || !request.password.trim()) {
      return { valid: false, error: 'Password is required' };
    }

    if (request.password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' };
    }

    return { valid: true };
  }

  /**
   * Validate signup request
   */
  static validateSignupRequest(request: SignupRequest): { valid: boolean; error?: string } {
    if (!request.name || !request.name.trim()) {
      return { valid: false, error: 'Name is required' };
    }

    if (request.name.length > 50) {
      return { valid: false, error: 'Name must be 50 characters or less' };
    }

    if (!request.handle || !request.handle.trim()) {
      return { valid: false, error: 'Handle is required' };
    }

    if (!isValidHandle(request.handle)) {
      return { valid: false, error: 'Handle must be 3-20 characters and contain only letters, numbers, underscores, and hyphens' };
    }

    if (!request.email || !request.email.trim()) {
      return { valid: false, error: 'Email is required' };
    }

    if (!isValidEmail(request.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (!request.password || !request.password.trim()) {
      return { valid: false, error: 'Password is required' };
    }

    if (request.password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' };
    }

    if (request.bio && request.bio.length > 160) {
      return { valid: false, error: 'Bio must be 160 characters or less' };
    }

    return { valid: true };
  }

  /**
   * Validate change password request
   */
  static validateChangePasswordRequest(request: ChangePasswordRequest): { valid: boolean; error?: string } {
    if (!request.currentPassword || !request.currentPassword.trim()) {
      return { valid: false, error: 'Current password is required' };
    }

    if (!request.newPassword || !request.newPassword.trim()) {
      return { valid: false, error: 'New password is required' };
    }

    if (request.newPassword.length < 6) {
      return { valid: false, error: 'New password must be at least 6 characters' };
    }

    if (request.currentPassword === request.newPassword) {
      return { valid: false, error: 'New password must be different from current password' };
    }

    return { valid: true };
  }

  /**
   * Format email (lowercase, trim)
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Format handle (lowercase, trim)
   */
  static normalizeHandle(handle: string): string {
    return handle.toLowerCase().trim();
  }
}
