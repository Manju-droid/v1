import { create } from 'zustand';
import { notificationAPI } from '@v/api-client';
import { Notification, NotificationType } from '@v/shared';
import { NotificationService } from '@v/shared';
import { getCurrentUser } from './currentUser';

interface NotificationState {
  notifications: Notification[];
  registeredDebateIds: Set<string>;
  remindDebateIds: Set<string>;
  isLoading: boolean;
  lastFetch: number | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => void;

  // Debate tracking
  registerDebate: (debateId: string, debateTitle: string) => void;
  unregisterDebate: (debateId: string) => void;
  addReminder: (debateId: string, debateTitle: string) => void;

  // Check if should notify
  checkAndNotifyDebates: (runningDebateIds: string[], allDebates: Array<{ id: string; title: string }>) => void;

  // Getters
  getUnreadCount: () => number;
  
  // Use shared service for unread count
  getUnreadCountFromService: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  registeredDebateIds: new Set<string>(),
  remindDebateIds: new Set<string>(),
  isLoading: false,
  lastFetch: null,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      console.log('[Notifications] Fetching notifications...');
      const notifications = await notificationAPI.list({ limit: 100 });
      console.log('[Notifications] Received notifications:', notifications);
      console.log('[Notifications] Number of notifications:', notifications?.length || 0);
      
      // Ensure we always set notifications, even if empty
      const notificationList = Array.isArray(notifications) ? notifications : [];
      set({
        notifications: notificationList,
        lastFetch: Date.now(),
        isLoading: false
      });
      
