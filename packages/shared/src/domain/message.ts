/**
 * Message Domain Models
 *
 * TypeScript interfaces matching the Go backend models.
 */

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  participants?: Array<{ id: string }>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: Date | string;
}

export interface CreateConversationRequest {
  userId1: string;
  userId2: string;
}

export interface SendMessageRequest {
  senderId: string;
  content: string;
}

export interface MessageListParams {
  limit?: number;
  offset?: number;
}

export interface ConversationListParams {
  userId: string;
}
