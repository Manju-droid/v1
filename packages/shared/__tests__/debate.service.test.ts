/**
 * Unit Tests for Debate Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateCreateDebateRequest,
  validateUpdateDebateRequest,
  validateJoinDebateRequest,
  VALID_DEBATE_DURATIONS,
} from '../src/services/debate.service';
import type { CreateDebateRequest, UpdateDebateRequest, JoinDebateRequest } from '../src/domain/debate';

describe('validateCreateDebateRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should validate correct debate request', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);
    vi.setSystemTime(new Date());

    const request: CreateDebateRequest = {
      title: 'Test Debate',
      hostId: 'user1',
      type: 'PUBLIC',
      durationMinutes: 60,
      startTime: futureDate.toISOString(),
    };
    const result = validateCreateDebateRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing title', () => {
    const request: CreateDebateRequest = {
      title: '',
      hostId: 'user1',
      type: 'PUBLIC',
      durationMinutes: 60,
      startTime: new Date().toISOString(),
    };
    const result = validateCreateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Title');
  });

  it('should reject title too long', () => {
    const request: CreateDebateRequest = {
      title: 'A'.repeat(101),
      hostId: 'user1',
      type: 'PUBLIC',
      durationMinutes: 60,
      startTime: new Date().toISOString(),
    };
    const result = validateCreateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('100 characters');
  });

  it('should reject missing hostId', () => {
    const request: CreateDebateRequest = {
      title: 'Test Debate',
      hostId: '',
      type: 'PUBLIC',
      durationMinutes: 60,
      startTime: new Date().toISOString(),
    };
    const result = validateCreateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Host ID');
  });

  it('should reject invalid type', () => {
    const request: CreateDebateRequest = {
      title: 'Test Debate',
      hostId: 'user1',
      type: 'INVALID' as any,
      durationMinutes: 60,
      startTime: new Date().toISOString(),
    };
    const result = validateCreateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("'PUBLIC' or 'PRIVATE'");
  });

  it('should reject invalid duration', () => {
    const request: CreateDebateRequest = {
      title: 'Test Debate',
      hostId: 'user1',
      type: 'PUBLIC',
      durationMinutes: 45 as any,
      startTime: new Date().toISOString(),
    };
    const result = validateCreateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Duration');
  });

  it('should accept valid durations', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);
    vi.setSystemTime(new Date());

    VALID_DEBATE_DURATIONS.forEach((duration) => {
      const request: CreateDebateRequest = {
        title: 'Test Debate',
        hostId: 'user1',
        type: 'PUBLIC',
        durationMinutes: duration,
        startTime: futureDate.toISOString(),
      };
      const result = validateCreateDebateRequest(request);
      expect(result.valid).toBe(true);
    });
  });

  it('should reject missing startTime', () => {
    const request: CreateDebateRequest = {
      title: 'Test Debate',
      hostId: 'user1',
      type: 'PUBLIC',
      durationMinutes: 60,
      startTime: '' as any,
    };
    const result = validateCreateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Start time');
  });

  it('should reject startTime in the past', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 2);
    vi.setSystemTime(new Date());

    const request: CreateDebateRequest = {
      title: 'Test Debate',
      hostId: 'user1',
      type: 'PUBLIC',
      durationMinutes: 60,
      startTime: pastDate.toISOString(),
    };
    const result = validateCreateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('future or now');
  });
});

describe('validateUpdateDebateRequest', () => {
  it('should validate correct update request', () => {
    const request: UpdateDebateRequest = {
      title: 'Updated Title',
      status: 'ACTIVE',
    };
    const result = validateUpdateDebateRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should allow partial updates', () => {
    const request: UpdateDebateRequest = {
      title: 'Updated Title',
    };
    const result = validateUpdateDebateRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject empty title', () => {
    const request: UpdateDebateRequest = {
      title: '   ',
    };
    const result = validateUpdateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should reject title too long', () => {
    const request: UpdateDebateRequest = {
      title: 'A'.repeat(101),
    };
    const result = validateUpdateDebateRequest(request);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid status', () => {
    const request: UpdateDebateRequest = {
      status: 'INVALID' as any,
    };
    const result = validateUpdateDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid status');
  });

  it('should accept valid statuses', () => {
    const validStatuses = ['SCHEDULED', 'ACTIVE', 'ENDED'] as const;
    validStatuses.forEach((status) => {
      const request: UpdateDebateRequest = { status };
      const result = validateUpdateDebateRequest(request);
      expect(result.valid).toBe(true);
    });
  });
});

describe('validateJoinDebateRequest', () => {
  it('should validate correct join request', () => {
    const request: JoinDebateRequest = {
      userId: 'user1',
      side: 'AGREE',
    };
    const result = validateJoinDebateRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject missing userId', () => {
    const request: JoinDebateRequest = {
      userId: '',
      side: 'AGREE',
    };
    const result = validateJoinDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('User ID');
  });

  it('should accept valid sides', () => {
    const validSides = ['AGREE', 'DISAGREE'] as const;
    validSides.forEach((side) => {
      const request: JoinDebateRequest = { userId: 'user1', side };
      const result = validateJoinDebateRequest(request);
      expect(result.valid).toBe(true);
    });
  });

  it('should accept request without side (optional)', () => {
    const request: JoinDebateRequest = { userId: 'user1' };
    const result = validateJoinDebateRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid side', () => {
    const request: JoinDebateRequest = {
      userId: 'user1',
      side: 'SPECTATOR' as any,
    };
    const result = validateJoinDebateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("'AGREE' or 'DISAGREE'");
  });
});
