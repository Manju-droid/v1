/**
 * Unit Tests for Moderation Service
 */
import { describe, it, expect } from 'vitest';
import { validateReportPostRequest, validateRejectPostRequest, validateModerationQueueParams, needsModeration, } from '../src/services/moderation.service';
describe('validateReportPostRequest', () => {
    it('should validate correct report request', () => {
        const request = {
            reporterId: 'user1',
            postId: 'post1',
        };
        const result = validateReportPostRequest(request);
        expect(result.valid).toBe(true);
    });
    it('should reject missing reporterId', () => {
        const request = {
            reporterId: '',
            postId: 'post1',
        };
        const result = validateReportPostRequest(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Reporter ID');
    });
});
describe('validateRejectPostRequest', () => {
    it('should always return valid (no validation needed)', () => {
        const request = {
            postId: 'post1',
            applyPenalty: true,
        };
        const result = validateRejectPostRequest(request);
        expect(result.valid).toBe(true);
    });
    it('should accept request without applyPenalty', () => {
        const request = {
            postId: 'post1',
        };
        const result = validateRejectPostRequest(request);
        expect(result.valid).toBe(true);
    });
});
describe('validateModerationQueueParams', () => {
    it('should validate correct params', () => {
        const params = {
            limit: 10,
            offset: 0,
        };
        const result = validateModerationQueueParams(params);
        expect(result.valid).toBe(true);
        expect(result.normalized.limit).toBe(10);
        expect(result.normalized.offset).toBe(0);
    });
    it('should allow partial params', () => {
        const params = {
            limit: 20,
        };
        const result = validateModerationQueueParams(params);
        expect(result.valid).toBe(true);
        expect(result.normalized.limit).toBe(20);
    });
    it('should reject limit too small', () => {
        const params = {
            limit: 0,
        };
        const result = validateModerationQueueParams(params);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at least 1');
    });
    it('should reject limit too large', () => {
        const params = {
            limit: 101,
        };
        const result = validateModerationQueueParams(params);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at most 100');
    });
    it('should accept limit at boundaries', () => {
        expect(validateModerationQueueParams({ limit: 1 }).valid).toBe(true);
        expect(validateModerationQueueParams({ limit: 100 }).valid).toBe(true);
    });
    it('should reject negative offset', () => {
        const params = {
            offset: -1,
        };
        const result = validateModerationQueueParams(params);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non-negative');
    });
    it('should accept zero offset', () => {
        const params = {
            offset: 0,
        };
        const result = validateModerationQueueParams(params);
        expect(result.valid).toBe(true);
        expect(result.normalized.offset).toBe(0);
    });
});
describe('needsModeration', () => {
    it('should return true when reportCount > 0', () => {
        expect(needsModeration(1, 'VISIBLE')).toBe(true);
        expect(needsModeration(5, 'VISIBLE')).toBe(true);
    });
    it('should return false when reportCount is 0 and status is normal', () => {
        expect(needsModeration(0, 'VISIBLE')).toBe(false);
    });
    it('should return true for ABUSIVE_FLAG status', () => {
        expect(needsModeration(0, 'ABUSIVE_FLAG')).toBe(true);
        expect(needsModeration(0, 'ABUSIVE_FLAG')).toBe(true);
    });
    it('should return true for TEMP_HIDDEN status', () => {
        expect(needsModeration(0, 'TEMP_HIDDEN')).toBe(true);
    });
    it('should return false for REMOVED status', () => {
        expect(needsModeration(0, 'REMOVED')).toBe(false);
    });
    it('should return true when both conditions met', () => {
        expect(needsModeration(5, 'ABUSIVE_FLAG')).toBe(true);
    });
});
