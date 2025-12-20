package models

import "time"

type Notification struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	Type        string    `json:"type"` // debate_starting, debate_reminder, follow, comment, reaction, mention
	Title       string    `json:"title"`
	Message     string    `json:"message"`
	DebateID    *string   `json:"debateId,omitempty"`
	DebateTitle *string   `json:"debateTitle,omitempty"`
	PostID      *string   `json:"postId,omitempty"`
	ActorID     *string   `json:"actorId,omitempty"`     // User who triggered the notification
	ActorName   *string   `json:"actorName,omitempty"`
	ActorHandle *string   `json:"actorHandle,omitempty"`
	Read        bool      `json:"read"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CreateNotificationRequest struct {
	UserID      string  `json:"userId" validate:"required"`
	Type        string  `json:"type" validate:"required"`
	Title       string  `json:"title" validate:"required"`
	Message     string  `json:"message" validate:"required"`
	DebateID    *string `json:"debateId,omitempty"`
	DebateTitle *string `json:"debateTitle,omitempty"`
	PostID      *string `json:"postId,omitempty"`
	ActorID     *string `json:"actorId,omitempty"`
}

