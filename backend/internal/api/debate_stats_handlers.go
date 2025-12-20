package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/yourusername/v-backend/internal/repository"
)

type DebateStatsHandlers struct {
	repo repository.DebateStatsRepository
}

func NewDebateStatsHandlers(repo repository.DebateStatsRepository) *DebateStatsHandlers {
	return &DebateStatsHandlers{
		repo: repo,
	}
}

// RecordStats handles POST /api/debate-stats
func (h *DebateStatsHandlers) RecordStats(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Topic          string `json:"topic"`
		AgreeCount     int    `json:"agreeCount"`
		DisagreeCount  int    `json:"disagreeCount"`
		Participants   int    `json:"participants"`
		DebateID       string `json:"debateId"` // Optional: track which debate this is for
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate required fields
	if req.Topic == "" {
		Error(w, http.StatusBadRequest, "Topic is required")
		return
	}

	if req.AgreeCount < 0 || req.DisagreeCount < 0 || req.Participants < 0 {
		Error(w, http.StatusBadRequest, "Counts must be non-negative")
		return
	}

	// Log the incoming request for debugging
	log.Printf("[DebateStats] Recording stats: topic=%s, agreeCount=%d, disagreeCount=%d, participants=%d, debateID=%s", 
		req.Topic, req.AgreeCount, req.DisagreeCount, req.Participants, req.DebateID)

	// Record stats
	stats, err := h.repo.RecordStats(req.Topic, req.AgreeCount, req.DisagreeCount, req.Participants, req.DebateID)
	if err != nil {
		log.Printf("[DebateStats] Error recording stats: %v", err)
		Error(w, http.StatusInternalServerError, "Failed to record stats")
		return
	}

	if req.DebateID != "" {
		log.Printf("[DebateStats] Recorded stats for topic: %s, debate: %s (sessions: %d, participants: %d, agree: %d, disagree: %d)", 
			stats.Topic, req.DebateID, stats.SessionsCount, stats.TotalParticipants, stats.TotalAgree, stats.TotalDisagree)
	} else {
		log.Printf("[DebateStats] Recorded stats for topic: %s (sessions: %d, participants: %d, agree: %d, disagree: %d)", 
			stats.Topic, stats.SessionsCount, stats.TotalParticipants, stats.TotalAgree, stats.TotalDisagree)
	}

	JSON(w, http.StatusOK, stats)
}

// GetAllStats handles GET /api/debate-stats
func (h *DebateStatsHandlers) GetAllStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.repo.GetAllStats()
	if err != nil {
		log.Printf("[DebateStats] Error getting stats: %v", err)
		Error(w, http.StatusInternalServerError, "Failed to get stats")
		return
	}

	JSON(w, http.StatusOK, stats)
}

