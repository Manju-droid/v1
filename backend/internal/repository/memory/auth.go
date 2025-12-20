package memory

import (
	"errors"
	"sync"
	"time"

	"github.com/yourusername/v-backend/internal/models"
)

type AuthMemoryRepository struct {
	auths map[string]*models.Auth // userID -> auth
	mu    sync.RWMutex
}

func NewAuthMemoryRepository() *AuthMemoryRepository {
	return &AuthMemoryRepository{
		auths: make(map[string]*models.Auth),
	}
}

func (r *AuthMemoryRepository) CreateAuth(auth *models.Auth) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.auths[auth.UserID]; exists {
		return errors.New("auth already exists for this user")
	}

	// Check if email already exists
	for _, a := range r.auths {
		if a.Email == auth.Email {
			return errors.New("email already exists")
		}
	}

	auth.CreatedAt = time.Now()
	auth.UpdatedAt = time.Now()
	r.auths[auth.UserID] = auth
	return nil
}

func (r *AuthMemoryRepository) GetByEmail(email string) (*models.Auth, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, auth := range r.auths {
		if auth.Email == email {
			return auth, nil
		}
	}

	return nil, errors.New("auth not found")
}

func (r *AuthMemoryRepository) GetByUserID(userID string) (*models.Auth, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	auth, exists := r.auths[userID]
	if !exists {
		return nil, errors.New("auth not found")
	}

	return auth, nil
}

func (r *AuthMemoryRepository) UpdatePassword(userID, newPasswordHash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	auth, exists := r.auths[userID]
	if !exists {
		return errors.New("auth not found")
	}

	auth.PasswordHash = newPasswordHash
	auth.UpdatedAt = time.Now()
	return nil
}

func (r *AuthMemoryRepository) DeleteAuth(userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.auths, userID)
	return nil
}

