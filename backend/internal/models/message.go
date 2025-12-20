package models

import "time"

type Conversation struct {
	ID            string    `json:"id"`
	Participant1ID string    `json:"participant1Id"`
	Participant2ID string    `json:"participant2Id"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	SenderID       string    `json:"senderId"`
	Content        string    `json:"content"`
	Read           bool      `json:"read"`
	CreatedAt      time.Time `json:"createdAt"`
}

