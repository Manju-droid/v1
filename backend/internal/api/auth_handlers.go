package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/v-backend/internal/auth"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
	"github.com/yourusername/v-backend/internal/service"
)

type AuthHandlers struct {
	authRepo      repository.AuthRepository
	userRepo      repository.UserRepository
	pointsService *service.PointsService
	notifRepo     repository.NotificationRepository
}

func NewAuthHandlers(authRepo repository.AuthRepository, userRepo repository.UserRepository, pointsService *service.PointsService, notifRepo repository.NotificationRepository) *AuthHandlers {
	return &AuthHandlers{
		authRepo:      authRepo,
		userRepo:      userRepo,
		pointsService: pointsService,
		notifRepo:     notifRepo,
	}
}

func (h *AuthHandlers) Signup(w http.ResponseWriter, r *http.Request) {
	var req models.SignupRequest

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
	if len(req.Password) < 6 {
		Error(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	// Check if handle already exists
	if existing, _ := h.userRepo.GetByHandle(req.Handle); existing != nil {
		Error(w, http.StatusConflict, "Handle already exists")
		return
	}

	// Check if email already exists
	if existing, _ := h.authRepo.GetByEmail(req.Email); existing != nil {
		Error(w, http.StatusConflict, "Email already exists")
		return
	}

	// Hash password
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	// Parse Date of Birth
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid date of birth format (must be YYYY-MM-DD)")
		return
	}

	// Calculate age and determine age group for avatar
	// Calculate age and determine age group for avatar
	age := int(time.Since(dob).Hours() / 24 / 365.25)

	// Create avatar seed using gender (if provided) and age group
	// This ensures age-appropriate avatar variation
	// Determine avatar URL based on gender
	avatarParams := ""
	facialHairSet := false

	if req.Gender == "male" {
		// Use a short list of male hairstyles to avoid HTTP 400 (URL length limits)
		avatarParams = "&top=shortCurly,shortFlat,shortRound,sides,theCaesar&facialHairProbability=40"
		facialHairSet = true
	} else if req.Gender == "female" {
		// Use a short list of female hairstyles to avoid HTTP 400 (URL length limits)
		avatarParams = "&top=longButNotTooLong,bob,curly,straight01,straight02&facialHairProbability=0"
		facialHairSet = true
	}

	avatarURL := "https://api.dicebear.com/9.x/avataaars/svg?seed=" + req.Handle + "&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf" + avatarParams

	// Age adjustments for avatar
	// Note: Removed hairColor parameter as comma-separated values cause DiceBear API errors
	if age < 13 && !facialHairSet {
		avatarURL += "&facialHairProbability=0"
	}

	// Create user
	userID := uuid.New().String()
	user := &models.User{
		ID:          userID,
		Name:        req.Name,
		Handle:      req.Handle,
		Email:       req.Email,
		PhoneNumber: req.PhoneNumber,
		Languages:   []string{"English", req.Language},
		Bio:         req.Bio,
		Gender:      req.Gender,
		DateOfBirth: dob,
		AvatarURL:   avatarURL,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Initialize user with default tier/points values
	h.pointsService.InitializeUser(user)

	if err := h.userRepo.Create(user); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Create auth
	authModel := &models.Auth{
		UserID:       userID,
		Email:        req.Email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := h.authRepo.CreateAuth(authModel); err != nil {
		// Rollback user creation
		h.userRepo.Delete(userID)
		Error(w, http.StatusInternalServerError, "Failed to create auth")
		return
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.ID, user.Email, user.Handle)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	// Create welcome notification for new user
	welcomeNotification := &models.Notification{
		ID:        uuid.New().String(),
		UserID:    userID,
		Type:      "general",
		Title:     "Welcome to the App! 🎉",
		Message:   "Thanks for joining! Start exploring debates, connect with others, and share your thoughts.",
		Read:      false,
		CreatedAt: time.Now(),
	}
	// Create notification (ignore errors - notification creation shouldn't fail signup)
	if err := h.notifRepo.Create(welcomeNotification); err != nil {
		// Log error but don't fail signup
		// In production, you'd want proper logging here
	}

	response := models.AuthResponse{
		Token: token,
		User:  user,
	}

	Created(w, response)
}

func (h *AuthHandlers) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validation
	if err := ValidateEmail(req.Email); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.Password == "" {
		Error(w, http.StatusBadRequest, "Password is required")
		return
	}

	// Get auth by email
	authModel, err := h.authRepo.GetByEmail(req.Email)
	if err != nil {
		Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Check password
	if !auth.CheckPassword(authModel.PasswordHash, req.Password) {
		Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Get user
	user, err := h.userRepo.GetByID(authModel.UserID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get user")
		return
	}

	// Award daily login streak points
	if err := h.pointsService.UpdateUserPoints(user.ID, service.ActionDailyStreak); err != nil {
		// Log error but don't fail login
		// In production, you'd want proper logging here
	}

	// Refresh user data after points update
	user, err = h.userRepo.GetByID(authModel.UserID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get user")
		return
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.ID, user.Email, user.Handle)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	response := models.AuthResponse{
		Token: token,
		User:  user,
	}

	JSON(w, http.StatusOK, response)
}

func (h *AuthHandlers) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	// Get user from context (set by auth middleware)
	userID := r.Context().Value("userID").(string)

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	JSON(w, http.StatusOK, user)
}

func (h *AuthHandlers) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(req.NewPassword) < 6 {
		Error(w, http.StatusBadRequest, "New password must be at least 6 characters")
		return
	}

	// Get current auth
	authModel, err := h.authRepo.GetByUserID(userID)
	if err != nil {
		Error(w, http.StatusNotFound, "Auth not found")
		return
	}

	// Check current password
	if !auth.CheckPassword(authModel.PasswordHash, req.CurrentPassword) {
		Error(w, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	// Hash new password
	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	// Update password
	if err := h.authRepo.UpdatePassword(userID, newHash); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	Success(w, "Password changed successfully")
}
