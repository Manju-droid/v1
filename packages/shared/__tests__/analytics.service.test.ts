/**
 * Unit Tests for Analytics Service
 */

import { describe, it, expect } from 'vitest';
import {
  validateRecordImpressionRequest,
  calculateEngagementRate,
  formatEngagementRate,
  formatReach,
  isValidAnalytics,
} from '../src/services/analytics.service';
import type { RecordImpressionRequest, PostAnalytics } from '../src/domain/analytics';

describe('validateRecordImpressionRequest', () => {
  it('should validate correct request', () => {
    const request: RecordImpressionRequest = {
      postId: 'post1',
      userId: 'user1',
    };
    const result = validateRecordImpressionRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing postId', () => {
    const request: RecordImpressionRequest = {
      postId: '',
      userId: 'user1',
    };
    const result = validateRecordImpressionRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Post ID');
  });

  it('should reject missing userId', () => {
    const request: RecordImpressionRequest = {
      postId: 'post1',
      userId: '',
    };
    const result = validateRecordImpressionRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('User ID');
  });
});

describe('calculateEngagementRate', () => {
  it('should calculate engagement rate correctly', () => {
    expect(calculateEngagementRate(10, 5, 3, 100)).toBe(18); // (10+5+3)/100 * 100
    expect(calculateEngagementRate(20, 10, 5, 200)).toBe(17.5); // (20+10+5)/200 * 100
  });

  it('should return 0 when impressions is 0', () => {
    expect(calculateEngagementRate(10, 5, 3, 0)).toBe(0);
  });

  it('should handle zero engagements', () => {
    expect(calculateEngagementRate(0, 0, 0, 100)).toBe(0);
  });

  it('should handle high engagement rates', () => {
    expect(calculateEngagementRate(50, 30, 20, 100)).toBe(100); // 100% engagement
  });
});

describe('formatEngagementRate', () => {
  it('should format rate as percentage with 2 decimals', () => {
    expect(formatEngagementRate(18.5)).toBe('18.50%');
    expect(formatEngagementRate(17.567)).toBe('17.57%');
    expect(formatEngagementRate(0)).toBe('0.00%');
  });

  it('should handle whole numbers', () => {
    expect(formatEngagementRate(25)).toBe('25.00%');
  });
});

describe('formatReach', () => {
  it('should format numbers less than 1000 as-is', () => {
    expect(formatReach(0)).toBe('0');
    expect(formatReach(100)).toBe('100');
    expect(formatReach(999)).toBe('999');
  });

  it('should format thousands with K suffix', () => {
    expect(formatReach(1000)).toBe('1.0K');
    expect(formatReach(1500)).toBe('1.5K');
    expect(formatReach(9999)).toBe('10.0K');
  });

  it('should format millions with M suffix', () => {
    expect(formatReach(1000000)).toBe('1.0M');
    expect(formatReach(1500000)).toBe('1.5M');
    expect(formatReach(2500000)).toBe('2.5M');
  });
});

describe('isValidAnalytics', () => {
  it('should return true for valid analytics', () => {
    const analytics: PostAnalytics = {
      postId: 'post1',
      reach_24h: 100,
      reach_all: 500,
      impressions: 1000,
      engagement: 50,
    };
    expect(isValidAnalytics(analytics)).toBe(true);
  });

  it('should return true for zero values', () => {
    const analytics: PostAnalytics = {
      postId: 'post1',
      reach_24h: 0,
      reach_all: 0,
      impressions: 0,
      engagement: 0,
    };
    expect(isValidAnalytics(analytics)).toBe(true);
  });

  it('should return false for negative reach_24h', () => {
    const analytics: PostAnalytics = {
      postId: 'post1',
      reach_24h: -1,
      reach_all: 500,
      impressions: 1000,
      engagement: 50,
    };
    expect(isValidAnalytics(analytics)).toBe(false);
  });

  it('should return false for negative reach_all', () => {
    const analytics: PostAnalytics = {
      postId: 'post1',
      reach_24h: 100,
      reach_all: -1,
      impressions: 1000,
      engagement: 50,
    };
    expect(isValidAnalytics(analytics)).toBe(false);
  });

  it('should return false for negative impressions', () => {
    const analytics: PostAnalytics = {
      postId: 'post1',
      reach_24h: 100,
      reach_all: 500,
      impressions: -1,
      engagement: 50,
    };
    expect(isValidAnalytics(analytics)).toBe(false);
  });

  it('should return false for negative engagement', () => {
    const analytics: PostAnalytics = {
      postId: 'post1',
      reach_24h: 100,
      reach_all: 500,
      impressions: 1000,
      engagement: -1,
    };
    expect(isValidAnalytics(analytics)).toBe(false);
  });
});
