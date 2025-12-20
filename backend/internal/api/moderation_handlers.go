package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/yourusername/v-backend/internal/service"
)

type ModerationHandlers struct {
	modService *service.ModerationService
}

func NewModerationHandlers(modService *service.ModerationService) *ModerationHandlers {
	return &ModerationHandlers{
		modService: modService,
	}
}

// Report a post
func (h *ModerationHandlers) ReportPost(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	var req struct {
		ReporterID string `json:"reporterId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.ReporterID, "reporterId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.modService.ReportPost(postID, req.ReporterID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Post reported successfully")
}

// Get moderation queue (admin only)
func (h *ModerationHandlers) GetModerationQueue(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	posts, err := h.modService.GetModerationQueue(limit, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"posts":  posts,
		"limit":  limit,
		"offset": offset,
	})
}

// Approve post (admin only)
func (h *ModerationHandlers) ApprovePost(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	if err := h.modService.ApprovePost(postID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Post approved successfully")
}

// Reject post (admin only)
func (h *ModerationHandlers) RejectPost(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	var req struct {
		ApplyPenalty bool `json:"applyPenalty"`
	}

	// Default to true if not specified
	req.ApplyPenalty = true
	if r.Body != nil {
		json.NewDecoder(r.Body).Decode(&req)
	}

	if err := h.modService.RejectPost(postID, req.ApplyPenalty); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Post rejected successfully")
}

