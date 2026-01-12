package service

import (
	"errors"
	"time"

	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
)

type PointsAction string

const (
	ActionCleanPost         PointsAction = "CLEAN_POST"
	ActionHashtagPost       PointsAction = "HASHTAG_POST"
	ActionDebateJoin        PointsAction = "DEBATE_JOIN"
	ActionDebateWin         PointsAction = "DEBATE_WIN"
	ActionAbusivePost       PointsAction = "ABUSIVE_POST"
	ActionDailyStreak       PointsAction = "DAILY_STREAK"
	ActionDeletePost        PointsAction = "DELETE_POST"
	ActionDeleteHashtagPost PointsAction = "DELETE_HASHTAG_POST"
	ActionCommunityJoin     PointsAction = "COMMUNITY_JOIN"
	ActionCommunityCreate   PointsAction = "COMMUNITY_CREATE"
)

type PointsService struct {
	userRepo repository.UserRepository
}

func NewPointsService(userRepo repository.UserRepository) *PointsService {
	return &PointsService{
		userRepo: userRepo,
	}
}

// Update user points based on action type
func (s *PointsService) UpdateUserPoints(userID string, actionType PointsAction) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}

	now := time.Now()
	var pointsDelta int
	var shouldMute bool
	var muteDuration time.Duration

	switch actionType {
	case ActionCleanPost:
		pointsDelta = 2

	case ActionHashtagPost:
		pointsDelta = 3

	case ActionDebateJoin:
		pointsDelta = 5

	case ActionDebateWin:
		pointsDelta = 10

	case ActionDailyStreak:
		// Check if already claimed today
		if user.LastLoginDate != nil {
			lastLogin := *user.LastLoginDate
			if isSameDay(lastLogin, now) {
				// Already claimed today
				return nil
			}

			// Check if streak continues
			if isConsecutiveDay(lastLogin, now) {
				user.LoginStreak++
			} else {
				// Streak broken
				user.LoginStreak = 1
			}
		} else {
			user.LoginStreak = 1
		}

		user.LastLoginDate = &now
		pointsDelta = 5

	case ActionAbusivePost:
		// Check if this is the first abusive post today
		if user.LastAbusivePostDate == nil || !isSameDay(*user.LastAbusivePostDate, now) {
			// First abusive post today
			user.AbusivePostCountToday = 1
			pointsDelta = -20
		} else {
			// Increment count
			user.AbusivePostCountToday++

			switch user.AbusivePostCountToday {
			case 2:
				pointsDelta = -50
			case 3:
				pointsDelta = -100
				shouldMute = true
				muteDuration = 24 * time.Hour
			default:
				// 4th+ abusive post: -100 points each
				pointsDelta = -100
				shouldMute = true
				muteDuration = 24 * time.Hour
			}
		}

		user.LastAbusivePostDate = &now

	case ActionDeletePost:
		pointsDelta = -2

	case ActionDeleteHashtagPost:
		pointsDelta = -3

	case ActionCommunityJoin:
		pointsDelta = 10

	case ActionCommunityCreate:
		pointsDelta = 10

	default:
		return errors.New("invalid action type")
	}

	// Update points (never go below 0)
	user.Points += pointsDelta
	if user.Points < 0 {
		user.Points = 0
	}

	// Handle muting
	if shouldMute {
		user.TemporarilyMuted = true
		mutedUntil := now.Add(muteDuration)
		user.MutedUntil = &mutedUntil
	}

	// Recalculate tier
	s.recalculateTier(user)

	// Update user
	user.UpdatedAt = now
	return s.userRepo.Update(user)
}

// Recalculate user tier based on subscription and points
func (s *PointsService) recalculateTier(user *models.User) {
	// Subscription always overrides points
	if user.SubscriptionActive {
		user.Tier = models.TierPlatinum
		return
	}

	// Check points threshold
	if user.Points >= 1000 {
		user.Tier = models.TierPlatinum
	} else {
		user.Tier = models.TierSilver
	}
}

// Check if user can host debate
func (s *PointsService) CanHostDebate(userID string) (bool, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return false, err
	}

	// Platinum users can host unlimited debates
	if user.Tier == models.TierPlatinum {
		return true, nil
	}

	// Silver users: 1 debate per day
	now := time.Now()
	if user.LastDebateHostDate == nil || !isSameDay(*user.LastDebateHostDate, now) {
		// First debate today
		return true, nil
	}

	// Check if they haven't reached the limit (1)
	if user.DebatesHostedToday < 1 {
		return true, nil
	}

	// Already hosted today
	return false, nil
}

// Record debate hosting
func (s *PointsService) RecordDebateHost(userID string) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}

	now := time.Now()

	// Check if it's a new day
	if user.LastDebateHostDate == nil || !isSameDay(*user.LastDebateHostDate, now) {
		user.DebatesHostedToday = 1
	} else {
		user.DebatesHostedToday++
	}

	user.LastDebateHostDate = &now
	user.UpdatedAt = now

	return s.userRepo.Update(user)
}

// Refund debate hosting (called when a scheduled debate is deleted)
func (s *PointsService) RefundDebateHost(userID string) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}

	// Only refund if they have a count > 0
	if user.DebatesHostedToday > 0 {
		user.DebatesHostedToday--
		user.UpdatedAt = time.Now()
		return s.userRepo.Update(user)
	}

	return nil
}

// Helper functions
func isSameDay(t1, t2 time.Time) bool {
	return t1.Year() == t2.Year() && t1.Month() == t2.Month() && t1.Day() == t2.Day()
}

func isConsecutiveDay(t1, t2 time.Time) bool {
	diff := t2.Sub(t1)
	return diff >= 24*time.Hour && diff < 48*time.Hour
}

// Initialize new user with default values
func (s *PointsService) InitializeUser(user *models.User) {
	user.Tier = models.TierSilver
	user.Points = 0
	user.SubscriptionActive = false
	user.TemporarilyMuted = false
	user.MutedUntil = nil
	user.AbusivePostCountToday = 0
	user.LastAbusivePostDate = nil
	user.DebatesHostedToday = 0
	user.LastDebateHostDate = nil
	user.LoginStreak = 0
	user.LastLoginDate = nil
}

// GetUserPoints retrieves the user's points and status
func (s *PointsService) GetUserPoints(userID string) (*models.User, error) {
	return s.userRepo.GetByID(userID)
}
