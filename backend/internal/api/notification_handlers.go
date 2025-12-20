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

type NotificationHandlers struct {
	notifRepo repository.NotificationRepository
	userRepo  repository.UserRepository
}

func NewNotificationHandlers(notifRepo repository.NotificationRepository, userRepo repository.UserRepository) *NotificationHandlers {
	return &NotificationHandlers{
		notifRepo: notifRepo,
		userRepo:  userRepo,
	}
}

func (h *NotificationHandlers) List(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	// Parse query params
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	notifications, err := h.notifRepo.GetByUserID(userID, limit, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get notifications")
		return
	}

	JSON(w, http.StatusOK, notifications)
}

func (h *NotificationHandlers) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateNotificationRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validation
	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateRequired(req.Type, "type"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateRequired(req.Title, "title"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateRequired(req.Message, "message"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Get actor details if provided
	var actorName, actorHandle *string
	if req.ActorID != nil {
		actor, err := h.userRepo.GetByID(*req.ActorID)
		if err == nil {
			actorName = &actor.Name
			actorHandle = &actor.Handle
		}
	}

	notification := &models.Notification{
		ID:          uuid.New().String(),
		UserID:      req.UserID,
		Type:        req.Type,
		Title:       req.Title,
		Message:     req.Message,
		DebateID:    req.DebateID,
		DebateTitle: req.DebateTitle,
		PostID:      req.PostID,
		ActorID:     req.ActorID,
		ActorName:   actorName,
		ActorHandle: actorHandle,
		Read:        false,
		CreatedAt:   time.Now(),
	}

	if err := h.notifRepo.Create(notification); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create notification")
		return
	}

	Created(w, notification)
}

func (h *NotificationHandlers) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := r.Context().Value("userID").(string)

	notification, err := h.notifRepo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Notification not found")
		return
	}

	// Check if notification belongs to the user
	if notification.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	JSON(w, http.StatusOK, notification)
}

func (h *NotificationHandlers) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := r.Context().Value("userID").(string)

	notification, err := h.notifRepo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Notification not found")
		return
	}

	// Check if notification belongs to the user
	if notification.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.notifRepo.MarkAsRead(id); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to mark as read")
		return
	}

	Success(w, "Notification marked as read")
}

func (h *NotificationHandlers) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	if err := h.notifRepo.MarkAllAsRead(userID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to mark all as read")
		return
	}

	Success(w, "All notifications marked as read")
}

func (h *NotificationHandlers) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := r.Context().Value("userID").(string)

	notification, err := h.notifRepo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Notification not found")
		return
	}

	// Check if notification belongs to the user
	if notification.UserID != userID {
		Error(w, http.StatusForbidden, "Access denied")
		return
	}

	if err := h.notifRepo.Delete(id); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete notification")
		return
	}

	NoContent(w)
}

func (h *NotificationHandlers) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	count, err := h.notifRepo.GetUnreadCount(userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get unread count")
		return
	}

	JSON(w, http.StatusOK, map[string]int{"count": count})
}

