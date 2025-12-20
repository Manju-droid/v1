/**
 * User Service
 * 
 * Business logic and validation for user operations.
 */

import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  FollowUserRequest,
  UserListParams,
} from '../domain/user';
import { isValidEmail, isValidHandle } from '../utils';

/**
 * Validate create user request
 */
export function validateCreateUserRequest(request: CreateUserRequest): {
  valid: boolean;
  error?: string;
} {
  if (!request.name || request.name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (request.name.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (request.name.length > 50) {
    return { valid: false, error: 'Name must be less than 50 characters' };
  }

  if (!request.handle || request.handle.trim().length === 0) {
    return { valid: false, error: 'Handle is required' };
  }

  if (!isValidHandle(request.handle)) {
    return { valid: false, error: 'Handle must be 3-20 characters and contain only letters, numbers, underscores, and hyphens' };
  }

  if (!request.email || request.email.trim().length === 0) {
    return { valid: false, error: 'Email is required' };
  }

  if (!isValidEmail(request.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (request.bio && request.bio.length > 500) {
    return { valid: false, error: 'Bio must be less than 500 characters' };
  }

  return { valid: true };
}

/**
 * Validate update user request
 */
export function validateUpdateUserRequest(request: UpdateUserRequest): {
  valid: boolean;
  error?: string;
} {
  if (request.name !== undefined) {
    if (request.name.trim().length === 0) {
      return { valid: false, error: 'Name cannot be empty' };
    }
    if (request.name.length < 2) {
      return { valid: false, error: 'Name must be at least 2 characters' };
    }
    if (request.name.length > 50) {
      return { valid: false, error: 'Name must be less than 50 characters' };
    }
  }

  if (request.bio !== undefined && request.bio.length > 500) {
    return { valid: false, error: 'Bio must be less than 500 characters' };
  }

  if (request.avatarUrl !== undefined && request.avatarUrl.trim().length === 0) {
    return { valid: false, error: 'Avatar URL cannot be empty' };
  }

  if (request.coverPhotoUrl !== undefined && request.coverPhotoUrl.trim().length === 0) {
    return { valid: false, error: 'Cover photo URL cannot be empty' };
  }

  return { valid: true };
}

/**
 * Validate follow user request
 */
export function validateFollowUserRequest(request: FollowUserRequest): {
  valid: boolean;
  error?: string;
} {
  if (!request.followerId || request.followerId.trim().length === 0) {
    return { valid: false, error: 'Follower ID is required' };
  }

  return { valid: true };
}

/**
 * Validate user list params
 */
export function validateUserListParams(params: UserListParams): {
  valid: boolean;
  error?: string;
  normalized: UserListParams;
} {
  const normalized: UserListParams = {};

  if (params.limit !== undefined) {
    if (params.limit < 1) {
      return { valid: false, error: 'Limit must be at least 1', normalized };
    }
    if (params.limit > 100) {
      return { valid: false, error: 'Limit must be at most 100', normalized };
    }
    normalized.limit = params.limit;
  }

  if (params.offset !== undefined) {
    if (params.offset < 0) {
      return { valid: false, error: 'Offset must be non-negative', normalized };
    }
    normalized.offset = params.offset;
  }

  return { valid: true, normalized };
}

/**
 * Check if user is following another user
 */
export function isFollowing(followers: User[], userId: string): boolean {
  return followers.some(follower => follower.id === userId);
}

/**
 * Get user display name (name or handle fallback)
 */
export function getUserDisplayName(user: User): string {
  return user.name || user.handle || 'Unknown User';
}

/**
 * Get user avatar URL (with fallback)
 */
export function getUserAvatarUrl(user: User, fallback?: string): string {
  return user.avatarUrl || fallback || '';
}

/**
 * Format user follower count
 */
export function formatFollowerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Check if user can host debate (based on tier and limits)
 */
export function canHostDebate(user: User): boolean {
  // Check if user is temporarily muted
  if (user.temporarilyMuted) {
    return false;
  }

  // Check mute expiration
  if (user.mutedUntil) {
    const mutedUntil = typeof user.mutedUntil === 'string' 
      ? new Date(user.mutedUntil) 
      : user.mutedUntil;
    if (mutedUntil > new Date()) {
      return false;
    }
  }

  // Check tier - PLATINUM users can host unlimited debates
  if (user.tier === 'PLATINUM') {
    return true;
  }

  // SILVER users have daily limits (handled by backend)
  // This is just a client-side check
  return true;
}


