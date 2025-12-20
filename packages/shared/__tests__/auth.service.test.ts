/**
 * Unit Tests for Auth Service
 */

import { describe, it, expect } from 'vitest';
import { AuthService } from '../src/services/auth.service';
import type { LoginRequest, SignupRequest, ChangePasswordRequest } from '../src/domain/auth';

describe('AuthService.validateLoginRequest', () => {
  it('should validate correct login request', () => {
    const request: LoginRequest = {
      email: 'user@example.com',
      password: 'password123',
    };
    const result = AuthService.validateLoginRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing email', () => {
    const request: LoginRequest = {
      email: '',
      password: 'password123',
    };
    const result = AuthService.validateLoginRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Email');
  });

  it('should reject invalid email format', () => {
    const request: LoginRequest = {
      email: 'invalid-email',
      password: 'password123',
    };
    const result = AuthService.validateLoginRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('email');
  });

  it('should reject missing password', () => {
    const request: LoginRequest = {
      email: 'user@example.com',
      password: '',
    };
    const result = AuthService.validateLoginRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Password');
  });

  it('should reject password too short', () => {
    const request: LoginRequest = {
      email: 'user@example.com',
      password: '12345', // Less than 6 characters
    };
    const result = AuthService.validateLoginRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 6 characters');
  });

  it('should accept password with exactly 6 characters', () => {
    const request: LoginRequest = {
      email: 'user@example.com',
      password: '123456',
    };
    const result = AuthService.validateLoginRequest(request);
    expect(result.valid).toBe(true);
  });
});

describe('AuthService.validateSignupRequest', () => {
  it('should validate correct signup request', () => {
    const request: SignupRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing name', () => {
    const request: SignupRequest = {
      name: '',
      handle: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Name');
  });

  it('should reject name too long', () => {
    const request: SignupRequest = {
      name: 'A'.repeat(51),
      handle: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('50 characters');
  });

  it('should reject missing handle', () => {
    const request: SignupRequest = {
      name: 'John Doe',
      handle: '',
      email: 'john@example.com',
      password: 'password123',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Handle');
  });

  it('should reject invalid handle', () => {
    const request: SignupRequest = {
      name: 'John Doe',
      handle: 'ab', // Too short
      email: 'john@example.com',
      password: 'password123',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Handle');
  });

  it('should reject invalid email', () => {
    const request: SignupRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'invalid-email',
      password: 'password123',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('email');
  });

  it('should reject missing password', () => {
    const request: SignupRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'john@example.com',
      password: '',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Password');
  });

  it('should reject password too short', () => {
    const request: SignupRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'john@example.com',
      password: '12345',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 6 characters');
  });

  it('should reject bio too long', () => {
    const request: SignupRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      bio: 'A'.repeat(161),
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('160 characters');
  });

  it('should accept valid bio', () => {
    const request: SignupRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      bio: 'This is a valid bio',
    };
    const result = AuthService.validateSignupRequest(request);
    expect(result.valid).toBe(true);
  });
});

describe('AuthService.validateChangePasswordRequest', () => {
  it('should validate correct change password request', () => {
    const request: ChangePasswordRequest = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123',
    };
    const result = AuthService.validateChangePasswordRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing current password', () => {
    const request: ChangePasswordRequest = {
      currentPassword: '',
      newPassword: 'newpassword123',
    };
    const result = AuthService.validateChangePasswordRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Current password');
  });

  it('should reject missing new password', () => {
    const request: ChangePasswordRequest = {
      currentPassword: 'oldpassword',
      newPassword: '',
    };
    const result = AuthService.validateChangePasswordRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('New password');
  });

  it('should reject new password too short', () => {
    const request: ChangePasswordRequest = {
      currentPassword: 'oldpassword',
      newPassword: '12345',
    };
    const result = AuthService.validateChangePasswordRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 6 characters');
  });

  it('should reject when new password equals current password', () => {
    const request: ChangePasswordRequest = {
      currentPassword: 'samepassword',
      newPassword: 'samepassword',
    };
    const result = AuthService.validateChangePasswordRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('different');
  });
});
