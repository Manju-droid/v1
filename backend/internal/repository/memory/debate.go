package memory

import (
	"errors"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/v-backend/internal/models"
)

type DebateMemoryRepository struct {
	debates       map[string]*models.Debate
	participants  map[string][]*models.DebateParticipant // debateID -> participants
	speakRequests map[string]*models.SpeakRequest
	mu            sync.RWMutex
}

func NewDebateMemoryRepository() *DebateMemoryRepository {
	return &DebateMemoryRepository{
		debates:       make(map[string]*models.Debate),
		participants:  make(map[string][]*models.DebateParticipant),
		speakRequests: make(map[string]*models.SpeakRequest),
	}
}

func (r *DebateMemoryRepository) Create(debate *models.Debate) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.debates[debate.ID]; exists {
		return errors.New("debate already exists")
	}

	debate.CreatedAt = time.Now()
	debate.UpdatedAt = time.Now()
	r.debates[debate.ID] = debate
	return nil
}

func (r *DebateMemoryRepository) GetByID(id string) (*models.Debate, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	debate, exists := r.debates[id]
	if !exists {
		return nil, errors.New("debate not found")
	}
	return debate, nil
}

func (r *DebateMemoryRepository) Update(debate *models.Debate) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.debates[debate.ID]; !exists {
		return errors.New("debate not found")
	}

	debate.UpdatedAt = time.Now()
	r.debates[debate.ID] = debate
	return nil
}

func (r *DebateMemoryRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.debates, id)
	delete(r.participants, id)

	// Delete associated speak requests
	for reqID, req := range r.speakRequests {
		if req.DebateID == id {
			delete(r.speakRequests, reqID)
		}
	}

	return nil
}

func (r *DebateMemoryRepository) List(status string, limit, offset int) ([]*models.Debate, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	debates := make([]*models.Debate, 0)
	for _, debate := range r.debates {
		if status == "" || debate.Status == status {
			debates = append(debates, debate)
		}
	}

	start := offset
	if start > len(debates) {
		return []*models.Debate{}, nil
	}

	end := start + limit
	if end > len(debates) {
		end = len(debates)
	}

	return debates[start:end], nil
}

