/**
 * Unit Tests for Utility Functions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatRelativeTime, formatNumber, isValidEmail, isValidHandle, truncateText, } from '../src/utils';
describe('formatRelativeTime', () => {
    beforeEach(() => {
        // Mock Date.now() for consistent testing
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it('should return "just now" for dates less than a minute ago', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);
        const date = new Date('2024-01-01T11:59:30Z');
        expect(formatRelativeTime(date)).toBe('just now');
    });
    it('should format minutes correctly', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);
        const date1 = new Date('2024-01-01T11:59:00Z');
        expect(formatRelativeTime(date1)).toBe('1 minute ago');
        const date2 = new Date('2024-01-01T11:45:00Z');
        expect(formatRelativeTime(date2)).toBe('15 minutes ago');
    });
    it('should format hours correctly', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);
        const date1 = new Date('2024-01-01T11:00:00Z');
        expect(formatRelativeTime(date1)).toBe('1 hour ago');
        const date2 = new Date('2024-01-01T09:00:00Z');
        expect(formatRelativeTime(date2)).toBe('3 hours ago');
    });
    it('should format days correctly', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);
        const date1 = new Date('2023-12-31T12:00:00Z');
        expect(formatRelativeTime(date1)).toBe('1 day ago');
        const date2 = new Date('2023-12-29T12:00:00Z');
        expect(formatRelativeTime(date2)).toBe('3 days ago');
    });
});
describe('formatNumber', () => {
    it('should format numbers less than 1000 as-is', () => {
        expect(formatNumber(0)).toBe('0');
        expect(formatNumber(100)).toBe('100');
        expect(formatNumber(999)).toBe('999');
    });
    it('should format thousands with K suffix', () => {
        expect(formatNumber(1000)).toBe('1.0K');
        expect(formatNumber(1500)).toBe('1.5K');
        expect(formatNumber(9999)).toBe('10.0K');
        expect(formatNumber(12345)).toBe('12.3K');
    });
    it('should format millions with M suffix', () => {
        expect(formatNumber(1000000)).toBe('1.0M');
        expect(formatNumber(1500000)).toBe('1.5M');
        expect(formatNumber(2500000)).toBe('2.5M');
    });
    it('should handle edge cases', () => {
        expect(formatNumber(999999)).toBe('1000.0K');
        expect(formatNumber(9999999)).toBe('10.0M');
    });
});
describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
        expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
        expect(isValidEmail('user+tag@example.com')).toBe(true);
        expect(isValidEmail('user123@test-domain.com')).toBe(true);
    });
    it('should reject invalid email addresses', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('invalid@')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('user@')).toBe(false);
        expect(isValidEmail('user@domain')).toBe(false);
        expect(isValidEmail('user space@example.com')).toBe(false);
        expect(isValidEmail('')).toBe(false);
    });
});
describe('isValidHandle', () => {
    it('should validate correct handles', () => {
        expect(isValidHandle('user123')).toBe(true);
        expect(isValidHandle('test_user')).toBe(true);
        expect(isValidHandle('user-name')).toBe(true);
        expect(isValidHandle('abc')).toBe(true);
        expect(isValidHandle('a'.repeat(20))).toBe(true);
    });
    it('should reject invalid handles', () => {
        expect(isValidHandle('ab')).toBe(false); // Too short
        expect(isValidHandle('a'.repeat(21))).toBe(false); // Too long
        expect(isValidHandle('user name')).toBe(false); // Space
        expect(isValidHandle('user@name')).toBe(false); // Special char
        expect(isValidHandle('user.name')).toBe(false); // Dot
        expect(isValidHandle('')).toBe(false); // Empty
    });
});
describe('truncateText', () => {
    it('should return text as-is if shorter than maxLength', () => {
        expect(truncateText('short', 10)).toBe('short');
        expect(truncateText('exact', 5)).toBe('exact');
    });
    it('should truncate text longer than maxLength', () => {
        expect(truncateText('this is a long text', 10)).toBe('this is a ...');
        expect(truncateText('hello world', 5)).toBe('hello...');
    });
    it('should handle edge cases', () => {
        expect(truncateText('', 10)).toBe('');
        expect(truncateText('text', 0)).toBe('...');
        expect(truncateText('text', 4)).toBe('text');
    });
});
