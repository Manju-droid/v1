// Profile API layer - using real backend APIs
import { currentUserMock } from '@/lib/store';
import { userAPI, postAPI } from '@v/api-client';
import { syncCurrentUser, updateCurrentUser, getCurrentUser } from '@/lib/currentUser';

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  bio: string;
  gender?: string;
  avatarUrl: string;
  coverPhotoUrl?: string;
  followersOnlyComments?: boolean;
  isFollowing: boolean;
  isFollower: boolean;
  email?: string;
  counts: {
    posts: number;
    followers: number;
    following: number;
    reachTotal: number;
  };
}

// Get user profile by handle
export const getUser = async (handle: string): Promise<UserProfile | null> => {
  try {
    const user = await userAPI.getByHandle(handle);
    if (!user) return null;

    // Get counts and relationships
    const [followersData, followingData, postsData] = await Promise.all([
      userAPI.getFollowers(user.id, {}),
      userAPI.getFollowing(user.id, {}),
      postAPI.list({ authorId: user.id })
    ]);

    // Ensure we have arrays
    const followers = Array.isArray(followersData) ? followersData : [];
    const following = Array.isArray(followingData) ? followingData : [];
    const posts = Array.isArray(postsData) ? postsData : [];

    const reachTotal = posts.reduce((sum: number, post: any) => sum + (post.reach_all || 0), 0);

    // Check if viewer is following target
    const isFollowing = currentUserMock?.id ? followers.some((f: any) => f.id === currentUserMock!.id) : false;

    // Check if target is following viewer
    const isFollower = currentUserMock?.id ? following.some((f: any) => f.id === currentUserMock!.id) : false;

    return {
      id: user.id,
      name: user.name,
      handle: user.handle,
      email: user.email,
      bio: user.bio ?? '',
      gender: (user as any).gender,
      avatarUrl: user.avatarUrl ?? '',
      coverPhotoUrl: user.coverPhotoUrl,
      followersOnlyComments: user.followersOnlyComments || false,
      isFollowing,
      isFollower,
      counts: {
        posts: posts.length,
        followers: followers.length,
        following: following.length,
        reachTotal,
      },
    };
  } catch (error: any) {
    // Silently handle 404 errors (user not found) - this is expected
    if (error?.isNotFound || error?.status === 404) {
      return null;
    }
    console.error('Failed to get user profile:', error);
    return null;
  }
};

// Follow a user
export const follow = async (targetHandle: string): Promise<void> => {
  try {
    const user = await userAPI.getByHandle(targetHandle);
    if (!user) throw new Error('User not found');

    await userAPI.follow(user.id, { followerId: currentUserMock?.id || '' });

    // Update global store
    const { useStore } = await import('@/lib/store');
    const storeState = useStore.getState();
    if (!storeState.followedUsers.has(user.id)) {
      storeState.toggleFollow(user.id);
    }
  } catch (error: any) {
    // Don't log 404 errors (user not found) - they're expected
    if (!error?.isNotFound && error?.status !== 404) {
      console.error('Failed to follow user:', error);
    }
    throw error;
  }
};

// Unfollow a user
export const unfollow = async (targetHandle: string): Promise<void> => {
  try {
    const user = await userAPI.getByHandle(targetHandle);
    if (!user) throw new Error('User not found');

    await userAPI.unfollow(user.id, { followerId: currentUserMock?.id || '' });

    // Update global store
    const { useStore } = await import('@/lib/store');
    const storeState = useStore.getState();
    if (storeState.followedUsers.has(user.id)) {
      storeState.toggleFollow(user.id);
    }
  } catch (error: any) {
    // Don't log 404 errors (user not found) - they're expected
    if (!error?.isNotFound && error?.status !== 404) {
      console.error('Failed to unfollow user:', error);
    }
    throw error;
  }
};

// Upload avatar (crop and compress image)
export const uploadAvatar = async (file: File): Promise<string> => {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please use JPEG, PNG, or WebP.');
  }

  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('File size must be less than 2MB.');
  }

  // Create image element
  const img = new Image();
  const imageUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(imageUrl);

      // Create canvas for cropping and compression
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      // Set canvas size to 256x256
      canvas.width = 256;
      canvas.height = 256;

      // Calculate crop dimensions (1:1 aspect ratio, centered)
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;

      // Draw cropped and resized image
      ctx.drawImage(img, x, y, size, size, 0, 0, 256, 256);

      // Convert to data URL (JPEG with quality 0.85)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Update user's avatar in backend
      updateUserAvatar(dataUrl).then(() => {
        resolve(dataUrl);
      }).catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
};

// Update user avatar in backend
const updateUserAvatar = async (avatarUrl: string): Promise<void> => {
  try {
    if (!currentUserMock?.id) throw new Error('User not authenticated');
    await userAPI.update(currentUserMock.id, { avatarUrl });

    // Sync current user to update avatar throughout app
    await syncCurrentUser();
    const syncedUser = getCurrentUser();
    if (syncedUser) {
      updateCurrentUser({ avatar: syncedUser.avatar });
    }
  } catch (error) {
    console.error('Failed to update avatar:', error);
    throw error;
  }
};

// Remove avatar (reset to initials)
export const removeAvatar = async (): Promise<void> => {
  try {
    const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf';
    if (!currentUserMock?.id) throw new Error('User not authenticated');
    await userAPI.update(currentUserMock.id, { avatarUrl: defaultAvatar });

    // Sync current user to update avatar throughout app
    await syncCurrentUser();
    const syncedUser = getCurrentUser();
    if (syncedUser) {
      updateCurrentUser({ avatar: syncedUser.avatar });
    }
  } catch (error) {
    console.error('Failed to remove avatar:', error);
    throw error;
  }
};

