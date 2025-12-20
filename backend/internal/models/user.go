package models

import "time"

type UserTier string

const (
	TierSilver   UserTier = "SILVER"
	TierPlatinum UserTier = "PLATINUM"
)

type User struct {
	ID                    string   `json:"id"`
	Name                  string   `json:"name"`
	Handle                string   `json:"handle"`
	Email                 string   `json:"email"`
	PhoneNumber           string   `json:"phoneNumber"`
	Languages             []string `json:"languages"`
	Bio                   string   `json:"bio"`
	AvatarURL             string   `json:"avatarUrl"`
	CoverPhotoURL         string   `json:"coverPhotoUrl"`
	FollowersOnlyComments bool     `json:"followersOnlyComments"`
	FollowersCount        int      `json:"followersCount"`
	FollowingCount        int      `json:"followingCount"`
	PostsCount            int      `json:"postsCount"`

	// Tier and Points System
	Tier               UserTier   `json:"tier"`                 // SILVER or PLATINUM
	Points             int        `json:"points"`               // User points
	SubscriptionActive bool       `json:"subscriptionActive"`   // Active subscription
	TemporarilyMuted   bool       `json:"temporarilyMuted"`     // Muted for 24 hours
	MutedUntil         *time.Time `json:"mutedUntil,omitempty"` // Mute expiration

	// Abuse tracking
	LastAbusivePostDate   *time.Time `json:"lastAbusivePostDate,omitempty"` // Last date with abusive post
	AbusivePostCountToday int        `json:"abusivePostCountToday"`         // Count of abusive posts today

	// Debate hosting limits
	LastDebateHostDate *time.Time `json:"lastDebateHostDate,omitempty"` // Last date debate was hosted
	DebatesHostedToday int        `json:"debatesHostedToday"`           // Debates hosted today

	// Daily streak
	LastLoginDate *time.Time `json:"lastLoginDate,omitempty"` // Last login date
	LoginStreak   int        `json:"loginStreak"`             // Current login streak

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Follow struct {
	FollowerID  string    `json:"followerId"`
	FollowingID string    `json:"followingId"`
	CreatedAt   time.Time `json:"createdAt"`
}
