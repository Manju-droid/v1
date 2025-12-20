package memory

import (
	"errors"
	"sort"
	"sync"

	"github.com/yourusername/v-backend/internal/models"
)

type NotificationMemoryRepository struct {
	notifications map[string]*models.Notification // id -> notification
	userIndex     map[string][]string             // userID -> []notificationIDs
	mu            sync.RWMutex
}

func NewNotificationMemoryRepository() *NotificationMemoryRepository {
	return &NotificationMemoryRepository{
		notifications: make(map[string]*models.Notification),
		userIndex:     make(map[string][]string),
	}
}

func (r *NotificationMemoryRepository) Create(notification *models.Notification) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.notifications[notification.ID] = notification
	r.userIndex[notification.UserID] = append(r.userIndex[notification.UserID], notification.ID)

	return nil
}

func (r *NotificationMemoryRepository) GetByUserID(userID string, limit, offset int) ([]*models.Notification, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	notifIDs := r.userIndex[userID]
	if len(notifIDs) == 0 {
		return []*models.Notification{}, nil
	}

	// Get all notifications for this user
	var notifications []*models.Notification
	for _, id := range notifIDs {
		if notif, exists := r.notifications[id]; exists {
			notifications = append(notifications, notif)
		}
	}

	// Sort by creation time (newest first)
	sort.Slice(notifications, func(i, j int) bool {
		return notifications[i].CreatedAt.After(notifications[j].CreatedAt)
	})

	// Apply pagination
	if offset >= len(notifications) {
		return []*models.Notification{}, nil
	}

	end := offset + limit
	if end > len(notifications) {
		end = len(notifications)
	}

	return notifications[offset:end], nil
}

func (r *NotificationMemoryRepository) GetByID(id string) (*models.Notification, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	notif, exists := r.notifications[id]
	if !exists {
		return nil, errors.New("notification not found")
	}

	return notif, nil
}

func (r *NotificationMemoryRepository) MarkAsRead(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	notif, exists := r.notifications[id]
	if !exists {
		return errors.New("notification not found")
	}

	notif.Read = true
	return nil
}

func (r *NotificationMemoryRepository) MarkAllAsRead(userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	notifIDs := r.userIndex[userID]
	for _, id := range notifIDs {
		if notif, exists := r.notifications[id]; exists {
			notif.Read = true
		}
	}

	return nil
}

func (r *NotificationMemoryRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	notif, exists := r.notifications[id]
	if !exists {
		return errors.New("notification not found")
	}

	// Remove from main map
	delete(r.notifications, id)

	// Remove from user index
	userNotifs := r.userIndex[notif.UserID]
	for i, nid := range userNotifs {
		if nid == id {
			r.userIndex[notif.UserID] = append(userNotifs[:i], userNotifs[i+1:]...)
			break
		}
	}

	return nil
}

func (r *NotificationMemoryRepository) GetUnreadCount(userID string) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	notifIDs := r.userIndex[userID]
	count := 0
	for _, id := range notifIDs {
		if notif, exists := r.notifications[id]; exists && !notif.Read {
			count++
		}
	}

	return count, nil
}

