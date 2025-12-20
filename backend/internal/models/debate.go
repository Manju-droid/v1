package models

import "time"

type Debate struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	Category        string     `json:"category"`
	HostID          string     `json:"hostId"`
	Type            string     `json:"type"`            // "PUBLIC" or "PRIVATE"
	Status          string     `json:"status"`          // "SCHEDULED", "ACTIVE", "ENDED"
	StartTime       time.Time  `json:"startTime"`
	EndTime         *time.Time `json:"endTime,omitempty"`
	DurationMinutes int        `json:"durationMinutes"` // 30, 60, 360, 1440
	ShowInPulse     bool       `json:"showInPulse"`     // Only applies to PUBLIC debates
	AgreeCount      int        `json:"agreeCount"`
	DisagreeCount   int        `json:"disagreeCount"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type DebateParticipant struct {
	ID            string     `json:"id"`
	DebateID      string     `json:"debateId"`
	UserID        string     `json:"userId"`
	Role          string     `json:"role"`          // "HOST" or "USER"
	Side          string     `json:"side"`          // "AGREE", "DISAGREE", or "" (host is neutral)
	IsSelfMuted   bool       `json:"isSelfMuted"`   // User's own mute state
	IsMutedByHost bool       `json:"isMutedByHost"` // Host force-mute state
	JoinedAt      time.Time  `json:"joinedAt"`
	LeftAt        *time.Time `json:"leftAt,omitempty"`
}

type SpeakRequest struct {
	ID        string    `json:"id"`
	DebateID  string    `json:"debateId"`
	UserID    string    `json:"userId"`
	Status    string    `json:"status"` // "pending", "approved", "denied"
	CreatedAt time.Time `json:"createdAt"`
}

