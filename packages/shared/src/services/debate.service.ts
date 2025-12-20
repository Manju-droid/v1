/**
 * Debate Service
 *
 * Business logic for debates.
 * Platform-agnostic - works on both web and mobile.
 */

import {
  Debate,
  DebateType,
  DebateStatus,
  DebateSide,
  DebateParticipant,
  CreateDebateRequest,
  UpdateDebateRequest,
  JoinDebateRequest,
  SpeakRequestStatus,
} from '../domain';

/**
 * Valid debate durations in minutes
 */
export const VALID_DEBATE_DURATIONS = [30, 60, 360, 1440] as const;

/**
 * Validate debate creation request
 */
export function validateCreateDebateRequest(
  request: CreateDebateRequest
): { valid: boolean; error?: string } {
  if (!request.title || request.title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }

  if (request.title.length > 100) {
    return { valid: false, error: 'Title must be 100 characters or less' };
  }

  if (!request.hostId || request.hostId.trim().length === 0) {
    return { valid: false, error: 'Host ID is required' };
  }

  if (!request.type || (request.type !== 'PUBLIC' && request.type !== 'PRIVATE')) {
    return { valid: false, error: "Type must be 'PUBLIC' or 'PRIVATE'" };
  }

  if (!VALID_DEBATE_DURATIONS.includes(request.durationMinutes as any)) {
    return { valid: false, error: 'Duration must be 30, 60, 360, or 1440 minutes' };
  }

  if (!request.startTime) {
    return { valid: false, error: 'Start time is required' };
  }

  try {
    const startTime = new Date(request.startTime);
    if (isNaN(startTime.getTime())) {
      return { valid: false, error: 'Invalid start time format (use RFC3339)' };
    }

    // Allow 1 minute buffer for latency
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    if (startTime < oneMinuteAgo) {
      return { valid: false, error: 'Start time must be in the future or now' };
    }
  } catch (e) {
    return { valid: false, error: 'Invalid start time format' };
  }

  return { valid: true };
}

/**
 * Validate debate update request
 */
export function validateUpdateDebateRequest(
  request: UpdateDebateRequest
): { valid: boolean; error?: string } {
  if (request.title !== undefined) {
    if (request.title.trim().length === 0) {
      return { valid: false, error: 'Title cannot be empty' };
    }
    if (request.title.length > 100) {
      return { valid: false, error: 'Title must be 100 characters or less' };
    }
  }

  if (request.status !== undefined) {
    const validStatuses: DebateStatus[] = ['SCHEDULED', 'ACTIVE', 'ENDED'];
    if (!validStatuses.includes(request.status)) {
      return { valid: false, error: 'Invalid status' };
    }
  }

  return { valid: true };
}

/**
 * Validate join debate request
 */
export function validateJoinDebateRequest(
  request: JoinDebateRequest
): { valid: boolean; error?: string } {
  if (!request.userId || request.userId.trim().length === 0) {
    return { valid: false, error: 'User ID is required' };
  }

  if (request.side && request.side !== 'agree' && request.side !== 'disagree' && request.side !== 'neutral' && request.side !== 'spectator' && request.side !== '') {
    return { valid: false, error: "Side must be 'agree', 'disagree', 'neutral', or 'spectator'" };
  }

  return { valid: true };
}

/**
 * Check if debate is active
 */
export function isDebateActive(debate: Debate): boolean {
  return debate.status === 'ACTIVE';
}

/**
 * Check if debate is scheduled
 */
export function isDebateScheduled(debate: Debate): boolean {
  return debate.status === 'SCHEDULED';
}

/**
 * Check if debate has ended
 */
export function isDebateEnded(debate: Debate): boolean {
  return debate.status === 'ENDED';
}

/**
 * Check if debate is public
 */
export function isPublicDebate(debate: Debate): boolean {
  return debate.type === 'PUBLIC';
}

/**
 * Check if debate is private
 */
export function isPrivateDebate(debate: Debate): boolean {
  return debate.type === 'PRIVATE';
}

/**
 * Get debate duration in human-readable format
 */
export function formatDebateDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  const days = Math.floor(minutes / 1440);
  return `${days} day${days > 1 ? 's' : ''}`;
}

/**
 * Calculate debate end time from start time and duration
 */
export function calculateEndTime(
  startTime: Date | string,
  durationMinutes: number
): Date {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Check if user is host
 */
export function isHost(debate: Debate, userId: string): boolean {
  return debate.hostId === userId;
}

/**
 * Check if user is participant
 */
export function isParticipant(
  participants: DebateParticipant[],
  userId: string
): boolean {
  return participants.some((p) => p.userId === userId);
}

/**
 * Get participant by user ID
 */
export function getParticipant(
  participants: DebateParticipant[],
  userId: string
): DebateParticipant | undefined {
  return participants.find((p) => p.userId === userId);
}


/**
 * Filter debates by status
 */
export function filterDebatesByStatus(
  debates: Debate[],
  status: DebateStatus
): Debate[] {
  return debates.filter((d) => d.status === status);
}

/**
 * Sort debates by start time (newest first)
 */
export function sortDebatesByStartTime(debates: Debate[]): Debate[] {
  return [...debates].sort((a, b) => {
    const timeA = typeof a.startTime === 'string' ? new Date(a.startTime) : a.startTime;
    const timeB = typeof b.startTime === 'string' ? new Date(b.startTime) : b.startTime;
    return timeB.getTime() - timeA.getTime();
  });
}

/**
 * Sort debates by creation time (newest first)
 */
export function sortDebatesByCreatedAt(debates: Debate[]): Debate[] {
  return [...debates].sort((a, b) => {
    const timeA =
      typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const timeB =
      typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
    return timeB.getTime() - timeA.getTime();
  });
}

// Re-export types for convenience
export type { Debate, DebateParticipant } from '../domain';
