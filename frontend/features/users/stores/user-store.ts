import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { userAPI } from '@v/api-client';

export type UserTier = 'SILVER' | 'PLATINUM';

export interface UserPoints {
  tier: UserTier;
  points: number;
  subscriptionActive: boolean;
  temporarilyMuted: boolean;
  mutedUntil?: string;
  loginStreak: number;
  debatesHostedToday: number;
}

interface UserStore {
  userPoints: UserPoints | null;
  loading: boolean;

  // Actions
  fetchUserPoints: (userId: string) => Promise<void>;
  updateUserPoints: (points: Partial<UserPoints>) => void;
  refreshUserPoints: (userId: string) => Promise<void>;
}

const defaultPoints: UserPoints = {
  tier: 'SILVER',
  points: 0,
  subscriptionActive: false,
  temporarilyMuted: false,
  loginStreak: 0,
  debatesHostedToday: 0,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      userPoints: null,
      loading: false,

      fetchUserPoints: async (userId: string) => {
        // Only run on client side
        if (typeof window === 'undefined') {
          return;
        }

        set({ loading: true });
        try {
          const user = await userAPI.getById(userId);
          set({
            userPoints: {
              tier: (user.tier as UserTier) || 'SILVER',
              points: user.points || 0,
              subscriptionActive: user.subscriptionActive || false,
              temporarilyMuted: user.temporarilyMuted || false,
              mutedUntil: user.mutedUntil instanceof Date ? user.mutedUntil.toISOString() : user.mutedUntil,
              loginStreak: user.loginStreak || 0,
              debatesHostedToday: user.debatesHostedToday || 0,
            },
            loading: false,
          });
        } catch (error: any) {
          // Handle 404 (user not found) silently - use default values
          if (error?.message?.includes('User not found') || error?.message?.includes('404')) {
            // User doesn't exist in backend yet - use default values
            set({
              userPoints: defaultPoints,
              loading: false,
            });
            return;
          }
          // For other errors, log but don't break the app
          console.warn('Failed to fetch user points:', error.message || error);
          // Don't set default points on error, keep existing or null
          // This allows the app to continue working even if API is unavailable
          set({ loading: false });
        }
      },

      updateUserPoints: (points: Partial<UserPoints>) => {
        const current = get().userPoints || defaultPoints;
        set({
          userPoints: {
            ...current,
            ...points,
          },
        });
      },

      refreshUserPoints: async (userId: string) => {
        await get().fetchUserPoints(userId);
      },
    }),
    {
      name: 'v-user-points-storage',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
    }
  )
);
