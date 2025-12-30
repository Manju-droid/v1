/**
 * User Domain Models
 * 
 * Domain models for user-related operations.
 */

export type UserTier = 'SILVER' | 'PLATINUM';

export interface User {
  id: string;
  name: string;
  displayName?: string;
  handle: string;
  email: string;
  phoneNumber?: string;
  languages?: string[];
  bio?: string;
  gender?: string;
  avatar?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  followersOnlyComments?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;

  // Tier and Points System
  tier?: UserTier;
  points?: number;
  subscriptionActive?: boolean;
  temporarilyMuted?: boolean;
  mutedUntil?: Date | string;

  // Abuse tracking
  lastAbusivePostDate?: Date | string;
  abusivePostCountToday?: number;

  // Debate hosting limits
  lastDebateHostDate?: Date | string;
  debatesHostedToday?: number;

  // Daily streak
  lastLoginDate?: Date | string;
  loginStreak?: number;

  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Date | string;
}

export interface CreateUserRequest {
  name: string;
  handle: string;
  email: string;
  bio?: string;
  gender?: string;
}

export interface UpdateUserRequest {
  name?: string;
  bio?: string;
  gender?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  followersOnlyComments?: boolean;
}

export interface FollowUserRequest {
  followerId: string;
}

export interface UserListParams {
  limit?: number;
  offset?: number;
}

export interface FollowersListParams {
  limit?: number;
  offset?: number;
}


