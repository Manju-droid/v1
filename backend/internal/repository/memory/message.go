package memory

import (
	"errors"
	"sync"
	"time"

	"github.com/yourusername/v-backend/internal/models"
)

type MessageMemoryRepository struct {
	conversations map[string]*models.Conversation
	messages      map[string]*models.Message
	mu            sync.RWMutex
}

func NewMessageMemoryRepository() *MessageMemoryRepository {
	return &MessageMemoryRepository{
		conversations: make(map[string]*models.Conversation),
		messages:      make(map[string]*models.Message),
	}
}

func (r *MessageMemoryRepository) CreateConversation(conv *models.Conversation) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.conversations[conv.ID]; exists {
		return errors.New("conversation already exists")
	}

	conv.CreatedAt = time.Now()
	conv.UpdatedAt = time.Now()
	r.conversations[conv.ID] = conv
	return nil
}

func (r *MessageMemoryRepository) GetConversation(id string) (*models.Conversation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	conv, exists := r.conversations[id]
	if !exists {
		return nil, errors.New("conversation not found")
	}
	return conv, nil
}

func (r *MessageMemoryRepository) GetConversationByParticipants(user1ID, user2ID string) (*models.Conversation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, conv := range r.conversations {
		if (conv.Participant1ID == user1ID && conv.Participant2ID == user2ID) ||
			(conv.Participant1ID == user2ID && conv.Participant2ID == user1ID) {
			return conv, nil
		}
	}

	return nil, errors.New("conversation not found")
}

func (r *MessageMemoryRepository) ListConversations(userID string) ([]*models.Conversation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	conversations := make([]*models.Conversation, 0)
	for _, conv := range r.conversations {
		if conv.Participant1ID == userID || conv.Participant2ID == userID {
			conversations = append(conversations, conv)
		}
	}

	return conversations, nil
}

func (r *MessageMemoryRepository) CreateMessage(message *models.Message) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.messages[message.ID]; exists {
		return errors.New("message already exists")
	}

	// Verify conversation exists
	if _, exists := r.conversations[message.ConversationID]; !exists {
		return errors.New("conversation not found")
	}

	message.CreatedAt = time.Now()
	r.messages[message.ID] = message

	// Update conversation timestamp
	r.conversations[message.ConversationID].UpdatedAt = time.Now()

	return nil
}

func (r *MessageMemoryRepository) GetMessage(id string) (*models.Message, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	message, exists := r.messages[id]
	if !exists {
		return nil, errors.New("message not found")
	}
	return message, nil
}

func (r *MessageMemoryRepository) ListMessages(conversationID string, limit, offset int) ([]*models.Message, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	messages := make([]*models.Message, 0)
	for _, message := range r.messages {
		if message.ConversationID == conversationID {
			messages = append(messages, message)
		}
	}

	// In production, sort by created time
	// For now, return as-is

	start := offset
	if start > len(messages) {
		return []*models.Message{}, nil
	}

	end := start + limit
	if end > len(messages) {
		end = len(messages)
	}

	return messages[start:end], nil
}

func (r *MessageMemoryRepository) MarkAsRead(messageID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	message, exists := r.messages[messageID]
	if !exists {
		return errors.New("message not found")
	}

	message.Read = true
	return nil
}

func (r *MessageMemoryRepository) GetUnreadCount(conversationID, userID string) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	count := 0
	for _, message := range r.messages {
		if message.ConversationID == conversationID &&
			message.SenderID != userID &&
			!message.Read {
			count++
		}
	}

	return count, nil
}

