/**
 * Message Service
 *
 * Business logic for messages and conversations.
 * Platform-agnostic - works on both web and mobile.
 */

import { Message, Conversation, SendMessageRequest } from '../domain';

/**
 * Validate send message request
 */
export function validateSendMessageRequest(
  request: SendMessageRequest
): { valid: boolean; error?: string } {
  if (!request.senderId || request.senderId.trim().length === 0) {
    return { valid: false, error: 'Sender ID is required' };
  }

  if (!request.content || request.content.trim().length === 0) {
    return { valid: false, error: 'Message content is required' };
  }

  if (request.content.length > 5000) {
    return { valid: false, error: 'Message content must be 5000 characters or less' };
  }

  return { valid: true };
}

/**
 * Check if message is read
 */
export function isMessageRead(message: Message): boolean {
  return message.read;
}

/**
 * Check if message is unread
 */
export function isMessageUnread(message: Message): boolean {
  return !message.read;
}

/**
 * Get unread messages count
 */
export function getUnreadCount(messages: Message[], userId: string): number {
  return messages.filter(
    (m) => !m.read && m.senderId !== userId
  ).length;
}

/**
 * Get other participant ID from conversation
 */
export function getOtherParticipant(
  conversation: Conversation,
  currentUserId: string
): string {
  if (conversation.participant1Id === currentUserId) {
    return conversation.participant2Id;
  }
  return conversation.participant1Id;
}

/**
 * Check if user is participant in conversation
 */
export function isConversationParticipant(
  conversation: Conversation,
  userId: string
): boolean {
  return (
    conversation.participant1Id === userId ||
    conversation.participant2Id === userId
  );
}

/**
 * Sort messages by creation time (oldest first)
 */
export function sortMessagesByCreatedAt(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const timeA =
      typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const timeB =
      typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
    return timeA.getTime() - timeB.getTime();
  });
}

/**
 * Sort messages by creation time (newest first)
 */
export function sortMessagesByCreatedAtDesc(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const timeA =
      typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const timeB =
      typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
    return timeB.getTime() - timeA.getTime();
  });
}

/**
 * Sort conversations by updated time (newest first)
 */
export function sortConversationsByUpdatedAt(
  conversations: Conversation[]
): Conversation[] {
  return [...conversations].sort((a, b) => {
    const timeA =
      typeof a.updatedAt === 'string' ? new Date(a.updatedAt) : a.updatedAt;
    const timeB =
      typeof b.updatedAt === 'string' ? new Date(b.updatedAt) : b.updatedAt;
    return timeB.getTime() - timeA.getTime();
  });
}

/**
 * Filter messages by sender
 */
export function filterMessagesBySender(
  messages: Message[],
  senderId: string
): Message[] {
  return messages.filter((m) => m.senderId === senderId);
}

/**
 * Filter unread messages
 */
export function filterUnreadMessages(messages: Message[], userId: string): Message[] {
  return messages.filter((m) => !m.read && m.senderId !== userId);
}

// Re-export types for convenience
export type { Message, Conversation } from '../domain';
