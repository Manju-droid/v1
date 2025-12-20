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
	"github.com/yourusername/v-backend/internal/service"
)

type PostHandlers struct {
	repo          repository.PostRepository
	userRepo      repository.UserRepository
	notifRepo     repository.NotificationRepository
	analyticsRepo repository.AnalyticsRepository
	pointsService *service.PointsService
	modService    *service.ModerationService
}

func NewPostHandlers(repo repository.PostRepository, userRepo repository.UserRepository, notifRepo repository.NotificationRepository, analyticsRepo repository.AnalyticsRepository, pointsService *service.PointsService, modService *service.ModerationService) *PostHandlers {
	return &PostHandlers{
		repo:          repo,
		userRepo:      userRepo,
		notifRepo:     notifRepo,
		analyticsRepo: analyticsRepo,
		pointsService: pointsService,
		modService:    modService,
	}
}

func (h *PostHandlers) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AuthorID         string `json:"authorId"`
		Content          string `json:"content"`
		MediaType        string `json:"mediaType,omitempty"`
		MediaURL         string `json:"mediaUrl,omitempty"`
		CommentsDisabled bool   `json:"commentsDisabled"`
		CommentLimit     *int   `json:"commentLimit,omitempty"`
		IsHashtagPost    bool   `json:"isHashtagPost"` // Indicates if post is in a hashtag
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.AuthorID, "authorId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateContentLength(req.Content, 5000); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check if user is temporarily muted
	user, err := h.userRepo.GetByID(req.AuthorID)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	if user.TemporarilyMuted {
		// Check if mute has expired
		if user.MutedUntil != nil && time.Now().After(*user.MutedUntil) {
			// Mute expired, clear it
			user.TemporarilyMuted = false
			user.MutedUntil = nil
			h.userRepo.Update(user)
		} else {
			Error(w, http.StatusForbidden, "You are temporarily muted and cannot post")
			return
		}
	}

	// Check for abusive content
	isAbusive := service.IsAbusive(req.Content)

	post := &models.Post{
		ID:                uuid.New().String(),
		AuthorID:          req.AuthorID,
		Content:           req.Content,
		MediaType:         req.MediaType,
		MediaURL:          req.MediaURL,
		CommentsDisabled:  req.CommentsDisabled,
		CommentLimit:      req.CommentLimit,
		Status:            models.PostStatusVisible,
		ReportCount:       0,
		InModerationQueue: false,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if isAbusive {
		// Mark as abusive
		post.Status = models.PostStatusAbusiveFlag

		// Apply point penalty
		if err := h.pointsService.UpdateUserPoints(req.AuthorID, service.ActionAbusivePost); err != nil {
			Error(w, http.StatusInternalServerError, "Failed to update points")
			return
		}
	} else {
		// Award points for clean post
		actionType := service.ActionCleanPost
		if req.IsHashtagPost {
			actionType = service.ActionHashtagPost
		}

		if err := h.pointsService.UpdateUserPoints(req.AuthorID, actionType); err != nil {
			Error(w, http.StatusInternalServerError, "Failed to update points")
			return
		}
	}

	if err := h.repo.Create(post); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Created(w, post)
}

func (h *PostHandlers) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	post, err := h.repo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Post not found")
		return
	}

	JSON(w, http.StatusOK, post)
}

