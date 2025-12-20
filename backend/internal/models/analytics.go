package models

import "time"

type PostImpression struct {
	ID        string    `json:"id"`
	PostID    string    `json:"postId"`
	UserID    string    `json:"userId"`
	Timestamp time.Time `json:"timestamp"`
}

type PostAnalytics struct {
	PostID      string `json:"postId"`
	Reach24h    int    `json:"reach_24h"`     // Unique viewers in last 24h
	ReachAll    int    `json:"reach_all"`     // All-time unique viewers
	Impressions int    `json:"impressions"`   // Total views (not unique)
	Reactions   int    `json:"reactions"`     // Total reactions
	Comments    int    `json:"comments"`      // Total comments
	Saves       int    `json:"saves"`         // Total saves
	Engagement  float64 `json:"engagement"`   // Engagement rate
}

type PostMetrics struct {
	Reach24h    int     `json:"reach_24h"`
	ReachAll    int     `json:"reach_all"`
	Impressions int     `json:"impressions"`
	Engagement  float64 `json:"engagement"`
}

type ImpressionRequest struct {
	PostID string `json:"postId" validate:"required"`
	UserID string `json:"userId" validate:"required"`
}

