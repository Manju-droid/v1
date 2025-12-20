/**
 * Debate Stats Domain Models
 *
 * TypeScript interfaces for debate statistics.
 */

export interface DebateTopicStats {
  topic: string;
  totalParticipants: number;
  totalAgree: number;
  totalDisagree: number;
  sessionsCount: number;
  lastUpdated: Date | string;
}

export interface RecordDebateStatsRequest {
  topic: string;
  agreeCount: number;
  disagreeCount: number;
  participants: number;
  debateId?: string; // Optional: track which debate this is for (prevents duplicates)
}
