package models

import "time"

type CommunityCategory string

const (
	CategoryPolitics      CommunityCategory = "Politics"
	CategoryEntertainment CommunityCategory = "Entertainment"
	CategoryTechnology    CommunityCategory = "Technology"
	CategorySports        CommunityCategory = "Sports"
	CategoryEducation     CommunityCategory = "Education"
	CategoryGeneral       CommunityCategory = "General"
)

type CommunityRole string

const (
	RoleMember CommunityRole = "MEMBER"
	RoleAdmin  CommunityRole = "ADMIN"
)

type Community struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Category    CommunityCategory `json:"category"`
	ImageURL    string            `json:"imageUrl"`
	BannerURL   string            `json:"bannerUrl"`
	CreatorID   string            `json:"creatorId"`
	MemberCount int               `json:"memberCount"`
	PostCount   int               `json:"postCount"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CommunityMember struct {
	CommunityID   string        `json:"communityId"`
	UserID        string        `json:"userId"`
	Role          CommunityRole `json:"role"`
	Status        string        `json:"status"`        // "pending", "active", "rejected"
	PointsAwarded bool          `json:"pointsAwarded"` // Track if points were awarded for joining
	JoinedAt      time.Time     `json:"joinedAt"`
}

// Helper to validate category
func IsValidCategory(c CommunityCategory) bool {
	switch c {
	case CategoryPolitics, CategoryEntertainment, CategoryTechnology, CategorySports, CategoryEducation, CategoryGeneral:
		return true
	}
	return false
}