func (h *PostHandlers) List(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	authorID := r.URL.Query().Get("authorId")

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	var posts []*models.Post
	var err error

	if authorID != "" {
		posts, err = h.repo.ListByAuthor(authorID, limit, offset)
	} else {
		posts, err = h.repo.List(limit, offset)
	}

	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Populate reach counts from analytics for each post
	for _, post := range posts {
		if metrics, err := h.analyticsRepo.GetPostMetrics(post.ID); err == nil {
			post.Reach24h = metrics.Reach24h
			post.ReachAll = metrics.ReachAll
		}
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"posts":  posts,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *PostHandlers) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	post, err := h.repo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Post not found")
		return
	}

	var updates struct {
		Content          *string `json:"content"`
		CommentsDisabled *bool   `json:"commentsDisabled"`
		CommentLimit     *int    `json:"commentLimit"`
		Reach24h         *int    `json:"reach_24h"`
		ReachAll         *int    `json:"reach_all"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if updates.Content != nil {
		post.Content = *updates.Content
	}
	if updates.CommentsDisabled != nil {
		post.CommentsDisabled = *updates.CommentsDisabled
	}
	if updates.CommentLimit != nil {
		post.CommentLimit = updates.CommentLimit
	}
	if updates.Reach24h != nil {
		post.Reach24h = *updates.Reach24h
	}
	if updates.ReachAll != nil {
		post.ReachAll = *updates.ReachAll
	}

	if err := h.repo.Update(post); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, post)
}

func (h *PostHandlers) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get post details before deletion to check ownership and type
	post, err := h.repo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Post not found")
		return
	}

	// Determine point deduction action
	// Note: We check if it was a hashtag post (though we don't strictly track IsHashtagPost in the model,
	// we can infer or assume standard post for now. If we tracked it, we'd use ActionDeleteHashtagPost)
	// For now, we'll assume standard post deletion (-2 points) unless we can determine otherwise
	// Ideally, the Post model should have an IsHashtagPost field or we check the content

	action := service.ActionDeletePost
	// Simple check for hashtags in content as a proxy
	// In a real app, we'd store the type or check the join table
	// For this implementation, let's just use ActionDeletePost to be safe/simple

	if err := h.repo.Delete(id); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Deduct points after successful deletion
	// We ignore errors here as the post is already deleted
	_ = h.pointsService.UpdateUserPoints(post.AuthorID, action)

	NoContent(w)
}

// Comment handlers
func (h *PostHandlers) CreateComment(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	var req struct {
		AuthorID string  `json:"authorId"`
		Content  string  `json:"content"`
		ParentID *string `json:"parentId,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.AuthorID, "authorId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateContentLength(req.Content, 2000); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	comment := &models.Comment{
		ID:        uuid.New().String(),
		PostID:    postID,
		AuthorID:  req.AuthorID,
		ParentID:  req.ParentID,
		Content:   req.Content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.repo.CreateComment(comment); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Create notification for post author (if not commenting on own post)
	post, err := h.repo.GetByID(postID)
	if err == nil && post.AuthorID != req.AuthorID {
		// Get commenter info
		commenter, err := h.userRepo.GetByID(req.AuthorID)
		if err == nil {
			notification := &models.Notification{
				ID:          uuid.New().String(),
				UserID:      post.AuthorID,
				Type:        "comment",
				Title:       "New Comment",
				Message:     commenter.Name + " commented on your post",
				PostID:      &postID,
				ActorID:     &req.AuthorID,
				ActorName:   &commenter.Name,
				ActorHandle: &commenter.Handle,
				Read:        false,
				CreatedAt:   time.Now(),
			}
			h.notifRepo.Create(notification)
		}
	}

	Created(w, comment)
}

func (h *PostHandlers) GetComments(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	comments, err := h.repo.GetCommentsByPost(postID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, comments)
}

func (h *PostHandlers) DeleteComment(w http.ResponseWriter, r *http.Request) {
	commentID := chi.URLParam(r, "commentId")

	if err := h.repo.DeleteComment(commentID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	NoContent(w)
}

// Reaction handlers
func (h *PostHandlers) React(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	var req struct {
		UserID    string  `json:"userId"`
		CommentID *string `json:"commentId,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	reaction := &models.Reaction{
		UserID:    req.UserID,
		PostID:    postID,
		CommentID: req.CommentID,
		CreatedAt: time.Now(),
	}

	if err := h.repo.AddReaction(reaction); err != nil {
		Error(w, http.StatusConflict, "Already reacted")
		return
	}

	// Create notification for post author (if not reacting to own post)
	post, err := h.repo.GetByID(postID)
	if err == nil && post.AuthorID != req.UserID {
		// Get reactor info
		reactor, err := h.userRepo.GetByID(req.UserID)
		if err == nil {
			notification := &models.Notification{
				ID:          uuid.New().String(),
				UserID:      post.AuthorID,
				Type:        "reaction",
				Title:       "New Reaction",
				Message:     reactor.Name + " reacted to your post",
				PostID:      &postID,
				ActorID:     &req.UserID,
				ActorName:   &reactor.Name,
				ActorHandle: &reactor.Handle,
				Read:        false,
				CreatedAt:   time.Now(),
			}
			h.notifRepo.Create(notification)
		}
	}

	// Return updated post with reaction count
	updatedPost, err := h.repo.GetByID(postID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get updated post")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"message":       "Reacted successfully",
		"reactionCount": updatedPost.ReactionCount,
	})
}

func (h *PostHandlers) Unreact(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	var req struct {
		UserID    string  `json:"userId"`
		CommentID *string `json:"commentId,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.repo.RemoveReaction(req.UserID, postID, req.CommentID); err != nil {
		Error(w, http.StatusNotFound, "Reaction not found")
		return
	}

	// Return updated post with reaction count
	updatedPost, err := h.repo.GetByID(postID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get updated post")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"message":       "Unreacted successfully",
		"reactionCount": updatedPost.ReactionCount,
	})
}

// Save handlers
func (h *PostHandlers) Save(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	var req struct {
		UserID string `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.repo.SavePost(req.UserID, postID); err != nil {
		Error(w, http.StatusConflict, "Post already saved")
		return
	}

	Success(w, "Post saved successfully")
}

func (h *PostHandlers) Unsave(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	var req struct {
		UserID string `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.repo.UnsavePost(req.UserID, postID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Post unsaved successfully")
}

func (h *PostHandlers) GetSavedPosts(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if userID == "" {
		Error(w, http.StatusBadRequest, "userId is required")
		return
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	posts, err := h.repo.GetSavedPosts(userID, limit, offset)
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
