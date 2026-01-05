package models

import "time"

type Hashtag struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Category  string    `json:"category"` // New field
	CreatedBy string    `json:"createdBy"`
	CreatedAt time.Time `json:"createdAt"`
	Followers int       `json:"followers"`
}

type HashtagPost struct {
	HashtagID string    `json:"hashtagId"`
	PostID    string    `json:"postId"`
	IsBoost   bool      `json:"isBoost"` // true for boost, false for shout
	CreatedAt time.Time `json:"createdAt"`
}
