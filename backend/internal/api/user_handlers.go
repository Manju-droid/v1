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

type UserHandlers struct {
	repo repository.UserRepository
}

func NewUserHandlers(repo repository.UserRepository) *UserHandlers {
	return &UserHandlers{repo: repo}
}

func (h *UserHandlers) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name   string `json:"name"`
		Handle string `json:"handle"`
		Email  string `json:"email"`
		Bio    string `json:"bio"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validation
	if err := ValidateRequired(req.Name, "name"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateHandle(req.Handle); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateEmail(req.Email); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check if handle already exists
	if existing, _ := h.repo.GetByHandle(req.Handle); existing != nil {
		Error(w, http.StatusConflict, "Handle already exists")
		return
	}

	// Check if email already exists
	if existing, _ := h.repo.GetByEmail(req.Email); existing != nil {
		Error(w, http.StatusConflict, "Email already exists")
		return
	}

	user := &models.User{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Handle:    req.Handle,
		Email:     req.Email,
		Bio:       req.Bio,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.repo.Create(user); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Created(w, user)
}

func (h *UserHandlers) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	user, err := h.repo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	JSON(w, http.StatusOK, user)
}

func (h *UserHandlers) GetByHandle(w http.ResponseWriter, r *http.Request) {
	handle := chi.URLParam(r, "handle")

	user, err := h.repo.GetByHandle(handle)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	JSON(w, http.StatusOK, user)
}

func (h *UserHandlers) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	user, err := h.repo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	var updates struct {
		Name                  *string `json:"name"`
		Bio                   *string `json:"bio"`
		AvatarURL             *string `json:"avatarUrl"`
		CoverPhotoURL         *string `json:"coverPhotoUrl"`
		FollowersOnlyComments *bool   `json:"followersOnlyComments"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if updates.Name != nil {
		user.Name = *updates.Name
	}
	if updates.Bio != nil {
		user.Bio = *updates.Bio
	}
	if updates.AvatarURL != nil {
		user.AvatarURL = *updates.AvatarURL
	}
	if updates.CoverPhotoURL != nil {
		user.CoverPhotoURL = *updates.CoverPhotoURL
	}
	if updates.FollowersOnlyComments != nil {
		user.FollowersOnlyComments = *updates.FollowersOnlyComments
	}

	if err := h.repo.Update(user); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, user)
}

func (h *UserHandlers) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.repo.Delete(id); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	NoContent(w)
}

func (h *UserHandlers) Follow(w http.ResponseWriter, r *http.Request) {
	followingID := chi.URLParam(r, "id")

	var req struct {
		FollowerID string `json:"followerId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.FollowerID == "" {
		Error(w, http.StatusBadRequest, "followerId is required")
		return
	}

	if req.FollowerID == followingID {
		Error(w, http.StatusBadRequest, "Cannot follow yourself")
		return
	}

	if err := h.repo.Follow(req.FollowerID, followingID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Followed successfully")
}

func (h *UserHandlers) Unfollow(w http.ResponseWriter, r *http.Request) {
	followingID := chi.URLParam(r, "id")

	var req struct {
		FollowerID string `json:"followerId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.FollowerID == "" {
		Error(w, http.StatusBadRequest, "followerId is required")
		return
	}

	if err := h.repo.Unfollow(req.FollowerID, followingID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Unfollowed successfully")
}

func (h *UserHandlers) GetFollowers(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	followers, err := h.repo.GetFollowers(userID, limit, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"users":  followers,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *UserHandlers) GetFollowing(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	following, err := h.repo.GetFollowing(userID, limit, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"users":  following,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *UserHandlers) List(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	users, err := h.repo.List(limit, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"users":  users,
		"limit":  limit,
		"offset": offset,
	})
}

