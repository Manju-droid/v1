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
	"github.com/yourusername/v-backend/internal/auth"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
	"github.com/yourusername/v-backend/internal/service"
)

type HashtagHandlers struct {
	repo     repository.HashtagRepository
	userRepo repository.UserRepository
	postRepo repository.PostRepository
	hub      *service.Hub
}

func NewHashtagHandlers(repo repository.HashtagRepository, userRepo repository.UserRepository, postRepo repository.PostRepository, hub *service.Hub) *HashtagHandlers {
	return &HashtagHandlers{
		repo:     repo,
		userRepo: userRepo,
		postRepo: postRepo,
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

	// Check for optional authentication to determine following status
	var currentUserID string
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		tokenString := authHeader[7:]
		if claims, err := auth.ValidateToken(tokenString); err == nil {
			currentUserID = claims.UserID
		}
	}

	isFollowing := false
	if currentUserID != "" {
		isFollowing, _ = h.repo.IsFollowing(currentUserID, hashtag.ID)
	}

	// Get stats
	boosts, shouts, _ := h.repo.GetHashtagStats(hashtag.ID)

	response := map[string]interface{}{
		"hashtag":     hashtag,
		"boosts":      boosts,
		"shouts":      shouts,
		"momentum":    boosts - shouts,
		"isFollowing": isFollowing,
		"followers":   hashtag.Followers,
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

	// Check for optional authentication
	var currentUserID string
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		tokenString := authHeader[7:]
		if claims, err := auth.ValidateToken(tokenString); err == nil {
			currentUserID = claims.UserID
		}
	}

	hashtagsWithStats := make([]map[string]interface{}, 0, len(hashtags))
	for _, hashtag := range hashtags {
		boosts, shouts, _ := h.repo.GetHashtagStats(hashtag.ID)
		isFollowing := false
		if currentUserID != "" {
			isFollowing, _ = h.repo.IsFollowing(currentUserID, hashtag.ID)
		}

		hashtagsWithStats = append(hashtagsWithStats, map[string]interface{}{
			"hashtag":     hashtag,
			"boosts":      boosts,
			"shouts":      shouts,
			"posts":       boosts + shouts,
			"momentum":    boosts - shouts,
			"isFollowing": isFollowing,
			"followers":   hashtag.Followers,
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

		// Check for optional authentication to determine reaction status
		var currentUserID string
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString := authHeader[7:]
			if claims, err := auth.ValidateToken(tokenString); err == nil {
				currentUserID = claims.UserID
			}
		}

		isLiked := false
		isSaved := false
		if currentUserID != "" {
			isLiked, _ = h.postRepo.HasReacted(currentUserID, post.ID, nil)
			isSaved, _ = h.postRepo.IsSaved(currentUserID, post.ID)
		}

		enrichedPosts = append(enrichedPosts, map[string]interface{}{
			"id":      post.ID,
			"content": post.Content,
			"author": map[string]interface{}{
				"id":          author.ID,
				"name":        author.Name,
				"displayName": author.Name, // Map Name to displayName for ProfileCard
				"handle":      author.Handle,
				"avatar":      author.AvatarURL, // Frontend often expects 'avatar' not 'avatarUrl'
				"avatarUrl":   author.AvatarURL,
			},
			"timestamp":     post.CreatedAt,
			"reactionCount": post.ReactionCount,
			"reactions":     post.ReactionCount, // Backward compatibility
			"commentCount":  post.CommentCount,
			"comments":      post.CommentCount, // Backward compatibility
			"saveCount":     post.SaveCount,
			"saves":         post.SaveCount, // Backward compatibility
			"isLiked":       isLiked,
			"isSaved":       isSaved,
			"reacted":       isLiked,
			"saved":         isSaved,
			"mediaType":     post.MediaType,
			"mediaUrl":      post.MediaURL,
			"createdAt":     post.CreatedAt,
			"updatedAt":     post.UpdatedAt,
		})
		log.Printf("DEBUG: Serving post %s with reactionCount: %d", post.ID, post.ReactionCount)
	}

	JSON(w, http.StatusOK, enrichedPosts)
}

func (h *HashtagHandlers) Follow(w http.ResponseWriter, r *http.Request) {
	// Extract User ID from token manually since auth.GetUserID is not available
	var userID string
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		tokenString := authHeader[7:]
		if claims, err := auth.ValidateToken(tokenString); err == nil {
			userID = claims.UserID
		}
	}

	if userID == "" {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	slug := chi.URLParam(r, "slug")

	hashtag, err := h.repo.GetBySlug(slug)
	if err != nil {
		Error(w, http.StatusNotFound, "Hashtag not found")
		return
	}

	if err := h.repo.FollowHashtag(userID, hashtag.ID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Followed hashtag")
}

func (h *HashtagHandlers) Unfollow(w http.ResponseWriter, r *http.Request) {
	// Extract User ID from token manually
	var userID string
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		tokenString := authHeader[7:]
		if claims, err := auth.ValidateToken(tokenString); err == nil {
			userID = claims.UserID
		}
	}

	if userID == "" {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	slug := chi.URLParam(r, "slug")

	hashtag, err := h.repo.GetBySlug(slug)
	if err != nil {
		Error(w, http.StatusNotFound, "Hashtag not found")
		return
	}

	if err := h.repo.UnfollowHashtag(userID, hashtag.ID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Unfollowed hashtag")
}