// Upload cover photo (crop and compress image)
export const uploadCoverPhoto = async (file: File): Promise<string> => {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please use JPEG, PNG, or WebP.');
  }

  // Validate file size (5MB for cover photos)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB.');
  }

  // Create image element
  const img = new Image();
  const imageUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(imageUrl);

      // Create canvas for cropping and compression
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      // Set canvas size to 1200x300 (4:1 aspect ratio for cover photo)
      canvas.width = 1200;
      canvas.height = 300;

      // Calculate crop dimensions (4:1 aspect ratio, centered)
      const targetAspect = 4 / 1;
      const imgAspect = img.width / img.height;

      let sourceWidth, sourceHeight, sourceX, sourceY;

      if (imgAspect > targetAspect) {
        // Image is wider than target - crop width
        sourceHeight = img.height;
        sourceWidth = sourceHeight * targetAspect;
        sourceX = (img.width - sourceWidth) / 2;
        sourceY = 0;
      } else {
        // Image is taller than target - crop height
        sourceWidth = img.width;
        sourceHeight = sourceWidth / targetAspect;
        sourceX = 0;
        sourceY = (img.height - sourceHeight) / 2;
      }

      // Draw cropped and resized image
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 1200, 300);

      // Convert to data URL (JPEG with quality 0.85)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Update user's cover photo in backend
      updateUserCoverPhoto(dataUrl).then(() => {
        resolve(dataUrl);
      }).catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
};

// Update user cover photo in backend
const updateUserCoverPhoto = async (coverPhotoUrl: string): Promise<void> => {
  try {
    if (!currentUserMock?.id) throw new Error('User not authenticated');
    await userAPI.update(currentUserMock.id, { coverPhotoUrl });
  } catch (error) {
    console.error('Failed to update cover photo:', error);
    throw error;
  }
};

// Remove cover photo
export const removeCoverPhoto = async (): Promise<void> => {
  try {
    // We can't delete a field with PUT, so we set it to empty string or null
    // Assuming backend handles empty string as removal
    if (!currentUserMock?.id) throw new Error('User not authenticated');
    await userAPI.update(currentUserMock.id, { coverPhotoUrl: '' });
  } catch (error) {
    console.error('Failed to remove cover photo:', error);
    throw error;
  }
};

// Update user profile settings
export const updateUserProfile = async (updates: { name?: string; handle?: string; email?: string; password?: string; bio?: string; gender?: string; avatarUrl?: string; followersOnlyComments?: boolean }, userId?: string): Promise<void> => {
  try {
    const user = getCurrentUser();
    const idToUse = userId || user?.id;

    if (!idToUse) throw new Error('User not authenticated');

    await userAPI.update(idToUse, updates);

    // Sync current user to update throughout app
    await syncCurrentUser();
    const syncedUser = getCurrentUser();
    if (syncedUser) {
      updateCurrentUser({
        displayName: syncedUser.displayName,
        handle: syncedUser.handle,
        bio: syncedUser.bio,
      });
    }
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};

// Get followers list
export const getFollowers = async (handle: string, cursor?: string): Promise<{
  users: Array<{ id: string; name: string; handle: string; avatarUrl: string }>;
  nextCursor?: string;
}> => {
  try {
    const user = await userAPI.getByHandle(handle);
    if (!user) return { users: [], nextCursor: undefined };

    const followers = await userAPI.getFollowers(user.id, {});

    const users = followers.map((u: any) => ({
      id: u.id,
      name: u.name,
      handle: u.handle,
      avatarUrl: u.avatarUrl,
    }));

    return { users, nextCursor: undefined };
  } catch (error) {
    console.error('Failed to get followers:', error);
    return { users: [], nextCursor: undefined };
  }
};

// Get following list
export const getFollowing = async (handle: string, cursor?: string): Promise<{
  users: Array<{ id: string; name: string; handle: string; avatarUrl: string }>;
  nextCursor?: string;
}> => {
  try {
    const user = await userAPI.getByHandle(handle);
    if (!user) return { users: [], nextCursor: undefined };

    const following = await userAPI.getFollowing(user.id, {});

    const users = following.map((u: any) => ({
      id: u.id,
      name: u.name,
      handle: u.handle,
      avatarUrl: u.avatarUrl,
    }));

    return { users, nextCursor: undefined };
  } catch (error) {
    console.error('Failed to get following:', error);
    return { users: [], nextCursor: undefined };
  }
};

// Get user posts
export const getUserPosts = async (
  handle: string,
  tab: 'posts' | 'replies' | 'media' = 'posts',
  cursor?: string
): Promise<{
  posts: Array<{
    id: string;
    text: string;
    createdAt: string;
    reachAll?: number;
  }>;
  nextCursor?: string;
}> => {
  try {
    const user = await userAPI.getByHandle(handle);
    if (!user) return { posts: [], nextCursor: undefined };

    const posts = await postAPI.list({ authorId: user.id });

    // Filter based on tab
    let filteredPosts = posts;
    if (tab === 'replies') {
      filteredPosts = posts.filter((p: any) => p.content.trim().startsWith('@'));
    } else if (tab === 'media') {
      filteredPosts = posts.filter((p: any) => p.mediaUrl);
    } else {
      // Default posts tab - exclude replies
      filteredPosts = posts.filter((p: any) => !p.content.trim().startsWith('@'));
    }

    const mappedPosts = filteredPosts.map((p: any) => ({
      id: p.id,
      text: p.content,
      createdAt: p.createdAt,
      reachAll: p.reach_all || 0,
    }));

    return { posts: mappedPosts, nextCursor: undefined };
  } catch (error) {
    console.error('Failed to get user posts:', error);
    return { posts: [], nextCursor: undefined };
  }
};

