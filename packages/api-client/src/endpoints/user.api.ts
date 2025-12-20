/**
 * User API Endpoints
 * 
 * API client methods for user operations.
 */

import { request } from '../client';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  FollowUserRequest,
  UserListParams,
  FollowersListParams,
} from '@v/shared';

/**
 * List users
 */
export async function listUsers(
  params?: UserListParams
): Promise<User[]> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const data = await request<any>(endpoint);
  
  // Backend returns { users: [...], limit: ..., offset: ... }
  if (Array.isArray(data)) {
    return data;
  } else if (data && Array.isArray(data.users)) {
    return data.users;
  }
  return [];
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User> {
  return request<User>(`/users/${id}`);
}

/**
 * Get user by handle
 */
export async function getUserByHandle(handle: string): Promise<User> {
  return request<User>(`/users/handle/${handle}`);
}

/**
 * Create user
 */
export async function createUser(data: CreateUserRequest): Promise<User> {
  return request<User>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: UpdateUserRequest
): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<void> {
  return request<void>(`/users/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Follow user
 */
export async function followUser(
  id: string,
  data: FollowUserRequest
): Promise<void> {
  return request<void>(`/users/${id}/follow`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Unfollow user
 */
export async function unfollowUser(
  id: string,
  data: FollowUserRequest
): Promise<void> {
  return request<void>(`/users/${id}/follow`, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
}

/**
 * Get user followers
 */
export async function getUserFollowers(
  id: string,
  params?: FollowersListParams
): Promise<User[]> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const endpoint = `/users/${id}/followers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const data = await request<any>(endpoint);
  
  // Backend returns { users: [...], limit: ..., offset: ... }
  if (Array.isArray(data)) {
    return data;
  } else if (data && Array.isArray(data.users)) {
    return data.users;
  }
  return [];
}

/**
 * Get user following
 */
export async function getUserFollowing(
  id: string,
  params?: FollowersListParams
): Promise<User[]> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const endpoint = `/users/${id}/following${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const data = await request<any>(endpoint);
  
  // Backend returns { users: [...], limit: ..., offset: ... }
  if (Array.isArray(data)) {
    return data;
  } else if (data && Array.isArray(data.users)) {
    return data.users;
  }
  return [];
}

/**
 * User API object
 */
export const userAPI = {
  list: listUsers,
  getById: getUserById,
  getByHandle: getUserByHandle,
  create: createUser,
  update: updateUser,
  delete: deleteUser,
  follow: followUser,
  unfollow: unfollowUser,
  getFollowers: getUserFollowers,
  getFollowing: getUserFollowing,
};


