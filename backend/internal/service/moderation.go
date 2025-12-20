package service

import (
	"errors"
	"sync"

	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
)

type ModerationService struct {
	postRepo      repository.PostRepository
	userRepo      repository.UserRepository
	pointsService *PointsService
	reports       map[string]map[string]bool // postID -> map[userID]bool (tracks who reported what)
	mu            sync.RWMutex
}

func NewModerationService(postRepo repository.PostRepository, userRepo repository.UserRepository, pointsService *PointsService) *ModerationService {
	return &ModerationService{
		postRepo:      postRepo,
		userRepo:      userRepo,
		pointsService: pointsService,
		reports:       make(map[string]map[string]bool),
	}
}

// Report a post
func (s *ModerationService) ReportPost(postID, reporterID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if user already reported this post
	if s.reports[postID] != nil && s.reports[postID][reporterID] {
		return errors.New("user has already reported this post")
	}

	// Track this report (even if post doesn't exist in backend yet)
	if s.reports[postID] == nil {
		s.reports[postID] = make(map[string]bool)
	}
	s.reports[postID][reporterID] = true

	// Try to get the post from backend
	post, err := s.postRepo.GetByID(postID)
	if err != nil {
		// Post doesn't exist in backend yet - that's okay, we've tracked the report
		// When the post is created later, it will have the report count
		// For now, just return success since we've tracked the report
		return nil
	}

	// Post exists - increment report count
	post.ReportCount++
	
	// Check if report count reaches threshold
	if post.ReportCount >= 100 {
		post.Status = models.PostStatusTempHidden
		post.InModerationQueue = true
	}

	return s.postRepo.Update(post)
}

// Admin: Approve post (remove from moderation)
func (s *ModerationService) ApprovePost(postID string) error {
	post, err := s.postRepo.GetByID(postID)
	if err != nil {
		return err
	}

	post.Status = models.PostStatusVisible
	post.InModerationQueue = false

	return s.postRepo.Update(post)
}

// Admin: Reject post (remove permanently)
func (s *ModerationService) RejectPost(postID string, applyPenalty bool) error {
	post, err := s.postRepo.GetByID(postID)
	if err != nil {
		return err
	}

	post.Status = models.PostStatusRemoved
	post.InModerationQueue = false

	// Optionally apply point penalty to author
	if applyPenalty {
		err := s.pointsService.UpdateUserPoints(post.AuthorID, ActionAbusivePost)
		if err != nil {
			// Log error but don't fail the rejection
			// In production, you'd want proper logging here
		}
	}

	return s.postRepo.Update(post)
}

// Get posts in moderation queue
func (s *ModerationService) GetModerationQueue(limit, offset int) ([]*models.Post, error) {
	// This would need to be added to PostRepository interface
	// For now, we'll filter in memory
	allPosts, err := s.postRepo.List(10000, 0) // Get all posts (in production, use proper query)
	if err != nil {
		return nil, err
	}

	var queue []*models.Post
	for _, post := range allPosts {
		if post.InModerationQueue {
			queue = append(queue, post)
		}
	}

	// Apply pagination
	start := offset
	if start > len(queue) {
		return []*models.Post{}, nil
	}

	end := start + limit
	if end > len(queue) {
		end = len(queue)
	}

	return queue[start:end], nil
}

// Check if post should be visible in feed
func (s *ModerationService) IsPostVisible(post *models.Post) bool {
	return post.Status == models.PostStatusVisible
}

// Mark post as abusive
func (s *ModerationService) MarkPostAsAbusive(postID string) error {
	post, err := s.postRepo.GetByID(postID)
	if err != nil {
		return err
	}

	post.Status = models.PostStatusAbusiveFlag
	return s.postRepo.Update(post)
}

