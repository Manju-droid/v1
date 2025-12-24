package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
	"github.com/yourusername/v-backend/internal/service"
)

type HashtagHandlers struct {
	repo     repository.HashtagRepository
	userRepo repository.UserRepository
	hub      *service.Hub
}

func NewHashtagHandlers(repo repository.HashtagRepository, userRepo repository.UserRepository, hub *service.Hub) *HashtagHandlers {
	return &HashtagHandlers{
		repo:     repo,
		userRepo: userRepo,
		hub:      hub,
	}
}

func (h *HashtagHandlers) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      string `json:"name"`
		Slug      string `json:"slug"`
		CreatedBy string `json:"createdBy"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.Name, "name"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateRequired(req.CreatedBy, "createdBy"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Generate slug if not provided
	if req.Slug == "" {
		req.Slug = strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
	}

	// Check if slug already exists
	if existing, _ := h.repo.GetBySlug(req.Slug); existing != nil {
		Error(w, http.StatusConflict, "Hashtag with this slug already exists")
		return
	}

	hashtag := &models.Hashtag{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Slug:      req.Slug,
		CreatedBy: req.CreatedBy,
		CreatedAt: time.Now(),
	}

	if err := h.repo.Create(hashtag); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Broadcast hashtag creation to all clients viewing the hashtags list
	hashtagCreatedPayload, _ := json.Marshal(map[string]interface{}{
		"type":    "hashtag:created",
		"hashtag": hashtag,
	})
	h.hub.Broadcast <- service.Message{
		RoomID:  "hashtags-list", // Special room for hashtags list updates
		Payload: hashtagCreatedPayload,
		Sender:  nil, // System message, no sender
	}
	log.Printf("[HashtagHandlers] Broadcasted hashtag creation: %s", hashtag.ID)

	Created(w, hashtag)
}

func (h *HashtagHandlers) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	hashtag, err := h.repo.GetBySlug(slug)
	if err != nil {
		Error(w, http.StatusNotFound, "Hashtag not found")
		return
	}

	// Get stats
	boosts, shouts, _ := h.repo.GetHashtagStats(hashtag.ID)

	response := map[string]interface{}{
		"hashtag":  hashtag,
		"boosts":   boosts,
		"shouts":   shouts,
		"momentum": boosts - shouts,
	}

	JSON(w, http.StatusOK, response)
}

func (h *HashtagHandlers) List(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	hashtags, err := h.repo.List(limit, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Add stats to each hashtag
	hashtagsWithStats := make([]map[string]interface{}, 0, len(hashtags))
	for _, hashtag := range hashtags {
		boosts, shouts, _ := h.repo.GetHashtagStats(hashtag.ID)
		hashtagsWithStats = append(hashtagsWithStats, map[string]interface{}{
			"hashtag":  hashtag,
			"boosts":   boosts,
			"shouts":   shouts,
			"momentum": boosts - shouts,
		})
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"hashtags": hashtagsWithStats,
		"limit":    limit,
		"offset":   offset,
	})
}

func (h *HashtagHandlers) Delete(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	hashtag, err := h.repo.GetBySlug(slug)
	if err != nil {
		Error(w, http.StatusNotFound, "Hashtag not found")
		return
	}

	if err := h.repo.Delete(hashtag.ID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	NoContent(w)
}

func (h *HashtagHandlers) AddPost(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	var req struct {
		PostID  string `json:"postId"`
		IsBoost bool   `json:"isBoost"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.PostID, "postId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	hashtag, err := h.repo.GetBySlug(slug)
	if err != nil {
		Error(w, http.StatusNotFound, "Hashtag not found")
		return
	}

	if err := h.repo.AddPostToHashtag(hashtag.ID, req.PostID, req.IsBoost); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Post added to hashtag")
}

func (h *HashtagHandlers) GetPosts(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	hashtag, err := h.repo.GetBySlug(slug)
	if err != nil {
		Error(w, http.StatusNotFound, "Hashtag not found")
		return
	}

	posts, err := h.repo.GetPostsByHashtag(hashtag.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Populate author data for each post
	enrichedPosts := make([]map[string]interface{}, 0, len(posts))
	for _, post := range posts {
		author, err := h.userRepo.GetByID(post.AuthorID)
		if err != nil {
			// Skip posts with missing authors
			continue
		}

		enrichedPosts = append(enrichedPosts, map[string]interface{}{
			"id":           post.ID,
			"content":      post.Content,
			"author":       author,
			"timestamp":    post.CreatedAt,
			"reactions":    0, // TODO: get actual reaction count
			"comments":     0, // TODO: get actual comment count
			"commentCount": 0,
			"saves":        0, // TODO: get actual save count
			"saveCount":    0,
			"mediaType":    post.MediaType,
			"mediaUrl":     post.MediaURL,
			"createdAt":    post.CreatedAt,
			"updatedAt":    post.UpdatedAt,
		})
	}

	JSON(w, http.StatusOK, enrichedPosts)
}
