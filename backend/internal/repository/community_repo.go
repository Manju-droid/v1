package repository

import "github.com/yourusername/v-backend/internal/models"

type CommunityRepository interface {
	Create(community *models.Community) error
	GetByID(id string) (*models.Community, error)
	Update(community *models.Community) error
	List() ([]*models.Community, error)
	Delete(id string) error

	// Member management
	AddMember(member *models.CommunityMember) error
	RemoveMember(communityID, userID string) error
	GetMember(communityID, userID string) (*models.CommunityMember, error)
	GetMembers(communityID string) ([]*models.CommunityMember, error)

	// History check for points
	HasJoinedBefore(communityID, userID string) (bool, error)
}
