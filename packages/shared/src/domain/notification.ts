/**
 * Notification Domain Model
 * 
 * Represents a notification in the system.
 */

export type NotificationType = 
  | 'debate_starting' 
  | 'debate_reminder' 
  | 'follow' 
  | 'reaction' 
  | 'comment' 
  | 'mention'
  | 'general';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  debateId?: string | null;
  debateTitle?: string | null;
  postId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorHandle?: string | null;
  read: boolean;
  createdAt: Date | string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  debateId?: string;
  debateTitle?: string;
  postId?: string;
  actorId?: string;
}

export interface NotificationListParams {
  limit?: number;
  offset?: number;
}

export interface UnreadCountResponse {
  count: number;
}
