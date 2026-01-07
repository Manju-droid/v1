package memory

import (
	"errors"
	"sync"
	"time"

	"github.com/yourusername/v-backend/internal/models"
)

type UserMemoryRepository struct {
	users   map[string]*models.User
	follows map[string]map[string]time.Time // followerID -> map[followingID]timestamp
	mu      sync.RWMutex
}

func NewUserMemoryRepository() *UserMemoryRepository {
	repo := &UserMemoryRepository{
		users:   make(map[string]*models.User),
		follows: make(map[string]map[string]time.Time),
	}

	// Add demo user for development
	demoUser := &models.User{
		ID:        "user-1",
		Name:      "Demo User",
		Handle:    "demo_user",
		Email:     "demo@example.com",
		AvatarURL: "https://api.dicebear.com/9.x/avataaars/svg?seed=demo",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	repo.users[demoUser.ID] = demoUser

	return repo
}

func (r *UserMemoryRepository) Create(user *models.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.users[user.ID]; exists {
		return errors.New("user already exists")
	}

	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	r.users[user.ID] = user
	return nil
}

func (r *UserMemoryRepository) GetByID(id string) (*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, exists := r.users[id]
	if !exists {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (r *UserMemoryRepository) GetByHandle(handle string) (*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		if user.Handle == handle {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (r *UserMemoryRepository) GetByEmail(email string) (*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (r *UserMemoryRepository) Update(user *models.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.users[user.ID]; !exists {
		return errors.New("user not found")
	}

	user.UpdatedAt = time.Now()
	r.users[user.ID] = user
	return nil
}

func (r *UserMemoryRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.users, id)
	delete(r.follows, id)

	// Remove from other users' following lists
	for _, followingMap := range r.follows {
		delete(followingMap, id)
	}

	return nil
}

func (r *UserMemoryRepository) List(limit, offset int) ([]*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]*models.User, 0, len(r.users))
	for _, user := range r.users {
		users = append(users, user)
	}

	// Apply pagination
	start := offset
	if start > len(users) {
		return []*models.User{}, nil
	}

	end := start + limit
	if end > len(users) {
		end = len(users)
	}

	return users[start:end], nil
}

func (r *UserMemoryRepository) Follow(followerID, followingID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.users[followerID]; !exists {
		return errors.New("follower not found")
	}
	if _, exists := r.users[followingID]; !exists {
		return errors.New("following user not found")
	}

	if r.follows[followerID] == nil {
		r.follows[followerID] = make(map[string]time.Time)
	}

	r.follows[followerID][followingID] = time.Now()

	// Update counts
	r.users[followerID].FollowingCount++
	r.users[followingID].FollowersCount++

	return nil
}

func (r *UserMemoryRepository) Unfollow(followerID, followingID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.follows[followerID] != nil {
		delete(r.follows[followerID], followingID)

		// Update counts
		if user := r.users[followerID]; user != nil && user.FollowingCount > 0 {
			user.FollowingCount--
		}
		if user := r.users[followingID]; user != nil && user.FollowersCount > 0 {
			user.FollowersCount--
		}
	}

	return nil
}

func (r *UserMemoryRepository) IsFollowing(followerID, followingID string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.follows[followerID] == nil {
		return false, nil
	}

	_, exists := r.follows[followerID][followingID]
	return exists, nil
}

func (r *UserMemoryRepository) GetFollowers(userID string, limit, offset int) ([]*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	followers := make([]*models.User, 0)
	for followerID, followingMap := range r.follows {
		if _, follows := followingMap[userID]; follows {
			if user, exists := r.users[followerID]; exists {
				followers = append(followers, user)
			}
		}
	}

	// Apply pagination
	start := offset
	if start > len(followers) {
		return []*models.User{}, nil
	}

	end := start + limit
	if end > len(followers) {
		end = len(followers)
	}

	return followers[start:end], nil
}

func (r *UserMemoryRepository) GetFollowing(userID string, limit, offset int) ([]*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	following := make([]*models.User, 0)
	if followingMap := r.follows[userID]; followingMap != nil {
		for followingID := range followingMap {
			if user, exists := r.users[followingID]; exists {
				following = append(following, user)
			}
		}
	}

	// Apply pagination
	start := offset
	if start > len(following) {
		return []*models.User{}, nil
	}

	end := start + limit
	if end > len(following) {
		end = len(following)
	}

	return following[start:end], nil
}
