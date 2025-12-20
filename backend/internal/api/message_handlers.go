package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
)

type MessageHandlers struct {
	repo repository.MessageRepository
}

func NewMessageHandlers(repo repository.MessageRepository) *MessageHandlers {
	return &MessageHandlers{repo: repo}
}

func (h *MessageHandlers) CreateConversation(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Participant1ID string `json:"participant1Id"`
		Participant2ID string `json:"participant2Id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.Participant1ID, "participant1Id"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateRequired(req.Participant2ID, "participant2Id"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Participant1ID == req.Participant2ID {
		Error(w, http.StatusBadRequest, "Cannot create conversation with yourself")
		return
	}

	// Check if conversation already exists
	existing, _ := h.repo.GetConversationByParticipants(req.Participant1ID, req.Participant2ID)
	if existing != nil {
		JSON(w, http.StatusOK, existing)
		return
	}

	conversation := &models.Conversation{
		ID:             uuid.New().String(),
		Participant1ID: req.Participant1ID,
		Participant2ID: req.Participant2ID,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := h.repo.CreateConversation(conversation); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Created(w, conversation)
}

func (h *MessageHandlers) GetConversation(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	conversation, err := h.repo.GetConversation(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Conversation not found")
		return
	}

	JSON(w, http.StatusOK, conversation)
}

func (h *MessageHandlers) ListConversations(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")

	if userID == "" {
		Error(w, http.StatusBadRequest, "userId is required")
		return
	}

	conversations, err := h.repo.ListConversations(userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, conversations)
}

func (h *MessageHandlers) SendMessage(w http.ResponseWriter, r *http.Request) {
	conversationID := chi.URLParam(r, "id")

	var req struct {
		SenderID string `json:"senderId"`
		Content  string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.SenderID, "senderId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateContentLength(req.Content, 5000); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	message := &models.Message{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		SenderID:       req.SenderID,
		Content:        req.Content,
		Read:           false,
		CreatedAt:      time.Now(),
	}

	if err := h.repo.CreateMessage(message); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Created(w, message)
}

func (h *MessageHandlers) GetMessages(w http.ResponseWriter, r *http.Request) {
	conversationID := chi.URLParam(r, "id")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	messages, err := h.repo.ListMessages(conversationID, limit, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"messages": messages,
		"limit":    limit,
		"offset":   offset,
	})
}

func (h *MessageHandlers) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	messageID := chi.URLParam(r, "messageId")

	if err := h.repo.MarkAsRead(messageID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Message marked as read")
}

func (h *MessageHandlers) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	conversationID := chi.URLParam(r, "id")
	userID := r.URL.Query().Get("userId")

	if userID == "" {
		Error(w, http.StatusBadRequest, "userId is required")
		return
	}

	count, err := h.repo.GetUnreadCount(conversationID, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"unreadCount": count,
	})
}

