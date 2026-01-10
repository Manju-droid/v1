package memory

import (
	"errors"
	"sync"

	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
)

type CommunityMemoryRepository struct {
	communities map[string]*models.Community
	members     map[string][]*models.CommunityMember // Key: CommunityID
	history     map[string]map[string]bool           // Key: CommunityID -> UserID -> bool (Joined ever?)
	mu          sync.RWMutex
}

func NewCommunityMemoryRepository() repository.CommunityRepository {
	repo := &CommunityMemoryRepository{
		communities: make(map[string]*models.Community),
		members:     make(map[string][]*models.CommunityMember),
		history:     make(map[string]map[string]bool),
	}

	// Seed a default community - REMOVED
	// repo.communities = make(map[string]*models.Community)

	return repo
}

func (r *CommunityMemoryRepository) Create(c *models.Community) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.communities[c.ID]; exists {
		return errors.New("community already exists")
	}

	r.communities[c.ID] = c
	r.history[c.ID] = make(map[string]bool) // Initialize history for this community
	return nil
}

func (r *CommunityMemoryRepository) GetByID(id string) (*models.Community, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, exists := r.communities[id]
	if !exists {
		return nil, errors.New("community not found")
	}
	return c, nil
}

func (r *CommunityMemoryRepository) Update(c *models.Community) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.communities[c.ID]; !exists {
		return errors.New("community not found")
	}

	r.communities[c.ID] = c
	return nil
}

func (r *CommunityMemoryRepository) List() ([]*models.Community, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]*models.Community, 0, len(r.communities))
	for _, c := range r.communities {
		list = append(list, c)
	}
	return list, nil
}

func (r *CommunityMemoryRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.communities, id)
	delete(r.members, id)
	delete(r.history, id)
	return nil
}

func (r *CommunityMemoryRepository) AddMember(m *models.CommunityMember) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Add to members list
	if r.members[m.CommunityID] == nil {
		r.members[m.CommunityID] = make([]*models.CommunityMember, 0)
	}
	r.members[m.CommunityID] = append(r.members[m.CommunityID], m)

	// Update history
	if r.history[m.CommunityID] == nil {
		r.history[m.CommunityID] = make(map[string]bool)
	}
	r.history[m.CommunityID][m.UserID] = true

	return nil
}

func (r *CommunityMemoryRepository) RemoveMember(communityID, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	members := r.members[communityID]
	for i, m := range members {
		if m.UserID == userID {
			// Remove from slice
			r.members[communityID] = append(members[:i], members[i+1:]...)
			return nil
		}
	}
	return errors.New("member not found")
}

func (r *CommunityMemoryRepository) GetMember(communityID, userID string) (*models.CommunityMember, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	members := r.members[communityID]
	for _, m := range members {
		if m.UserID == userID {
			return m, nil
		}
	}
	return nil, errors.New("member not found")
}

func (r *CommunityMemoryRepository) GetMembers(communityID string) ([]*models.CommunityMember, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.members[communityID], nil
}

func (r *CommunityMemoryRepository) HasJoinedBefore(communityID, userID string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if hist, ok := r.history[communityID]; ok {
		return hist[userID], nil
	}
	return false, nil
}

func (r *CommunityMemoryRepository) UpdateMember(member *models.CommunityMember) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	members := r.members[member.CommunityID]
	for i, m := range members {
		if m.UserID == member.UserID {
			r.members[member.CommunityID][i] = member
			return nil
		}
	}
	return errors.New("member not found")
}
