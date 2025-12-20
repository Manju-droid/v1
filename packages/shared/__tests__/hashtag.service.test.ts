/**
 * Unit Tests for Hashtag Service
 */

import { describe, it, expect } from 'vitest';
import { HashtagService } from '../src/services/hashtag.service';
import type { CreateHashtagRequest } from '../src/domain/hashtag';

describe('HashtagService.generateSlug', () => {
  it('should generate slug from name', () => {
    expect(HashtagService.generateSlug('Test Hashtag')).toBe('test-hashtag');
    expect(HashtagService.generateSlug('My Awesome Tag')).toBe('my-awesome-tag');
  });

  it('should handle special characters', () => {
    expect(HashtagService.generateSlug('Test@Hashtag#123')).toBe('testhashtag123');
    expect(HashtagService.generateSlug('Test  Hashtag')).toBe('test-hashtag');
  });

  it('should handle multiple spaces', () => {
    expect(HashtagService.generateSlug('Test    Hashtag')).toBe('test-hashtag');
  });

  it('should handle leading/trailing hyphens', () => {
    expect(HashtagService.generateSlug('-Test Hashtag-')).toBe('test-hashtag');
  });

  it('should handle multiple consecutive hyphens', () => {
    expect(HashtagService.generateSlug('Test--Hashtag')).toBe('test-hashtag');
  });

  it('should handle empty string', () => {
    expect(HashtagService.generateSlug('')).toBe('');
  });

  it('should handle only special characters', () => {
    expect(HashtagService.generateSlug('@#$%')).toBe('');
  });
});

describe('HashtagService.validateName', () => {
  it('should validate correct name', () => {
    const result = HashtagService.validateName('Test Hashtag');
    expect(result.valid).toBe(true);
  });

  it('should reject empty name', () => {
    const result = HashtagService.validateName('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject name too short', () => {
    const result = HashtagService.validateName('A');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 2 characters');
  });

  it('should reject name too long', () => {
    const result = HashtagService.validateName('A'.repeat(51));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('50 characters');
  });

  it('should accept name at min length', () => {
    const result = HashtagService.validateName('AB');
    expect(result.valid).toBe(true);
  });

  it('should accept name at max length', () => {
    const result = HashtagService.validateName('A'.repeat(50));
    expect(result.valid).toBe(true);
  });

  it('should reject invalid characters', () => {
    const result = HashtagService.validateName('Test@Hashtag');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('letters, numbers');
  });

  it('should accept valid characters', () => {
    expect(HashtagService.validateName('Test Hashtag').valid).toBe(true);
    expect(HashtagService.validateName('Test-Hashtag').valid).toBe(true);
    expect(HashtagService.validateName('Test_Hashtag').valid).toBe(true);
    expect(HashtagService.validateName('Test123').valid).toBe(true);
  });
});

describe('HashtagService.validateSlug', () => {
  it('should validate correct slug', () => {
    const result = HashtagService.validateSlug('test-hashtag');
    expect(result.valid).toBe(true);
  });

  it('should reject empty slug', () => {
    const result = HashtagService.validateSlug('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject slug too short', () => {
    const result = HashtagService.validateSlug('a');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 2 characters');
  });

  it('should reject slug too long', () => {
    const result = HashtagService.validateSlug('a'.repeat(51));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('50 characters');
  });

  it('should reject uppercase letters', () => {
    const result = HashtagService.validateSlug('Test-Hashtag');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase');
  });

  it('should reject underscores', () => {
    const result = HashtagService.validateSlug('test_hashtag');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase letters, numbers, and hyphens');
  });

  it('should accept valid slug', () => {
    expect(HashtagService.validateSlug('test-hashtag').valid).toBe(true);
    expect(HashtagService.validateSlug('test123').valid).toBe(true);
    expect(HashtagService.validateSlug('test-hashtag-123').valid).toBe(true);
  });
});

describe('HashtagService.validateCreateHashtag', () => {
  it('should validate correct create request', () => {
    const request: CreateHashtagRequest = {
      name: 'Test Hashtag',
      slug: 'test-hashtag',
      createdBy: 'user1',
    };
    const result = HashtagService.validateCreateHashtag(request);
    expect(result.valid).toBe(true);
  });

  it('should validate request without slug (optional)', () => {
    const request: CreateHashtagRequest = {
      name: 'Test Hashtag',
      createdBy: 'user1',
    };
    const result = HashtagService.validateCreateHashtag(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing createdBy', () => {
    const request: CreateHashtagRequest = {
      name: 'Test Hashtag',
      slug: 'test-hashtag',
      createdBy: '',
    };
    const result = HashtagService.validateCreateHashtag(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Created by');
  });

  it('should reject invalid name', () => {
    const request: CreateHashtagRequest = {
      name: 'A',
      slug: 'test-hashtag',
    };
    const result = HashtagService.validateCreateHashtag(request);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid slug', () => {
    const request: CreateHashtagRequest = {
      name: 'Test Hashtag',
      slug: 'Test_Hashtag',
    };
    const result = HashtagService.validateCreateHashtag(request);
    expect(result.valid).toBe(false);
  });
});
