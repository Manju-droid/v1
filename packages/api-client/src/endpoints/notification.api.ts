/**
 * Notification API Endpoints
 * 
 * API client methods for notification operations.
 */

import { 
  Notification, 
  CreateNotificationRequest, 
  NotificationListParams,
  UnreadCountResponse 
} from '@v/shared';
import { apiClient } from '../client';

export const notificationAPI = {
  /**
   * List notifications for the current user
   */
  list: async (params?: NotificationListParams): Promise<Notification[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      
      const queryString = queryParams.toString();
      const endpoint = `/notifications${queryString ? `?${queryString}` : ''}`;
      
      const data = await apiClient.get<any>(endpoint);
      
      // Handle both array and object with notifications property
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.notifications)) {
        return data.notifications;
      }
      return [];
    } catch (error) {
      console.error('[Notification API] Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * Get a single notification by ID
   */
  get: (id: string): Promise<Notification> => {
    return apiClient.get<Notification>(`/notifications/${id}`);
  },

  /**
   * Create a new notification
   */
  create: (notification: CreateNotificationRequest): Promise<Notification> => {
    return apiClient.post<Notification>('/notifications', notification);
  },

  /**
   * Mark a notification as read
   */
  markAsRead: (id: string): Promise<void> => {
    return apiClient.patch<void>(`/notifications/${id}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: (): Promise<void> => {
    return apiClient.post<void>('/notifications/read-all');
  },

  /**
   * Delete a notification
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete<void>(`/notifications/${id}`);
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: (): Promise<number> => {
    return apiClient.get<UnreadCountResponse>('/notifications/unread/count')
      .then(response => response.count);
  },
};