func (r *DebateMemoryRepository) AddParticipant(participant *models.DebateParticipant) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.debates[participant.DebateID]; !exists {
		return errors.New("debate not found")
	}

	// Check if user already joined
	if participants, exists := r.participants[participant.DebateID]; exists {
		for i, p := range participants {
			if p.UserID == participant.UserID {
				// User exists. Check if they left and are rejoining
				if p.LeftAt != nil {
					// User is rejoining - clear LeftAt and update JoinedAt
					p.LeftAt = nil
					p.JoinedAt = time.Now()
					p.Side = participant.Side
					p.IsSelfMuted = participant.IsSelfMuted
					p.IsMutedByHost = false // Reset host mute on rejoin
					r.participants[participant.DebateID][i] = p

				// Update debate counts - add to new side
				debate := r.debates[participant.DebateID]
				side := strings.ToLower(strings.TrimSpace(participant.Side))
				log.Printf("[AddParticipant] Rejoining participant: debateID=%s, userId=%s, side=%s (normalized: %s)", participant.DebateID, participant.UserID, participant.Side, side)
				if side == "agree" {
					debate.AgreeCount++
					log.Printf("[AddParticipant] Incremented AgreeCount (rejoin): debateID=%s, new count=%d", participant.DebateID, debate.AgreeCount)
				} else if side == "disagree" {
					debate.DisagreeCount++
					log.Printf("[AddParticipant] Incremented DisagreeCount (rejoin): debateID=%s, new count=%d", participant.DebateID, debate.DisagreeCount)
				} else {
					log.Printf("[AddParticipant] Side is not agree/disagree (rejoin): debateID=%s, side=%s (normalized: %s)", participant.DebateID, participant.Side, side)
				}

				return nil
				}

				// User exists and hasn't left. Update side if changed.
				if p.Side == participant.Side {
					return nil // No change needed
				}

				oldSide := p.Side
				newSide := participant.Side

				// Update participant side
				p.Side = newSide
				r.participants[participant.DebateID][i] = p

				// Update debate counts
				debate := r.debates[participant.DebateID]

				// Normalize sides for comparison
				oldSideNorm := strings.ToLower(strings.TrimSpace(oldSide))
				newSideNorm := strings.ToLower(strings.TrimSpace(newSide))

				// Decrement old side count
				if oldSideNorm == "agree" && debate.AgreeCount > 0 {
					debate.AgreeCount--
					log.Printf("[AddParticipant] Decremented AgreeCount (side switch): debateID=%s, new count=%d", participant.DebateID, debate.AgreeCount)
				} else if oldSideNorm == "disagree" && debate.DisagreeCount > 0 {
					debate.DisagreeCount--
					log.Printf("[AddParticipant] Decremented DisagreeCount (side switch): debateID=%s, new count=%d", participant.DebateID, debate.DisagreeCount)
				}

				// Increment new side count
				if newSideNorm == "agree" {
					debate.AgreeCount++
					log.Printf("[AddParticipant] Incremented AgreeCount (side switch): debateID=%s, new count=%d", participant.DebateID, debate.AgreeCount)
				} else if newSideNorm == "disagree" {
					debate.DisagreeCount++
					log.Printf("[AddParticipant] Incremented DisagreeCount (side switch): debateID=%s, new count=%d", participant.DebateID, debate.DisagreeCount)
				} else {
					log.Printf("[AddParticipant] New side is not agree/disagree (side switch): debateID=%s, newSide=%s (normalized: %s)", participant.DebateID, newSide, newSideNorm)
				}

				return nil
			}
		}
	}

	if participant.JoinedAt.IsZero() {
		participant.JoinedAt = time.Now()
	}
	if participant.ID == "" {
		participant.ID = uuid.New().String()
	}
	r.participants[participant.DebateID] = append(r.participants[participant.DebateID], participant)

	// Update debate counts
	debate := r.debates[participant.DebateID]
	side := strings.ToLower(strings.TrimSpace(participant.Side))
	log.Printf("[AddParticipant] New participant added: debateID=%s, userId=%s, side=%s (normalized: %s)", participant.DebateID, participant.UserID, participant.Side, side)
	if side == "agree" {
		debate.AgreeCount++
		log.Printf("[AddParticipant] Incremented AgreeCount: debateID=%s, new count=%d", participant.DebateID, debate.AgreeCount)
	} else if side == "disagree" {
		debate.DisagreeCount++
		log.Printf("[AddParticipant] Incremented DisagreeCount: debateID=%s, new count=%d", participant.DebateID, debate.DisagreeCount)
	} else {
		log.Printf("[AddParticipant] Side is not agree/disagree: debateID=%s, side=%s (normalized: %s), not incrementing counts", participant.DebateID, participant.Side, side)
	}

	return nil
}

func (r *DebateMemoryRepository) RemoveParticipant(debateID, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	participants, exists := r.participants[debateID]
	if !exists {
		return errors.New("debate not found")
	}

	for i, p := range participants {
		if p.UserID == userID {
			// Remove participant
			r.participants[debateID] = append(participants[:i], participants[i+1:]...)

			// Update debate counts
			debate := r.debates[debateID]
			side := strings.ToLower(strings.TrimSpace(p.Side))
			if side == "agree" && debate.AgreeCount > 0 {
				debate.AgreeCount--
				log.Printf("[RemoveParticipant] Decremented AgreeCount: debateID=%s, new count=%d", debateID, debate.AgreeCount)
			} else if side == "disagree" && debate.DisagreeCount > 0 {
				debate.DisagreeCount--
				log.Printf("[RemoveParticipant] Decremented DisagreeCount: debateID=%s, new count=%d", debateID, debate.DisagreeCount)
			}

			return nil
		}
	}

	return errors.New("participant not found")
}