      if (notificationList.length === 0) {
        console.log('[Notifications] No notifications found in response');
      }
    } catch (error: any) {
      console.error('[Notifications] Error fetching notifications:', error);
      console.error('[Notifications] Error details:', {
        message: error?.message,
        status: error?.status,
        response: error?.response
      });
      
      // Silently fail if not authenticated (user not logged in)
      if (error?.message?.includes('Authorization') || 
          error?.message?.includes('token') || 
          error?.status === 401 || 
          error?.status === 403) {
        console.warn('[Notifications] Not authenticated, clearing notifications');
        set({ isLoading: false, notifications: [] });
      } else {
        // For other errors, still clear loading state but keep existing notifications
        console.error('[Notifications] Failed to fetch notifications, keeping existing ones');
        set({ isLoading: false });
      }
    }
  },

  addNotification: (notification) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      notifications: [
        {
          ...notification,
          id,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ].slice(0, 100), // Keep only last 100 notifications
    }));
  },

  markAsRead: async (notificationId) => {
    try {
      // Optimistically update UI
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      }));

      // Sync with backend
      await notificationAPI.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  markAllAsRead: async () => {
    try {
      // Optimistically update UI
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }));

      // Sync with backend
      await notificationAPI.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      // Optimistically update UI
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
      }));

      // Sync with backend
      await notificationAPI.delete(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  clearAll: () => set({ notifications: [] }),

  registerDebate: (debateId, debateTitle) => {
    set((state) => {
      const newSet = new Set(state.registeredDebateIds);
      newSet.add(debateId);
      return { registeredDebateIds: newSet };
    });
  },

  unregisterDebate: (debateId) => {
    set((state) => {
      const newRegistered = new Set(state.registeredDebateIds);
      newRegistered.delete(debateId);
      const newRemind = new Set(state.remindDebateIds);
      newRemind.delete(debateId);
      return {
        registeredDebateIds: newRegistered,
        remindDebateIds: newRemind,
      };
    });
  },

  addReminder: (debateId, debateTitle) => {
    set((state) => {
      const newSet = new Set(state.remindDebateIds);
      newSet.add(debateId);
      return { remindDebateIds: newSet };
    });
  },

  checkAndNotifyDebates: (runningDebateIds, allDebates) => {
    const state = get();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    // Track which debates we've already notified about (for 5-min and start notifications)
    const notifiedDebates = new Set(
      state.notifications
        .filter((n) => (n.type === 'debate_starting' || n.type === 'debate_reminder') && n.debateId)
        .map((n) => n.debateId as string)
    );

    // Check all debates (not just running ones) for 5-minute reminders
    allDebates.forEach((debate: any) => {
      if (!debate.startTime) return;
      
      const startTime = new Date(debate.startTime).getTime();
      const timeUntilStart = startTime - now;
      
      // Check if debate is starting in ~5 minutes (within 5-6 minute window to avoid duplicates)
      const isFiveMinutesBefore = timeUntilStart > 0 && timeUntilStart <= fiveMinutes + 60000 && timeUntilStart >= fiveMinutes - 60000;
      
      // Check if debate just started (within last minute)
      const justStarted = timeUntilStart <= 0 && timeUntilStart >= -60000;
      
      if (isFiveMinutesBefore || justStarted) {
        // Skip if already notified
        if (notifiedDebates.has(debate.id)) return;

        // Check if user registered or set reminder
        const shouldNotify =
          state.registeredDebateIds.has(debate.id) ||
          state.remindDebateIds.has(debate.id);

        if (shouldNotify) {
          if (isFiveMinutesBefore) {
            // Send 5-minute reminder
            const currentUser = getCurrentUser();
            if (currentUser?.id) {
              get().addNotification({
                userId: currentUser.id,
                type: 'debate_reminder',
                title: '⏰ Debate Starting Soon!',
                message: `"${debate.title}" starts in 5 minutes. Get ready!`,
                debateId: debate.id,
                debateTitle: debate.title,
              });
            }
            notifiedDebates.add(debate.id);
          } else if (justStarted) {
            // Send start notification
            const currentUser = getCurrentUser();
            if (currentUser?.id) {
              get().addNotification({
                userId: currentUser.id,
                type: 'debate_starting',
                title: 'Debate Starting Now! 🎙️',
                message: `"${debate.title}" has just started. Join now!`,
                debateId: debate.id,
                debateTitle: debate.title,
              });
            }
            notifiedDebates.add(debate.id);
            
            // Clean up the tracking after start notification
            const newRegistered = new Set(state.registeredDebateIds);
            newRegistered.delete(debate.id);
            const newRemind = new Set(state.remindDebateIds);
            newRemind.delete(debate.id);
            set({
              registeredDebateIds: newRegistered,
              remindDebateIds: newRemind,
            });
          }
        }
      }
    });

    // Also check running debates for immediate start notifications (backward compatibility)
    runningDebateIds.forEach((debateId) => {
      if (notifiedDebates.has(debateId)) return;

      const debate = allDebates.find((d: any) => d.id === debateId);
      if (!debate) return;

      const shouldNotify =
        state.registeredDebateIds.has(debateId) ||
        state.remindDebateIds.has(debateId);

      if (shouldNotify) {
        const currentUser = getCurrentUser();
        if (currentUser?.id) {
          get().addNotification({
            userId: currentUser.id,
            type: 'debate_starting',
            title: 'Debate Starting Now! 🎙️',
            message: `"${debate.title}" has just started. Join now!`,
            debateId: debate.id,
            debateTitle: debate.title,
          });
        }

        // Clean up the tracking
        const newRegistered = new Set(state.registeredDebateIds);
        newRegistered.delete(debateId);
        const newRemind = new Set(state.remindDebateIds);
        newRemind.delete(debateId);
        set({
          registeredDebateIds: newRegistered,
          remindDebateIds: newRemind,
        });
      }
    });
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  getUnreadCountFromService: () => {
    return NotificationService.getUnreadCount(get().notifications);
  },
}));

// Auto-fetch notifications on app load and poll every 30 seconds
if (typeof window !== 'undefined') {
  const store = useNotificationStore.getState();

  // Helper to check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('auth_token');
    return !!token;
  };

  // Initial fetch (only if authenticated)
  if (isAuthenticated()) {
    store.fetchNotifications();
  }

  // Poll for new notifications every 30 seconds (only if authenticated)
  setInterval(() => {
    if (isAuthenticated()) {
      store.fetchNotifications();
    }
  }, 30000);
}
