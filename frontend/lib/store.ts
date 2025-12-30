import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { mockPosts, mockComments, MockPost, MockComment, MockUser, getComments } from './mock';
import { getCurrentUser, syncCurrentUser } from './currentUser';
import { postAPI, userAPI } from '@v/api-client';
import { useUserStore } from '@/features/users';

// Current user mock (synced from profileStore)
// Use getCurrentUser() to get the latest user data
// No default guest user - must be authenticated
export let currentUserMock: MockUser | null = null;

// Don't auto-sync current user on module load - let useAuth hook handle auth validation
// This prevents auto-login when the app starts
// syncCurrentUser() should only be called explicitly after login or when needed
// Components should use getCurrentUserMock() or sync in their own useEffect

// Helper to get current user (always returns latest from profileStore)
export const getCurrentUserMock = (): MockUser | null => {
  return getCurrentUser();
};

export interface Post extends Omit<MockPost, 'reactions' | 'saves'> {
  reacted: boolean;
  saved: boolean;
  reactionCount: number; // Track number of reactions
  saveCount: number; // Track number of saves
  commentsDisabled?: boolean; // User can disable comments
  commentLimit?: number; // Optional max number of comments
  reach_24h?: number;
  reach_all?: number;
}

export interface Comment extends Omit<MockComment, 'reactions'> {
  reactions: number; // Track number of reactions on this comment
  reacted: boolean;
  saved: boolean;
}

interface AppState {
  // State
  posts: Post[];
  commentsByPost: Record<string, Comment[]>;
  followedUsers: Set<string>; // Track followed user IDs

  // User state
  currentUser: MockUser | null;
  syncCurrentUser: () => Promise<void>;
  setCurrentUser: (user: MockUser | any | null) => void; // Accept User from shared or MockUser

  // User preferences for composer (sticky settings)
  userCommentPreferences: {
    commentsDisabled: boolean;
    commentLimit: number | undefined;
  };

