package memory

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/v-backend/internal/models"
)

type AnalyticsMemoryRepository struct {
	impressions map[string][]*models.PostImpression // postID -> impressions
	postRepo    *PostMemoryRepository
	mu          sync.RWMutex
}

func NewAnalyticsMemoryRepository(postRepo *PostMemoryRepository) *AnalyticsMemoryRepository {
	return &AnalyticsMemoryRepository{
		impressions: make(map[string][]*models.PostImpression),
		postRepo:    postRepo,
	}
}

func (r *AnalyticsMemoryRepository) RecordImpression(postID, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if user already viewed this post
	impressions := r.impressions[postID]
	for _, imp := range impressions {
		if imp.UserID == userID {
			// User already viewed, don't record duplicate
			return nil
		}
	}

	// Record new impression
	impression := &models.PostImpression{
		ID:        uuid.New().String(),
		PostID:    postID,
		UserID:    userID,
		Timestamp: time.Now(),
	}

	r.impressions[postID] = append(r.impressions[postID], impression)
	return nil
}

func (r *AnalyticsMemoryRepository) GetPostMetrics(postID string) (*models.PostMetrics, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Get post to exclude author's views
	post, err := r.postRepo.GetByID(postID)
	var authorID string
	if err == nil {
		authorID = post.AuthorID
	}

	reach24h := r.getUniqueViewers24hLocked(postID, authorID)
	reachAll := r.getUniqueViewersAllLocked(postID, authorID)
	impressions := len(r.impressions[postID])

	if err != nil {
		return &models.PostMetrics{
			Reach24h:    reach24h,
			ReachAll:    reachAll,
			Impressions: impressions,
			Engagement:  0,
		}, nil
	}

	// Calculate engagement rate
	totalInteractions := post.ReactionCount + post.CommentCount + post.SaveCount
	engagement := 0.0
	if reachAll > 0 {
		engagement = float64(totalInteractions) / float64(reachAll) * 100
	}

	return &models.PostMetrics{
		Reach24h:    reach24h,
		ReachAll:    reachAll,
		Impressions: impressions,
		Engagement:  engagement,
	}, nil
}

func (r *AnalyticsMemoryRepository) GetPostAnalytics(postID string) (*models.PostAnalytics, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Get post to exclude author's views
	post, err := r.postRepo.GetByID(postID)
	var authorID string
	if err == nil {
		authorID = post.AuthorID
	}

	reach24h := r.getUniqueViewers24hLocked(postID, authorID)
	reachAll := r.getUniqueViewersAllLocked(postID, authorID)
	impressions := len(r.impressions[postID])

	if err != nil {
		return &models.PostAnalytics{
			PostID:      postID,
			Reach24h:    reach24h,
			ReachAll:    reachAll,
			Impressions: impressions,
			Reactions:   0,
			Comments:    0,
			Saves:       0,
			Engagement:  0,
		}, nil
	}

	totalInteractions := post.ReactionCount + post.CommentCount + post.SaveCount
	engagement := 0.0
	if reachAll > 0 {
		engagement = float64(totalInteractions) / float64(reachAll) * 100
	}

	return &models.PostAnalytics{
		PostID:      postID,
		Reach24h:    reach24h,
		ReachAll:    reachAll,
		Impressions: impressions,
		Reactions:   post.ReactionCount,
		Comments:    post.CommentCount,
		Saves:       post.SaveCount,
		Engagement:  engagement,
	}, nil
}

func (r *AnalyticsMemoryRepository) GetUniqueViewers24h(postID string) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	// Get post to exclude author's views
	post, err := r.postRepo.GetByID(postID)
	var authorID string
	if err == nil {
		authorID = post.AuthorID
	}
	return r.getUniqueViewers24hLocked(postID, authorID), nil
}

func (r *AnalyticsMemoryRepository) GetUniqueViewersAll(postID string) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	// Get post to exclude author's views
	post, err := r.postRepo.GetByID(postID)
	var authorID string
	if err == nil {
		authorID = post.AuthorID
	}
	return r.getUniqueViewersAllLocked(postID, authorID), nil
}

func (r *AnalyticsMemoryRepository) getUniqueViewers24hLocked(postID, excludeUserID string) int {
	impressions := r.impressions[postID]
	uniqueUsers := make(map[string]bool)
	cutoff := time.Now().Add(-24 * time.Hour)

	for _, imp := range impressions {
		// Exclude self-views (post author's views)
		if excludeUserID != "" && imp.UserID == excludeUserID {
			continue
		}
		if imp.Timestamp.After(cutoff) {
			uniqueUsers[imp.UserID] = true
		}
	}

	return len(uniqueUsers)
}

func (r *AnalyticsMemoryRepository) getUniqueViewersAllLocked(postID, excludeUserID string) int {
	impressions := r.impressions[postID]
	uniqueUsers := make(map[string]bool)

	for _, imp := range impressions {
		// Exclude self-views (post author's views)
		if excludeUserID != "" && imp.UserID == excludeUserID {
			continue
		}
		uniqueUsers[imp.UserID] = true
	}

	return len(uniqueUsers)
}