func (r *DebateMemoryRepository) GetParticipants(debateID string) ([]*models.DebateParticipant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, exists := r.debates[debateID]; !exists {
		return nil, errors.New("debate not found")
	}

	participants := r.participants[debateID]
	if participants == nil {
		return []*models.DebateParticipant{}, nil
	}

	// Filter out participants who have left (LeftAt is set)
	activeParticipants := make([]*models.DebateParticipant, 0, len(participants))
	for _, p := range participants {
		if p.LeftAt == nil {
			activeParticipants = append(activeParticipants, p)
		}
	}

	return activeParticipants, nil
}

// GetAllParticipants returns all participants including those who left (for internal use)
func (r *DebateMemoryRepository) GetAllParticipants(debateID string) ([]*models.DebateParticipant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, exists := r.debates[debateID]; !exists {
		return nil, errors.New("debate not found")
	}

	participants := r.participants[debateID]
	if participants == nil {
		return []*models.DebateParticipant{}, nil
	}

	// Return all participants (including left ones)
	return participants, nil
}

func (r *DebateMemoryRepository) UpdateParticipant(participant *models.DebateParticipant) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	participants, exists := r.participants[participant.DebateID]
	if !exists {
		return errors.New("debate not found")
	}

	for i, p := range participants {
		if p.UserID == participant.UserID {
			r.participants[participant.DebateID][i] = participant
			return nil
		}
	}

	return errors.New("participant not found")
}

func (r *DebateMemoryRepository) CreateSpeakRequest(request *models.SpeakRequest) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.debates[request.DebateID]; !exists {
		return errors.New("debate not found")
	}

	if _, exists := r.speakRequests[request.ID]; exists {
		return errors.New("speak request already exists")
	}

	request.CreatedAt = time.Now()
	r.speakRequests[request.ID] = request
	return nil
}

func (r *DebateMemoryRepository) UpdateSpeakRequest(request *models.SpeakRequest) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.speakRequests[request.ID]; !exists {
		return errors.New("speak request not found")
	}

	r.speakRequests[request.ID] = request
	return nil
}

func (r *DebateMemoryRepository) GetSpeakRequests(debateID string) ([]*models.SpeakRequest, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, exists := r.debates[debateID]; !exists {
		return nil, errors.New("debate not found")
	}

	requests := make([]*models.SpeakRequest, 0)
	for _, req := range r.speakRequests {
		if req.DebateID == debateID {
			requests = append(requests, req)
		}
	}

	return requests, nil
}

func (r *DebateMemoryRepository) DeleteSpeakRequest(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.speakRequests, id)
	return nil
}

// GetUserDebatesToday returns the number of debates created by a user today
func (r *DebateMemoryRepository) GetUserDebatesToday(userID string) int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	count := 0
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	for _, debate := range r.debates {
		if debate.HostID == userID && debate.CreatedAt.After(startOfDay) {
			count++
		}
	}

	return count
}

// CanUserAccessDebate checks if a user can access a debate (for private debates)
// For PUBLIC debates, always returns true
// For PRIVATE debates, returns true only if user is the host or a follower of the host
func (r *DebateMemoryRepository) CanUserAccessDebate(debateID, userID string, isFollower bool) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	debate, exists := r.debates[debateID]
	if !exists {
		return false, errors.New("debate not found")
	}

	// Public debates are accessible to everyone
	if debate.Type == "PUBLIC" {
		return true, nil
	}

	// Private debates: only host and followers can access
	if debate.HostID == userID || isFollower {
		return true, nil
	}

	return false, nil
}

// ClearAll removes all debates, participants, and speak requests
func (r *DebateMemoryRepository) ClearAll() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.debates = make(map[string]*models.Debate)
	r.participants = make(map[string][]*models.DebateParticipant)
	r.speakRequests = make(map[string]*models.SpeakRequest)

	return nil
}
