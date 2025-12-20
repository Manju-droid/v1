/**
 * Unit Tests for Notification Service
 */
import { describe, it, expect } from 'vitest';
import { NotificationService } from '../src/services/notification.service';
describe('NotificationService.markAsRead', () => {
    it('should mark notification as read', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'follow',
            read: false,
            createdAt: new Date(),
        };
        const result = NotificationService.markAsRead(notification);
        expect(result.read).toBe(true);
        expect(result.id).toBe(notification.id);
    });
    it('should preserve other notification properties', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'reaction',
            read: false,
            message: 'Test message',
            createdAt: new Date(),
        };
        const result = NotificationService.markAsRead(notification);
        expect(result.message).toBe('Test message');
        expect(result.type).toBe('reaction');
    });
});
describe('NotificationService.formatMessage', () => {
    it('should return provided message if available', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'follow',
            message: 'Custom message',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.formatMessage(notification)).toBe('Custom message');
    });
    it('should format debate_starting notification', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'debate_starting',
            debateTitle: 'Test Debate',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.formatMessage(notification)).toContain('Test Debate');
        expect(NotificationService.formatMessage(notification)).toContain('started');
    });
    it('should format debate_reminder notification', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'debate_reminder',
            debateTitle: 'Test Debate',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.formatMessage(notification)).toContain('Test Debate');
        expect(NotificationService.formatMessage(notification)).toContain('5 minutes');
    });
    it('should format follow notification', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'follow',
            actorName: 'John Doe',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.formatMessage(notification)).toContain('John Doe');
        expect(NotificationService.formatMessage(notification)).toContain('following');
    });
    it('should format reaction notification', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'reaction',
            actorName: 'Jane Doe',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.formatMessage(notification)).toContain('Jane Doe');
        expect(NotificationService.formatMessage(notification)).toContain('reacted');
    });
    it('should format comment notification', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'comment',
            actorName: 'Bob Smith',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.formatMessage(notification)).toContain('Bob Smith');
        expect(NotificationService.formatMessage(notification)).toContain('commented');
    });
    it('should format mention notification', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'mention',
            actorName: 'Alice',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.formatMessage(notification)).toContain('Alice');
        expect(NotificationService.formatMessage(notification)).toContain('mentioned');
    });
    it('should use fallback when actorName is missing', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'follow',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.formatMessage(notification)).toContain('Someone');
    });
});
describe('NotificationService.getIconType', () => {
    it('should return correct icon for debate types', () => {
        expect(NotificationService.getIconType('debate_starting')).toBe('debate');
        expect(NotificationService.getIconType('debate_reminder')).toBe('debate');
    });
    it('should return correct icon for follow', () => {
        expect(NotificationService.getIconType('follow')).toBe('user');
    });
    it('should return correct icon for reaction', () => {
        expect(NotificationService.getIconType('reaction')).toBe('heart');
    });
    it('should return correct icon for comment', () => {
        expect(NotificationService.getIconType('comment')).toBe('comment');
    });
    it('should return correct icon for mention', () => {
        expect(NotificationService.getIconType('mention')).toBe('mention');
    });
    it('should return default icon for unknown types', () => {
        expect(NotificationService.getIconType('unknown')).toBe('bell');
    });
});
describe('NotificationService.isUnread', () => {
    it('should return true for unread notifications', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'follow',
            read: false,
            createdAt: new Date(),
        };
        expect(NotificationService.isUnread(notification)).toBe(true);
    });
    it('should return false for read notifications', () => {
        const notification = {
            id: 'notif1',
            userId: 'user1',
            type: 'follow',
            read: true,
            createdAt: new Date(),
        };
        expect(NotificationService.isUnread(notification)).toBe(false);
    });
});
describe('NotificationService.getUnreadCount', () => {
    it('should count unread notifications', () => {
        const notifications = [
            { id: '1', userId: 'user1', type: 'follow', read: false, createdAt: new Date() },
            { id: '2', userId: 'user1', type: 'reaction', read: true, createdAt: new Date() },
            { id: '3', userId: 'user1', type: 'comment', read: false, createdAt: new Date() },
        ];
        expect(NotificationService.getUnreadCount(notifications)).toBe(2);
    });
    it('should return 0 for all read notifications', () => {
        const notifications = [
            { id: '1', userId: 'user1', type: 'follow', read: true, createdAt: new Date() },
            { id: '2', userId: 'user1', type: 'reaction', read: true, createdAt: new Date() },
        ];
        expect(NotificationService.getUnreadCount(notifications)).toBe(0);
    });
    it('should return 0 for empty array', () => {
        expect(NotificationService.getUnreadCount([])).toBe(0);
    });
});
describe('NotificationService.sortByDate', () => {
    it('should sort notifications by date (newest first)', () => {
        const now = new Date();
        const notifications = [
            { id: '1', userId: 'user1', type: 'follow', read: false, createdAt: new Date(now.getTime() - 1000) },
            { id: '2', userId: 'user1', type: 'reaction', read: false, createdAt: new Date(now.getTime() - 2000) },
            { id: '3', userId: 'user1', type: 'comment', read: false, createdAt: now },
        ];
        const sorted = NotificationService.sortByDate(notifications);
        expect(sorted[0].id).toBe('3');
        expect(sorted[1].id).toBe('1');
        expect(sorted[2].id).toBe('2');
    });
    it('should not mutate original array', () => {
        const notifications = [
            { id: '1', userId: 'user1', type: 'follow', read: false, createdAt: new Date() },
        ];
        const sorted = NotificationService.sortByDate(notifications);
        expect(sorted).not.toBe(notifications);
    });
});
describe('NotificationService.filterByType', () => {
    it('should filter notifications by type', () => {
        const notifications = [
            { id: '1', userId: 'user1', type: 'follow', read: false, createdAt: new Date() },
            { id: '2', userId: 'user1', type: 'reaction', read: false, createdAt: new Date() },
            { id: '3', userId: 'user1', type: 'follow', read: false, createdAt: new Date() },
        ];
        const filtered = NotificationService.filterByType(notifications, 'follow');
        expect(filtered.length).toBe(2);
        expect(filtered.every(n => n.type === 'follow')).toBe(true);
    });
    it('should return empty array if no matches', () => {
        const notifications = [
            { id: '1', userId: 'user1', type: 'follow', read: false, createdAt: new Date() },
        ];
        const filtered = NotificationService.filterByType(notifications, 'comment');
        expect(filtered.length).toBe(0);
    });
});
describe('NotificationService.filterUnread', () => {
    it('should filter unread notifications', () => {
        const notifications = [
            { id: '1', userId: 'user1', type: 'follow', read: false, createdAt: new Date() },
            { id: '2', userId: 'user1', type: 'reaction', read: true, createdAt: new Date() },
            { id: '3', userId: 'user1', type: 'comment', read: false, createdAt: new Date() },
        ];
        const filtered = NotificationService.filterUnread(notifications);
        expect(filtered.length).toBe(2);
        expect(filtered.every(n => !n.read)).toBe(true);
    });
});
