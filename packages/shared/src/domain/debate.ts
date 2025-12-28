/**
 * Debate Domain Models
 *
 * TypeScript interfaces matching the Go backend models.
 */

export type DebateType = 'PUBLIC' | 'PRIVATE';
export type DebateStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED';
export type DebateRole = 'HOST' | 'USER';
export type DebateSide = 'agree' | 'disagree' | 'neutral' | 'spectator' | '';
export type SpeakRequestStatus = 'pending' | 'approved' | 'denied';

export interface Debate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  hostId: string;
  type: DebateType;
  status: DebateStatus;
  startTime: Date | string;
  endTime?: Date | string | null;
  durationMinutes: number; // 30, 60, 360, 1440
  showInPulse: boolean; // Only applies to PUBLIC debates
  agreeCount: number;
  disagreeCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  isLocked: boolean;
  unlockPhase: number;
  earlyAccessRoles?: string[];
  // Frontend-only fields (populated from backend)
  host?: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
    displayName?: string;
    avatar?: string;
  };
}

export interface DebateParticipant {
  id: string;
  debateId: string;
  userId: string;
  role: DebateRole;
  side: DebateSide;
  isSelfMuted: boolean;
  isMutedByHost: boolean;
  joinedAt: Date | string;
  leftAt?: Date | string | null;
  // Frontend-only fields
  displayName?: string;
  handle?: string;
  avatar?: string;
  isHost?: boolean;
  isSpeaking?: boolean;
  hasSwitched?: boolean;
}

export interface SpeakRequest {
  id: string;
  debateId: string;
  userId: string;
  status: SpeakRequestStatus;
  createdAt: Date | string;
}

export interface CreateDebateRequest {
  title: string;
  description?: string;
  category?: string;
  hostId: string;
  type: DebateType;
  startTime: string; // RFC3339 format
  durationMinutes: number; // 30, 60, 360, 1440
  showInPulse?: boolean;
}

export interface UpdateDebateRequest {
  title?: string;
  description?: string;
  category?: string;
  status?: DebateStatus;
}

export interface JoinDebateRequest {
  userId: string;
  side: DebateSide;
}

export interface UpdateParticipantRequest {
  userId: string;
  isMutedByHost?: boolean;
}

export interface UpdateSelfMuteRequest {
  userId: string;
  isSelfMuted: boolean;
}

export interface AwardWinRequest {
  winnerId: string;
}

export interface UpdateSpeakRequestRequest {
  status: SpeakRequestStatus;
}

export interface DebateListParams {
  status?: DebateStatus;
  limit?: number;
  offset?: number;
}
