package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
)

type AnalyticsHandlers struct {
	analyticsRepo repository.AnalyticsRepository
}

func NewAnalyticsHandlers(analyticsRepo repository.AnalyticsRepository) *AnalyticsHandlers {
	return &AnalyticsHandlers{
		analyticsRepo: analyticsRepo,
	}
}

func (h *AnalyticsHandlers) RecordImpression(w http.ResponseWriter, r *http.Request) {
	var req models.ImpressionRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validation
	if err := ValidateRequired(req.PostID, "postId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.analyticsRepo.RecordImpression(req.PostID, req.UserID); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to record impression")
		return
	}

	Success(w, "Impression recorded")
}

func (h *AnalyticsHandlers) GetPostMetrics(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	metrics, err := h.analyticsRepo.GetPostMetrics(postID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get metrics")
		return
	}

	JSON(w, http.StatusOK, metrics)
}

func (h *AnalyticsHandlers) GetPostAnalytics(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	analytics, err := h.analyticsRepo.GetPostAnalytics(postID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get analytics")
		return
	}

	JSON(w, http.StatusOK, analytics)
}

