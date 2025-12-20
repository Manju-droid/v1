/**
 * Unit Tests for User Service
 */

import { describe, it, expect } from 'vitest';
import {
  validateCreateUserRequest,
  validateUpdateUserRequest,
  validateFollowUserRequest,
  validateUserListParams,
  isFollowing,
  getUserDisplayName,
  getUserAvatarUrl,
  formatFollowerCount,
  canHostDebate,
} from '../src/services/user.service';
import type { User, CreateUserRequest, UpdateUserRequest } from '../src/domain/user';

describe('validateCreateUserRequest', () => {
  it('should validate correct user request', () => {
    const request: CreateUserRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'john@example.com',
      bio: 'Test bio',
    };
    const result = validateCreateUserRequest(request);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject missing name', () => {
    const request: CreateUserRequest = {
      name: '',
      handle: 'johndoe',
      email: 'john@example.com',
    };
    const result = validateCreateUserRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Name is required');
  });

  it('should reject name too short', () => {
    const request: CreateUserRequest = {
      name: 'J',
      handle: 'johndoe',
      email: 'john@example.com',
    };
    const result = validateCreateUserRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 2 characters');
  });

  it('should reject name too long', () => {
    const request: CreateUserRequest = {
      name: 'A'.repeat(51),
      handle: 'johndoe',
      email: 'john@example.com',
    };
    const result = validateCreateUserRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('less than 50 characters');
  });

  it('should reject invalid handle', () => {
    const request: CreateUserRequest = {
      name: 'John Doe',
      handle: 'ab', // Too short
      email: 'john@example.com',
    };
    const result = validateCreateUserRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Handle');
  });

  it('should reject invalid email', () => {
    const request: CreateUserRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'invalid-email',
    };
    const result = validateCreateUserRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('email');
  });

  it('should reject bio too long', () => {
    const request: CreateUserRequest = {
      name: 'John Doe',
      handle: 'johndoe',
      email: 'john@example.com',
      bio: 'A'.repeat(501),
    };
    const result = validateCreateUserRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Bio');
  });
});

describe('validateUpdateUserRequest', () => {
  it('should validate correct update request', () => {
    const request: UpdateUserRequest = {
      name: 'Jane Doe',
      bio: 'Updated bio',
    };
    const result = validateUpdateUserRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should allow partial updates', () => {
    const request: UpdateUserRequest = {
      name: 'Jane Doe',
    };
    const result = validateUpdateUserRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject empty name', () => {
    const request: UpdateUserRequest = {
      name: '   ',
    };
    const result = validateUpdateUserRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should reject bio too long', () => {
    const request: UpdateUserRequest = {
      bio: 'A'.repeat(501),
    };
    const result = validateUpdateUserRequest(request);
    expect(result.valid).toBe(false);
  });
});

describe('validateFollowUserRequest', () => {
  it('should validate correct follow request', () => {
    const request = {
      followerId: 'user1',
      followingId: 'user2',
    };
    const result = validateFollowUserRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing followerId', () => {
    const request = {
      followerId: '',
      followingId: 'user2',
    };
    const result = validateFollowUserRequest(request);
    expect(result.valid).toBe(false);
  });
});

describe('validateUserListParams', () => {
  it('should validate correct params', () => {
    const params = { limit: 10, offset: 0 };
    const result = validateUserListParams(params);
    expect(result.valid).toBe(true);
    expect(result.normalized.limit).toBe(10);
    expect(result.normalized.offset).toBe(0);
  });

  it('should reject limit too small', () => {
    const params = { limit: 0 };
    const result = validateUserListParams(params);
    expect(result.valid).toBe(false);
  });

  it('should reject limit too large', () => {
    const params = { limit: 101 };
    const result = validateUserListParams(params);
    expect(result.valid).toBe(false);
  });

  it('should reject negative offset', () => {
    const params = { offset: -1 };
    const result = validateUserListParams(params);
    expect(result.valid).toBe(false);
  });
});

describe('isFollowing', () => {
  it('should return true if user is in followers list', () => {
    const followers: User[] = [
      { id: 'user1', name: 'User 1', handle: 'user1', email: 'user1@example.com', createdAt: new Date(), updatedAt: new Date() },
      { id: 'user2', name: 'User 2', handle: 'user2', email: 'user2@example.com', createdAt: new Date(), updatedAt: new Date() },
    ];
    expect(isFollowing(followers, 'user1')).toBe(true);
    expect(isFollowing(followers, 'user2')).toBe(true);
  });

  it('should return false if user is not in followers list', () => {
    const followers: User[] = [
      { id: 'user1', name: 'User 1', handle: 'user1', email: 'user1@example.com', createdAt: new Date(), updatedAt: new Date() },
    ];
    expect(isFollowing(followers, 'user3')).toBe(false);
  });

  it('should return false for empty followers list', () => {
    expect(isFollowing([], 'user1')).toBe(false);
  });
});

describe('getUserDisplayName', () => {
  it('should return name if available', () => {
    const user: User = {
      id: 'user1',
      name: 'John Doe',
      handle: 'johndoe',
      email: 'john@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(getUserDisplayName(user)).toBe('John Doe');
  });

  it('should return handle if name not available', () => {
    const user: User = {
      id: 'user1',
      name: '',
      handle: 'johndoe',
      email: 'john@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(getUserDisplayName(user)).toBe('johndoe');
  });

  it('should return fallback if neither available', () => {
    const user: User = {
      id: 'user1',
      name: '',
      handle: '',
      email: 'john@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(getUserDisplayName(user)).toBe('Unknown User');
  });
});

describe('getUserAvatarUrl', () => {
  it('should return avatarUrl if available', () => {
    const user: User = {
      id: 'user1',
      name: 'John',
      handle: 'john',
      email: 'john@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(getUserAvatarUrl(user)).toBe('https://example.com/avatar.jpg');
  });

  it('should return fallback if avatarUrl not available', () => {
    const user: User = {
      id: 'user1',
      name: 'John',
      handle: 'john',
      email: 'john@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(getUserAvatarUrl(user, 'default.jpg')).toBe('default.jpg');
    expect(getUserAvatarUrl(user)).toBe('');
  });
});

describe('formatFollowerCount', () => {
  it('should format numbers correctly', () => {
    expect(formatFollowerCount(0)).toBe('0');
    expect(formatFollowerCount(100)).toBe('100');
    expect(formatFollowerCount(1000)).toBe('1.0K');
    expect(formatFollowerCount(1500)).toBe('1.5K');
    expect(formatFollowerCount(1000000)).toBe('1.0M');
    expect(formatFollowerCount(2500000)).toBe('2.5M');
  });
});

describe('canHostDebate', () => {
  it('should return true for PLATINUM users', () => {
    const user: User = {
      id: 'user1',
      name: 'John',
      handle: 'john',
      email: 'john@example.com',
      tier: 'PLATINUM',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(canHostDebate(user)).toBe(true);
  });

  it('should return false for temporarily muted users', () => {
    const user: User = {
      id: 'user1',
      name: 'John',
      handle: 'john',
      email: 'john@example.com',
      temporarilyMuted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(canHostDebate(user)).toBe(false);
  });

  it('should return false if muted until future date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    
    const user: User = {
      id: 'user1',
      name: 'John',
      handle: 'john',
      email: 'john@example.com',
      mutedUntil: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(canHostDebate(user)).toBe(false);
  });

  it('should return true if muted until past date', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    
    const user: User = {
      id: 'user1',
      name: 'John',
      handle: 'john',
      email: 'john@example.com',
      mutedUntil: pastDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(canHostDebate(user)).toBe(true);
  });
});
