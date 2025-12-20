/**
 * Analytics Domain Models
 * 
 * Domain models for analytics operations.
 */

export interface PostImpression {
  id: string;
  postId: string;
  userId: string;
  timestamp: Date | string;
}

export interface PostAnalytics {
  postId: string;
  reach_24h: number; // Unique viewers in last 24h
  reach_all: number; // All-time unique viewers
  impressions: number; // Total views (not unique)
  reactions: number; // Total reactions
  comments: number; // Total comments
  saves: number; // Total saves
  engagement: number; // Engagement rate
}

export interface AnalyticsPostMetrics {
  reach_24h: number;
  reach_all: number;
  impressions: number;
  engagement: number;
}

export interface RecordImpressionRequest {
  postId: string;
  userId: string;
}


