/**
 * Moderation Service
 * 
 * Business logic and validation for moderation operations.
 */

import type {
  ReportPostRequest,
  RejectPostRequest,
  ModerationQueueParams,
} from '../domain/moderation';

/**
 * Validate report post request
 */
export function validateReportPostRequest(request: ReportPostRequest): {
  valid: boolean;
  error?: string;
} {
  if (!request.reporterId || request.reporterId.trim().length === 0) {
    return { valid: false, error: 'Reporter ID is required' };
  }

  return { valid: true };
}

/**
 * Validate reject post request
 */
export function validateRejectPostRequest(request: RejectPostRequest): {
  valid: boolean;
  error?: string;
} {
  // applyPenalty is optional, defaults to true
  // No validation needed, just return valid
  return { valid: true };
}

/**
 * Validate moderation queue params
 */
export function validateModerationQueueParams(params: ModerationQueueParams): {
  valid: boolean;
  error?: string;
  normalized: ModerationQueueParams;
} {
  const normalized: ModerationQueueParams = {};

  if (params.limit !== undefined) {
    if (params.limit < 1) {
      return { valid: false, error: 'Limit must be at least 1', normalized };
    }
    if (params.limit > 100) {
      return { valid: false, error: 'Limit must be at most 100', normalized };
    }
    normalized.limit = params.limit;
  }

  if (params.offset !== undefined) {
    if (params.offset < 0) {
      return { valid: false, error: 'Offset must be non-negative', normalized };
    }
    normalized.offset = params.offset;
  }

  return { valid: true, normalized };
}

/**
 * Check if post needs moderation
 */
export function needsModeration(
  reportCount: number,
  status: string
): boolean {
  return (
    reportCount > 0 ||
    status === 'ABUSIVE_FLAG' ||
    status === 'TEMP_HIDDEN'
  );
}

/**
 * Check if post is in moderation queue
 */
export function isInModerationQueue(inModerationQueue: boolean): boolean {
  return inModerationQueue;
}