  // Post actions
  addPost: (content: string, media?: { type: 'image' | 'video'; url: string }, options?: { commentsDisabled?: boolean; commentLimit?: number }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  toggleReact: (postId: string) => Promise<void>;
  toggleSave: (postId: string, fallbackState?: { saved: boolean }) => Promise<void>;
  toggleComments: (postId: string) => void;
  setCommentLimit: (postId: string, limit: number | undefined) => void;

  // User preference actions
  setUserCommentPreferences: (preferences: { commentsDisabled?: boolean; commentLimit?: number | undefined }) => void;

  // Follow actions
  toggleFollow: (userId: string) => void;
  isFollowing: (userId: string) => boolean;

  // Comment actions
  addComment: (postId: string, content: string, parentId?: string | null) => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => void;
  toggleCommentReact: (postId: string, commentId: string) => void;

  // Initialization
  initializeFromMock: () => void;
  logout: () => void;

  // Load saved posts from profileStore
  loadSavedPosts: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: currentUserMock,
  syncCurrentUser: async () => {
    try {
      await syncCurrentUser();
      const user = getCurrentUser();

      set(state => {
        // Update current user
        const newState: Partial<AppState> = { currentUser: user };

        // Also update author info in existing posts if user matches
        if (user) {
          newState.posts = state.posts.map(post => {
            if (post.author.id === user.id) {
              return {
                ...post,
                author: {
                  ...post.author,
                  displayName: user.displayName,
                  handle: user.handle,
                  avatar: user.avatar,
                }
              };
            }
            return post;
          });
        }

        return newState;
      });

      // Update the mock object for legacy code that imports it directly
      currentUserMock = user;
    } catch (error) {
      console.error('Failed to sync current user in store:', error);
      // Clear user on error
      set({ currentUser: null as any });
      currentUserMock = null;
    }
  },
  setCurrentUser: (user: MockUser | any | null) => {
    // Convert User from shared package to MockUser if needed
    let mockUser: MockUser | null = null;
    if (user) {
      if ('displayName' in user || 'name' in user) {
        // Already MockUser or needs conversion
        mockUser = {
          id: user.id,
          displayName: user.displayName || user.name,
          handle: user.handle,
          avatar: user.avatar || user.avatarUrl || '',
          bio: user.bio || '',
          email: user.email,
          followerCount: user.followersCount || user.followerCount,
          followingCount: user.followingCount,
        };
      } else {
        mockUser = user as MockUser;
      }
    }
    set({ currentUser: mockUser });
    currentUserMock = mockUser;
  },
  logout: () => {
    // Clear user completely - no guest user
    set({ currentUser: null as any });
    currentUserMock = null;
  },
  posts: [],
  commentsByPost: {},
  followedUsers: new Set<string>(),
  userCommentPreferences: {
    commentsDisabled: false,
    commentLimit: undefined,
  },

  // Initialize from backend only (always fetch fresh data)
  initializeFromMock: async () => {
    // Always fetch from backend to ensure all browsers see the same data
    try {
      // Fetch posts from backend
      const backendPosts = await postAPI.list({ limit: 50 });

      // Get current state to preserve any newly created posts that might not be in backend yet
      const currentState = get();
      const currentPostIds = new Set(currentState.posts.map(p => p.id));

      if (backendPosts && backendPosts.length > 0) {
        // Convert backend posts to Post format with local state
        const postsWithState: Post[] = await Promise.all(backendPosts.map(async (post: any) => {
          // If author is missing, try to fetch it from backend
          let author = post.author;
          if (!author && post.authorId) {
            try {
              const fetchedAuthor = await userAPI.getById(post.authorId);
              if (fetchedAuthor) {
                author = {
                  id: fetchedAuthor.id,
                  displayName: fetchedAuthor.displayName || fetchedAuthor.handle,
                  handle: fetchedAuthor.handle,
                  avatar: fetchedAuthor.avatarUrl || '',
                };
              }
            } catch (error) {
              console.error(`Failed to fetch author for post ${post.id}:`, error);
            }
          }

          return {
            id: post.id,
            author: author || { id: post.authorId, displayName: 'Unknown', handle: 'unknown', avatar: '' },
            content: post.content,
            media: post.mediaUrl ? [{ type: post.mediaType, url: post.mediaUrl }] : undefined,
            comments: post.commentCount || 0,
            reactionCount: post.reactionCount || 0,
            saveCount: post.saveCount || 0,
            reach_24h: post.reach_24h || 0,
            reach_all: post.reach_all || 0,
            timestamp: post.createdAt,
            reacted: post.reacted || false, // Use backend provided state or default to false
            saved: post.saved || false,     // Use backend provided state or default to false
            commentsDisabled: post.commentsDisabled || false,
            commentLimit: post.commentLimit,
          };
        }));

        // Merge with existing posts: keep posts that exist in backend, but also preserve
        // any local posts that were created recently (within last 30 seconds) and might not be in backend yet
        const now = Date.now();
        const recentLocalPosts = currentState.posts.filter(post => {
          // Keep posts that are either:
          // 1. In the backend response (will be replaced by backend version)
          // 2. Created locally within the last 30 seconds (might not be in backend yet)
          const postTime = new Date(post.timestamp).getTime();
          const isRecent = (now - postTime) < 30000; // 30 seconds
          const isInBackend = postsWithState.some(bp => bp.id === post.id);

          // Only keep if it's recent AND not in backend (to avoid duplicates)
          return isRecent && !isInBackend;
        });

        // Merge posts: preserve reach counts from existing posts if backend doesn't have them
        const existingPostsMap = new Map(currentState.posts.map(p => [p.id, p]));
        const mergedPosts = postsWithState.map(backendPost => {
          const existingPost = existingPostsMap.get(backendPost.id);
          // If backend post has 0 reach but existing post has a higher value, preserve it
          if (existingPost && (backendPost.reach_24h === 0 || backendPost.reach_24h === undefined)) {
            if (existingPost.reach_24h && existingPost.reach_24h > 0) {
              backendPost.reach_24h = existingPost.reach_24h;
            }
          }
          if (existingPost && (backendPost.reach_all === 0 || backendPost.reach_all === undefined)) {
            if (existingPost.reach_all && existingPost.reach_all > 0) {
              backendPost.reach_all = existingPost.reach_all;
            }
          }
          // Always use the higher value to prevent counts from decreasing
          if (existingPost) {
            backendPost.reach_24h = Math.max(backendPost.reach_24h || 0, existingPost.reach_24h || 0);
            backendPost.reach_all = Math.max(backendPost.reach_all || 0, existingPost.reach_all || 0);
          }
          return backendPost;
        });

        // Add recent local posts that aren't in backend
        mergedPosts.push(...recentLocalPosts);

        // Sort by timestamp (newest first)
        mergedPosts.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });

        set({ posts: mergedPosts, commentsByPost: {} });
        console.log(`✅ Loaded ${postsWithState.length} posts from backend, ${recentLocalPosts.length} recent local posts preserved`);
      } else {
        // No posts in backend - preserve recent local posts
        const now = Date.now();
        const recentLocalPosts = currentState.posts.filter(post => {
          const postTime = new Date(post.timestamp).getTime();
          return (now - postTime) < 30000; // 30 seconds
        });

        if (recentLocalPosts.length > 0) {
          set({ posts: recentLocalPosts, commentsByPost: {} });
          console.log(`📭 No posts in backend - preserving ${recentLocalPosts.length} recent local posts`);
        } else {
          set({ posts: [], commentsByPost: {} });
          console.log('📭 No posts in backend - starting with empty feed');
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch posts from backend:', error);
      // On error, preserve recent local posts instead of clearing everything
      const currentState = get();
      const now = Date.now();
      const recentLocalPosts = currentState.posts.filter(post => {
        const postTime = new Date(post.timestamp).getTime();
        return (now - postTime) < 30000; // 30 seconds
      });

      if (recentLocalPosts.length > 0) {
        set({ posts: recentLocalPosts, commentsByPost: {} });
        console.log(`⚠️ Backend fetch failed - preserving ${recentLocalPosts.length} recent local posts`);
      } else {
        set({ posts: [], commentsByPost: {} });
      }
    }

    // Fetch followed users from backend (only if user is authenticated)
    if (currentUserMock?.id) {
      try {
        const following = await userAPI.getFollowing(currentUserMock.id, {});
        if (following && following.length > 0) {
          const followedIds = new Set(following.map((u: any) => u.id));
          set(state => ({ ...state, followedUsers: followedIds }));
        }
      } catch (error) {
        console.error('Failed to fetch followed users:', error);
      }

      // Fetch saved posts from backend
      try {
        const savedPosts = await postAPI.getSavedPosts(currentUserMock.id);
        if (savedPosts && savedPosts.length > 0) {
          const savedIds = new Set(savedPosts.map((p: any) => p.id));
          set(state => ({
            ...state,
            posts: state.posts.map(post => ({
              ...post,
              saved: savedIds.has(post.id),
            })),
          }));
        }
      } catch (error) {
        console.error('Failed to fetch saved posts:', error);
      }
    }
  },

  // Add a new post (backend only - no local fallback)
  addPost: async (content: string, media?: { type: 'image' | 'video'; url: string }, options?: { commentsDisabled?: boolean; commentLimit?: number }) => {
    // Get current user from store state (always up-to-date)
    const currentUser = get().currentUser || getCurrentUserMock();

    if (!currentUser?.id) {
      throw new Error('Must be authenticated to create posts');
    }
    try {
      // Create post in backend
      const backendPost = await postAPI.create({
        authorId: currentUser.id,
        content,
        mediaType: media?.type,
        mediaUrl: media?.url,
        commentsDisabled: options?.commentsDisabled || false,
        commentLimit: options?.commentLimit,
      });

      // Use the backend post in local state
      const newPost: Post = {
        id: backendPost.id,
        author: currentUser,
        content: backendPost.content,
        media: backendPost.mediaUrl && backendPost.mediaType ? [{ type: backendPost.mediaType as 'image' | 'video', url: backendPost.mediaUrl }] : undefined,
        comments: 0,
        reactionCount: 0,
        saveCount: 0,
        reach_24h: 0,
        reach_all: 0,
        timestamp: typeof backendPost.createdAt === 'string' ? backendPost.createdAt : (backendPost.createdAt ? new Date(backendPost.createdAt).toISOString() : new Date().toISOString()),
        reacted: false,
        saved: false,
        commentsDisabled: backendPost.commentsDisabled || false,
        commentLimit: backendPost.commentLimit,
      };

      set(state => ({
        posts: [newPost, ...state.posts],
        commentsByPost: { ...state.commentsByPost, [newPost.id]: [] },
      }));

      console.log('✅ Post created in backend:', newPost.id);
    } catch (error) {
      console.error('❌ Failed to create post in backend:', error);
      throw error; // Throw error so UI can show error message
    }
  },

  // Delete a post and all its comments
  deletePost: async (postId: string) => {
    // Optimistic update
    set(state => {
      const newCommentsByPost = { ...state.commentsByPost };
      delete newCommentsByPost[postId];

      return {
        posts: state.posts.filter(p => p.id !== postId),
        commentsByPost: newCommentsByPost,
      };
    });

    try {
      // Delete from backend
      await postAPI.delete(postId);
      console.log('✅ Post deleted from backend:', postId);

      // Sync current user to update points
      await get().syncCurrentUser();

      // Also sync the user-store which is used by the Profile page points display
      const currentUser = get().currentUser;
      if (currentUser && currentUser.id) {
        useUserStore.getState().fetchUserPoints(currentUser.id).catch(console.error);
      }
    } catch (error: any) {
      // Ignore 404 errors (post already deleted or backend restarted)
      if (error.status === 404 || error.message?.includes('not found') || error.message?.includes('Post not found')) {
        console.warn('Post not found in backend, assuming deleted:', postId);
        return;
      }
      console.error('❌ Failed to delete post from backend:', error);
      // We could revert the optimistic update here if needed, 
      // but for deletion it's often better to just show an error toast 
      // and let the next refresh fix the state.
    }
  },

  // Toggle reaction on a post
  toggleReact: async (postId: string) => {
    const state = get();
    const post = state.posts.find(p => p.id === postId);

    // Check if user is authenticated
    if (!currentUserMock?.id) {
      console.warn('Cannot react: user not authenticated');
      return;
    }

    const wasReacted = post?.reacted || false;
    const optimisticCount = wasReacted ? (post ? post.reactionCount - 1 : 0) : (post ? post.reactionCount + 1 : 1);

    // Optimistic update (only if post is in store)
    if (post) {
      set(state => ({
        posts: state.posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              reacted: !wasReacted,
              reactionCount: optimisticCount,
            };
          }
          return p;
        }),
      }));
    }

    // Sync with backend
    try {
      if (wasReacted) {
        await postAPI.unreact(postId, currentUserMock.id);
      } else {
        await postAPI.react(postId, currentUserMock.id);
      }
      // Optimistic update already set the correct count and state
      // No need to update again on success
    } catch (error: any) {
      // Handle conflict errors when frontend state is out of sync with backend
      const isAlreadyReacted = error?.message?.includes('Already reacted');
      const isNotReacted = error?.message?.includes('Reaction not found') || error?.message?.includes('not found');

      if (isAlreadyReacted || isNotReacted) {
        // Frontend state was wrong - complete the user's toggle
        console.log(`State mismatch for post ${postId}. Completing toggle...`);

        try {
          if (isAlreadyReacted) {
            // Already reacted, complete toggle by unreacting
            await postAPI.unreact(postId, currentUserMock.id);
            if (post) {
              set(state => ({
                posts: state.posts.map(p =>
                  p.id === postId
                    ? { ...p, reacted: false, reactionCount: Math.max(0, p.reactionCount - 1) }
                    : p
                ),
              }));
            }
          } else {
            // Not reacted, complete toggle by reacting
            await postAPI.react(postId, currentUserMock.id);
            if (post) {
              set(state => ({
                posts: state.posts.map(p =>
                  p.id === postId
                    ? { ...p, reacted: true, reactionCount: p.reactionCount + 1 }
                    : p
                ),
              }));
            }
          }
          return;
        } catch (retryError: any) {
          console.error('Failed to complete toggle:', retryError);
          if (post) {
            set(state => ({
              posts: state.posts.map(p =>
                p.id === postId ? { ...p, reacted: isAlreadyReacted } : p
              ),
            }));
          }
          return;
        }
      }

      // Silently handle posts that don't exist in backend (local-only posts)
      const isLocalOnlyPost =
        error?.message?.includes('not found') ||
        error?.message?.includes('Post not found') ||
        error?.message?.includes('Failed to get updated post');

      if (!isLocalOnlyPost) {
        console.error('Failed to sync reaction with backend:', error);
      }

      // Revert the optimistic update on other errors
      if (post) {
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id === postId) {
              return {
                ...p,
                reacted: wasReacted,
                reactionCount: wasReacted ? optimisticCount + 1 : optimisticCount - 1,
              };
            }
            return p;
          }),
        }));
      }
    }
  },

  // Toggle save on a post
  toggleSave: async (postId: string, fallbackState?: { saved: boolean }) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);

    // Determine current state: use store post if available, otherwise fallback
    const currentSavedState = post ? post.saved : fallbackState?.saved;
    const currentSaveCount = post ? post.saveCount : 0; // Only used for optimistic update updates

    // If we don't know the state, we can't toggle
    if (currentSavedState === undefined) {
      console.warn(`Cannot toggle save for post ${postId}: post not in store and no fallback state provided`);
      return;
    }

    const newSavedState = !currentSavedState;
    const optimisticSaveCount = newSavedState ? currentSaveCount + 1 : Math.max(0, currentSaveCount - 1);

    // Optimistic update (only if in store)
    if (post) {
      set((state) => ({
        ...state,
        posts: state.posts.map((p) =>
          p.id === postId
            ? {
              ...p,
              saved: newSavedState,
              saveCount: optimisticSaveCount,
            }
            : p
        ),
      }));
    }

    // Sync with backend
    if (!currentUserMock?.id) {
      console.warn('Cannot save: user not authenticated');
      return;
    }
    try {
      if (newSavedState) {
        await postAPI.save(postId, currentUserMock.id);
      } else {
        await postAPI.unsave(postId, currentUserMock.id);
      }
    } catch (error: any) {
      // Handle conflict errors when frontend state is out of sync with backend
      const isAlreadySaved = error?.message?.includes('already saved') || error?.message?.includes('Post already saved');
      const isNotSaved = error?.message?.includes('not found');

      if (isAlreadySaved || isNotSaved) {
        // Frontend state was wrong - complete the user's toggle
        console.log(`State mismatch for post ${postId}. Completing save toggle...`);

        try {
          if (isAlreadySaved) {
            // Already saved, complete toggle by unsaving
            await postAPI.unsave(postId, currentUserMock.id);
            // Update store if post exists
            const currentPost = get().posts.find(p => p.id === postId);
            if (currentPost) {
              set((state) => ({
                posts: state.posts.map((p) =>
                  p.id === postId
                    ? { ...p, saved: false, saveCount: Math.max(0, p.saveCount - 1) }
                    : p
                ),
              }));
            }
          } else {
            // Not saved, complete toggle by saving
            await postAPI.save(postId, currentUserMock.id);
            const currentPost = get().posts.find(p => p.id === postId);
            if (currentPost) {
              set((state) => ({
                posts: state.posts.map((p) =>
                  p.id === postId
                    ? { ...p, saved: true, saveCount: p.saveCount + 1 }
                    : p
                ),
              }));
            }
          }
          return;
        } catch (retryError: any) {
          console.error('Failed to complete save toggle:', retryError);
          // Only revert store if post exists
          const currentPost = get().posts.find(p => p.id === postId);
          if (currentPost) {
            set((state) => ({
              posts: state.posts.map((p) =>
                p.id === postId ? { ...p, saved: isAlreadySaved } : p
              ),
            }));
          }
          return;
        }
      }

      console.error('Failed to sync save with backend:', error);
      // Revert on error (only if post in store)
      const currentPost = get().posts.find(p => p.id === postId);
      if (currentPost) {
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, saved: !newSavedState, saveCount: currentSaveCount } : p
          ),
        }));
      }
    }
  },

  // Toggle comments on/off for a post (owner only)
  toggleComments: (postId: string) => {
    if (!currentUserMock?.id) return;
    const userId = currentUserMock.id;
    set(state => ({
      posts: state.posts.map(post => {
        if (post.id === postId && post.author.id === userId) {
          return {
            ...post,
            commentsDisabled: !post.commentsDisabled,
          };
        }
        return post;
      }),
    }));
  },

  // Set comment limit for a post (owner only)
  setCommentLimit: (postId: string, limit: number | undefined) => {
    if (!currentUserMock?.id) return;
    const userId = currentUserMock.id;
    set(state => ({
      posts: state.posts.map(post => {
        if (post.id === postId && post.author.id === userId) {
          return {
            ...post,
            commentLimit: limit,
          };
        }
        return post;
      }),
    }));
  },

  // Set user's default comment preferences (sticky across posts)
  setUserCommentPreferences: (preferences: { commentsDisabled?: boolean; commentLimit?: number | undefined }) => {
    set(state => ({
      userCommentPreferences: {
        ...state.userCommentPreferences,
        ...preferences,
      },
    }));
  },

  // Toggle follow status for a user
  toggleFollow: async (userId: string) => {
    const state = get();
    const isFollowing = state.followedUsers.has(userId);

    // Check if user is authenticated
    if (!currentUserMock) {
      console.warn('Cannot follow: user not authenticated');
      return;
    }

    // Optimistic update
    set(state => {
      const newFollowedUsers = new Set(state.followedUsers);
      if (isFollowing) {
        newFollowedUsers.delete(userId);
      } else {
        newFollowedUsers.add(userId);
      }
      return { followedUsers: newFollowedUsers };
    });

    // Sync with backend
    try {
      if (isFollowing) {
        await userAPI.unfollow(userId, { followerId: currentUserMock.id });
      } else {
        await userAPI.follow(userId, { followerId: currentUserMock.id });
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      // Revert on error
      set(state => {
        const newFollowedUsers = new Set(state.followedUsers);
        if (isFollowing) {
          newFollowedUsers.add(userId);
        } else {
          newFollowedUsers.delete(userId);
        }
        return { followedUsers: newFollowedUsers };
      });
    }
  },

  // Check if a user is being followed
  isFollowing: (userId: string) => {
    return get().followedUsers.has(userId);
  },

  // Add a comment to a post
  addComment: async (postId: string, content: string, parentId: string | null = null) => {
    const state = get();
    const post = state.posts.find(p => p.id === postId);

    // Check if comments are disabled
    if (post?.commentsDisabled) {
      console.warn('Comments are disabled for this post');
      return;
    }

    // Check if comment limit has been reached
    const currentCommentCount = state.commentsByPost[postId]?.length || 0;
    if (post?.commentLimit && currentCommentCount >= post.commentLimit) {
      console.warn('Comment limit reached for this post');
      return;
    }

    if (!currentUserMock) return;
    const author = currentUserMock;

    const newComment: Comment = {
      id: nanoid(),
      parentId,
      author: author,
      content,
      timestamp: new Date().toISOString(),
      reactions: 0, // Initialize with 0 reactions
      reacted: false,
      saved: false,
    };

    // Optimistic update
    set(state => {
      const updatedComments = [...(state.commentsByPost[postId] || []), newComment];
      const updatedPosts = state.posts.map(post => {
        if (post.id === postId) {
          return { ...post, comments: post.comments + 1 };
        }
        return post;
      });

      return {
        posts: updatedPosts,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: updatedComments,
        },
      };
    });

    // Try to sync with backend
    if (!currentUserMock?.id) {
      console.warn('Cannot comment: user not authenticated');
      return;
    }
    try {
      await postAPI.createComment(postId, {
        postId,
        authorId: currentUserMock.id,
        content,
        parentId: parentId || undefined,
      });
    } catch (error: any) {
      console.error('Failed to sync comment with backend:', error);
    }
  },

  // Load comments for a post from backend
  loadComments: async (postId: string) => {
    try {
      const comments = await postAPI.getComments(postId);

      // Convert backend comments to Comment format
      const formattedComments: Comment[] = await Promise.all(comments.map(async (c: any) => {
        // If author is missing, try to fetch it from backend
        let author = c.author;
        if (!author && c.authorId) {
          try {
            const fetchedAuthor = await userAPI.getById(c.authorId);
            if (fetchedAuthor) {
              author = {
                id: fetchedAuthor.id,
                displayName: fetchedAuthor.displayName || fetchedAuthor.handle,
                handle: fetchedAuthor.handle,
                avatar: fetchedAuthor.avatarUrl || '',
              };
            }
          } catch (error) {
            console.error(`Failed to fetch author for comment ${c.id}:`, error);
          }
        }

        return {
          id: c.id,
          parentId: c.parentId || null,
          author: author || { id: c.authorId, displayName: 'Unknown', handle: 'unknown', avatar: '' },
          content: c.content,
          timestamp: c.createdAt,
          reactions: c.reactions || 0,
          reacted: false,
          saved: false,
        };
      }));

      set(state => ({
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: formattedComments,
        },
      }));
    } catch (error) {
      console.error(`Failed to load comments for post ${postId}:`, error);
    }
  },

  // Delete a comment and all its replies (subtree)
  deleteComment: (postId: string, commentId: string) => {
    set(state => {
      const comments = state.commentsByPost[postId] || [];
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return state;

      // Find all comments to delete (the comment and its subtree)
      const getSubtreeIds = (id: string): string[] => {
        const directReplies = comments.filter(c => c.parentId === id);
        return [
          id,
          ...directReplies.flatMap(reply => getSubtreeIds(reply.id))
        ];
      };

      const idsToDelete = getSubtreeIds(commentId);
      const deletedCount = idsToDelete.length;

      // Remove deleted comments
      let updatedComments = comments.filter(c => !idsToDelete.includes(c.id));

      // Update parent's reply count if this comment had a parent
      if (comment.parentId) {
        updatedComments = updatedComments.map(c => {
          if (c.id === comment.parentId) {
            return c;
          }
          return c;
        });
      }

      // Decrement post comment count
      const updatedPosts = state.posts.map(post => {
        if (post.id === postId) {
          return { ...post, comments: Math.max(0, post.comments - deletedCount) };
        }
        return post;
      });

      return {
        posts: updatedPosts,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: updatedComments,
        },
      };
    });
  },

  // Toggle reaction on a comment
  toggleCommentReact: async (postId: string, commentId: string) => {
    const state = get();
    const comments = state.commentsByPost[postId] || [];
    const comment = comments.find(c => c.id === commentId);

    if (!comment) return;
    const wasReacted = comment.reacted;

    // Optimistic update
    set(state => ({
      commentsByPost: {
        ...state.commentsByPost,
        [postId]: (state.commentsByPost[postId] || []).map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              reacted: !wasReacted,
              reactions: wasReacted ? Math.max(0, comment.reactions - 1) : comment.reactions + 1,
            };
          }
          return comment;
        }),
      },
    }));

    // TODO: Sync with backend when comment reaction API is available
    // Backend doesn't have comment reaction endpoints yet
    // Will need endpoints like: POST /posts/:postId/comments/:commentId/react
    // For now, this is client-side only
  },

  // Load saved posts from backend (replaced profileStore)
  loadSavedPosts: async () => {
    if (!currentUserMock?.id) return;
    try {
      const savedPosts = await postAPI.getSavedPosts(currentUserMock.id);
      if (savedPosts && savedPosts.length > 0) {
        const savedIds = new Set(savedPosts.map((p: any) => p.id));
        set((state) => ({
          ...state,
          posts: state.posts.map(post => ({
            ...post,
            saved: savedIds.has(post.id),
          })),
        }));
      }
    } catch (error) {
      console.error('Failed to load saved posts:', error);
    }
  },
}));

// Initialize store with mock data on first load
if (typeof window !== 'undefined') {
  useStore.getState().initializeFromMock();
  // Don't auto-sync user on initialization - let useAuth hook handle auth validation
  // This prevents auto-login when the app starts
  // syncCurrentUser() should only be called explicitly after login or when needed
  // Load saved posts after initialization
  useStore.getState().loadSavedPosts().catch(console.error);
}

