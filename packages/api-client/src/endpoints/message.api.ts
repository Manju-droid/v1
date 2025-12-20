/**
 * Message API Client
 *
 * API methods for message and conversation operations.
 */

import { request } from '../client';
import type {
  Conversation,
  Message,
  CreateConversationRequest,
  SendMessageRequest,
  ConversationListParams,
  MessageListParams,
} from '@v/shared';

/**
 * List conversations for a user
 */
export async function listConversations(
  params: ConversationListParams
): Promise<Conversation[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('userId', params.userId);

  const data = await request<any>(
    `/messages/conversations?${queryParams}`
  );
  return Array.isArray(data) ? data : [];
}

/**
 * Create conversation
 */
export async function createConversation(
  data: CreateConversationRequest
): Promise<Conversation> {
  return request<Conversation>('/messages/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation> {
  return request<Conversation>(`/messages/conversations/${id}`);
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  params?: MessageListParams
): Promise<Message[]> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const response = await request<any>(
    `/messages/conversations/${conversationId}/messages${queryParams.toString() ? `?${queryParams}` : ''}`
  );

  // Backend returns { messages: [...], limit: ..., offset: ... }
  if (response && response.messages && Array.isArray(response.messages)) {
    return response.messages;
  }
  if (Array.isArray(response)) {
    return response;
  }
  return [];
}

/**
 * Send message
 */
export async function sendMessage(
  conversationId: string,
  data: SendMessageRequest
): Promise<Message> {
  return request<Message>(
    `/messages/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  return request<void>(`/messages/messages/${messageId}/read`, {
    method: 'PATCH',
  });
}

/**
 * Get unread count for a conversation
 */
export async function getUnreadCount(
  conversationId: string,
  userId: string
): Promise<number> {
  const queryParams = new URLSearchParams();
  queryParams.append('userId', userId);

  const response = await request<{ unreadCount: number }>(
    `/messages/conversations/${conversationId}/unread?${queryParams}`
  );
  return response.unreadCount || 0;
}

/**
 * Message API object
 */
export const messageAPI = {
  listConversations: listConversations,
  createConversation: createConversation,
  getConversation: getConversation,
  getMessages: getMessages,
  sendMessage: sendMessage,
  markAsRead: markMessageAsRead,
  getUnreadCount: getUnreadCount,
};
