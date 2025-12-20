package memory

import (
	"errors"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/yourusername/v-backend/internal/models"
)

type DebateStatsMemoryRepository struct {
	stats           map[string]*models.DebateTopicStats // normalized topic -> stats
	recordedDebates map[string]bool                     // debate ID -> true (track which debates have been recorded)
	mu              sync.RWMutex
}

func NewDebateStatsMemoryRepository() *DebateStatsMemoryRepository {
	return &DebateStatsMemoryRepository{
		stats:           make(map[string]*models.DebateTopicStats),
		recordedDebates: make(map[string]bool),
	}
}

// normalizeTopic normalizes a topic string to use as a key
func normalizeTopic(topic string) string {
	return strings.TrimSpace(strings.ToLower(topic))
}

func (r *DebateStatsMemoryRepository) RecordStats(topic string, agreeCount, disagreeCount, participants int, debateID string) (*models.DebateTopicStats, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	log.Printf("[DebateStats] RecordStats called: topic=%s, agreeCount=%d, disagreeCount=%d, participants=%d, debateID=%s", 
		topic, agreeCount, disagreeCount, participants, debateID)

	// Check if this debate has already been recorded (prevent duplicates)
	if debateID != "" && r.recordedDebates[debateID] {
		// This debate was already recorded, return existing stats without incrementing
		key := normalizeTopic(topic)
		existing, exists := r.stats[key]
		if exists {
			log.Printf("[DebateStats] Debate %s already recorded, returning existing stats: agree=%d, disagree=%d", 
				debateID, existing.TotalAgree, existing.TotalDisagree)
			return existing, nil
		}
		// If topic doesn't exist yet, create it (shouldn't happen, but handle it)
	}

	key := normalizeTopic(topic)
	existing, exists := r.stats[key]

	if !exists {
		// Create new stats entry
		stats := &models.DebateTopicStats{
			Topic:             strings.TrimSpace(topic), // Store original topic for display
			TotalParticipants: participants,
			TotalAgree:        agreeCount,
			TotalDisagree:     disagreeCount,
			SessionsCount:     1,
			LastUpdated:       time.Now(),
		}
		r.stats[key] = stats
		log.Printf("[DebateStats] Created new stats entry: topic=%s, agree=%d, disagree=%d, participants=%d", 
			topic, agreeCount, disagreeCount, participants)
		// Mark this debate as recorded
		if debateID != "" {
			r.recordedDebates[debateID] = true
		}
		return stats, nil
	}

	// Update existing stats
	oldAgree := existing.TotalAgree
	oldDisagree := existing.TotalDisagree
	existing.TotalParticipants += participants
	existing.TotalAgree += agreeCount
	existing.TotalDisagree += disagreeCount
	existing.SessionsCount += 1
	existing.LastUpdated = time.Now()

	log.Printf("[DebateStats] Updated existing stats: topic=%s, agree: %d -> %d (+%d), disagree: %d -> %d (+%d), participants: +%d", 
		topic, oldAgree, existing.TotalAgree, agreeCount, oldDisagree, existing.TotalDisagree, disagreeCount, participants)

	// Mark this debate as recorded
	if debateID != "" {
		r.recordedDebates[debateID] = true
	}

	return existing, nil
}

func (r *DebateStatsMemoryRepository) GetAllStats() ([]*models.DebateTopicStats, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	stats := make([]*models.DebateTopicStats, 0, len(r.stats))
	for _, stat := range r.stats {
		stats = append(stats, stat)
	}

	return stats, nil
}

func (r *DebateStatsMemoryRepository) GetByTopic(topic string) (*models.DebateTopicStats, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	key := normalizeTopic(topic)
	stats, exists := r.stats[key]
	if !exists {
		return nil, errors.New("stats not found for topic")
	}

	return stats, nil
}

