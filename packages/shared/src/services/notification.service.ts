/**
 * Notification Service
 * 
 * Business logic for notifications.
 * Platform-agnostic - works on both web and mobile.
 */

import { Notification, NotificationType } from '../domain/notification';

export class NotificationService {
  /**
   * Mark a notification as read
   */
  static markAsRead(notification: Notification): Notification {
    return {
      ...notification,
      read: true,
    };
  }

  /**
   * Format notification message based on type
   */
  static formatMessage(notification: Notification): string {
    if (notification.message) {
      return notification.message;
    }

    // Generate message based on type if not provided
    switch (notification.type) {
      case 'debate_starting':
        return notification.debateTitle 
          ? `"${notification.debateTitle}" has just started. Join now!`
          : 'A debate has just started. Join now!';
      
      case 'debate_reminder':
        return notification.debateTitle
          ? `"${notification.debateTitle}" starts in 5 minutes. Get ready!`
          : 'A debate starts in 5 minutes. Get ready!';
      
      case 'follow':
        return notification.actorName
          ? `${notification.actorName} started following you`
          : 'Someone started following you';
      
      case 'reaction':
        return notification.actorName
          ? `${notification.actorName} reacted to your post`
          : 'Someone reacted to your post';
      
      case 'comment':
        return notification.actorName
          ? `${notification.actorName} commented on your post`
          : 'Someone commented on your post';
      
      case 'mention':
        return notification.actorName
          ? `${notification.actorName} mentioned you`
          : 'You were mentioned';
      
      default:
        return notification.message || 'You have a new notification';
    }
  }

  /**
   * Get notification icon type (for UI)
   */
  static getIconType(type: NotificationType): string {
    switch (type) {
      case 'debate_starting':
      case 'debate_reminder':
        return 'debate';
      case 'follow':
        return 'user';
      case 'reaction':
        return 'heart';
      case 'comment':
        return 'comment';
      case 'mention':
        return 'mention';
      default:
        return 'bell';
    }
  }

  /**
   * Check if notification is unread
   */
  static isUnread(notification: Notification): boolean {
    return !notification.read;
  }

  /**
   * Get unread count from notifications array
   */
  static getUnreadCount(notifications: Notification[]): number {
    return notifications.filter(n => !n.read).length;
  }

  /**
   * Sort notifications by creation date (newest first)
   */
  static sortByDate(notifications: Notification[]): Notification[] {
    return [...notifications].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Filter notifications by type
   */
  static filterByType(notifications: Notification[], type: NotificationType): Notification[] {
    return notifications.filter(n => n.type === type);
  }

  /**
   * Filter unread notifications
   */
  static filterUnread(notifications: Notification[]): Notification[] {
    return notifications.filter(n => !n.read);
  }
}
