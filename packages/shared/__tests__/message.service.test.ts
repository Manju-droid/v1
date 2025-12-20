/**
 * Unit Tests for Message Service
 */

import { describe, it, expect } from 'vitest';
import {
  validateSendMessageRequest,
  isMessageRead,
  isMessageUnread,
  getUnreadCount,
  getOtherParticipant,
  isConversationParticipant,
} from '../src/services/message.service';
import type { Message, Conversation, SendMessageRequest } from '../src/domain/message';

describe('validateSendMessageRequest', () => {
  it('should validate correct message request', () => {
    const request: SendMessageRequest = {
      senderId: 'user1',
      content: 'Hello, this is a test message',
    };
    const result = validateSendMessageRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing senderId', () => {
    const request: SendMessageRequest = {
      senderId: '',
      content: 'Test message',
    };
    const result = validateSendMessageRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Sender ID');
  });

  it('should reject missing content', () => {
    const request: SendMessageRequest = {
      senderId: 'user1',
      content: '',
    };
    const result = validateSendMessageRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Message content');
  });

  it('should reject content too long', () => {
    const request: SendMessageRequest = {
      senderId: 'user1',
      content: 'A'.repeat(5001),
    };
    const result = validateSendMessageRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5000 characters');
  });

  it('should accept content at max length', () => {
    const request: SendMessageRequest = {
      senderId: 'user1',
      content: 'A'.repeat(5000),
    };
    const result = validateSendMessageRequest(request);
    expect(result.valid).toBe(true);
  });
});

describe('isMessageRead', () => {
  it('should return true for read messages', () => {
    const message: Message = {
      id: 'msg1',
      conversationId: 'conv1',
      senderId: 'user1',
      content: 'Test',
      read: true,
      createdAt: new Date(),
    };
    expect(isMessageRead(message)).toBe(true);
  });

  it('should return false for unread messages', () => {
    const message: Message = {
      id: 'msg1',
      conversationId: 'conv1',
      senderId: 'user1',
      content: 'Test',
      read: false,
      createdAt: new Date(),
    };
    expect(isMessageRead(message)).toBe(false);
  });
});

describe('isMessageUnread', () => {
  it('should return true for unread messages', () => {
    const message: Message = {
      id: 'msg1',
      conversationId: 'conv1',
      senderId: 'user1',
      content: 'Test',
      read: false,
      createdAt: new Date(),
    };
    expect(isMessageUnread(message)).toBe(true);
  });

  it('should return false for read messages', () => {
    const message: Message = {
      id: 'msg1',
      conversationId: 'conv1',
      senderId: 'user1',
      content: 'Test',
      read: true,
      createdAt: new Date(),
    };
    expect(isMessageUnread(message)).toBe(false);
  });
});

describe('getUnreadCount', () => {
  it('should count unread messages from other users', () => {
    const messages: Message[] = [
      {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user1',
        content: 'Message 1',
        read: false,
        createdAt: new Date(),
      },
      {
        id: 'msg2',
        conversationId: 'conv1',
        senderId: 'user2',
        content: 'Message 2',
        read: false,
        createdAt: new Date(),
      },
      {
        id: 'msg3',
        conversationId: 'conv1',
        senderId: 'user1',
        content: 'Message 3',
        read: true,
        createdAt: new Date(),
      },
    ];
    expect(getUnreadCount(messages, 'user1')).toBe(1); // Only msg2 is unread from other user
  });

  it('should not count own messages', () => {
    const messages: Message[] = [
      {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user1',
        content: 'Message 1',
        read: false,
        createdAt: new Date(),
      },
    ];
    expect(getUnreadCount(messages, 'user1')).toBe(0);
  });

  it('should return 0 for empty messages', () => {
    expect(getUnreadCount([], 'user1')).toBe(0);
  });

  it('should return 0 when all messages are read', () => {
    const messages: Message[] = [
      {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user2',
        content: 'Message 1',
        read: true,
        createdAt: new Date(),
      },
    ];
    expect(getUnreadCount(messages, 'user1')).toBe(0);
  });
});

describe('getOtherParticipant', () => {
  it('should return participant2Id when current user is participant1', () => {
    const conversation: Conversation = {
      id: 'conv1',
      participant1Id: 'user1',
      participant2Id: 'user2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(getOtherParticipant(conversation, 'user1')).toBe('user2');
  });

  it('should return participant1Id when current user is participant2', () => {
    const conversation: Conversation = {
      id: 'conv1',
      participant1Id: 'user1',
      participant2Id: 'user2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(getOtherParticipant(conversation, 'user2')).toBe('user1');
  });
});

describe('isConversationParticipant', () => {
  it('should return true for participant1', () => {
    const conversation: Conversation = {
      id: 'conv1',
      participant1Id: 'user1',
      participant2Id: 'user2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isConversationParticipant(conversation, 'user1')).toBe(true);
  });

  it('should return true for participant2', () => {
    const conversation: Conversation = {
      id: 'conv1',
      participant1Id: 'user1',
      participant2Id: 'user2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isConversationParticipant(conversation, 'user2')).toBe(true);
  });

  it('should return false for non-participant', () => {
    const conversation: Conversation = {
      id: 'conv1',
      participant1Id: 'user1',
      participant2Id: 'user2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isConversationParticipant(conversation, 'user3')).toBe(false);
  });
});
