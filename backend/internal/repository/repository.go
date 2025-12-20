package repository

import "github.com/yourusername/v-backend/internal/models"

// AuthRepository defines the interface for authentication data access
type AuthRepository interface {
	CreateAuth(auth *models.Auth) error
	GetByEmail(email string) (*models.Auth, error)
	GetByUserID(userID string) (*models.Auth, error)
	UpdatePassword(userID, newPasswordHash string) error
	DeleteAuth(userID string) error
}

// UserRepository defines the interface for user data access
type UserRepository interface {
	Create(user *models.User) error
	GetByID(id string) (*models.User, error)
	GetByHandle(handle string) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	Update(user *models.User) error
	Delete(id string) error
	List(limit, offset int) ([]*models.User, error)

	// Follow operations
	Follow(followerID, followingID string) error
	Unfollow(followerID, followingID string) error
	IsFollowing(followerID, followingID string) (bool, error)
	GetFollowers(userID string, limit, offset int) ([]*models.User, error)
	GetFollowing(userID string, limit, offset int) ([]*models.User, error)
}

// PostRepository defines the interface for post data access
type PostRepository interface {
	Create(post *models.Post) error
	GetByID(id string) (*models.Post, error)
	Update(post *models.Post) error
	Delete(id string) error
	List(limit, offset int) ([]*models.Post, error)
	ListByAuthor(authorID string, limit, offset int) ([]*models.Post, error)

	// Comment operations
	CreateComment(comment *models.Comment) error
	GetCommentsByPost(postID string) ([]*models.Comment, error)
	DeleteComment(id string) error

	// Reaction operations
	AddReaction(reaction *models.Reaction) error
	RemoveReaction(userID, postID string, commentID *string) error
	HasReacted(userID, postID string, commentID *string) (bool, error)

	// Save operations
	SavePost(userID, postID string) error
	UnsavePost(userID, postID string) error
	GetSavedPosts(userID string, limit, offset int) ([]*models.Post, error)
	IsSaved(userID, postID string) (bool, error)
}

// MessageRepository defines the interface for message data access
type MessageRepository interface {
	CreateConversation(conv *models.Conversation) error
	GetConversation(id string) (*models.Conversation, error)
	GetConversationByParticipants(user1ID, user2ID string) (*models.Conversation, error)
	ListConversations(userID string) ([]*models.Conversation, error)

	CreateMessage(message *models.Message) error
	GetMessage(id string) (*models.Message, error)
	ListMessages(conversationID string, limit, offset int) ([]*models.Message, error)
	MarkAsRead(messageID string) error
	GetUnreadCount(conversationID, userID string) (int, error)
}

// HashtagRepository defines the interface for hashtag data access
type HashtagRepository interface {
	Create(hashtag *models.Hashtag) error
	GetByID(id string) (*models.Hashtag, error)
	GetBySlug(slug string) (*models.Hashtag, error)
	List(limit, offset int) ([]*models.Hashtag, error)
	Delete(id string) error

	AddPostToHashtag(hashtagID, postID string, isBoost bool) error
	GetPostsByHashtag(hashtagID string) ([]*models.Post, error)
	GetHashtagStats(hashtagID string) (boosts, shouts int, err error)
}

// DebateRepository defines the interface for debate data access
type DebateRepository interface {
	Create(debate *models.Debate) error
	GetByID(id string) (*models.Debate, error)
	Update(debate *models.Debate) error
	Delete(id string) error
	List(status string, limit, offset int) ([]*models.Debate, error)
	ClearAll() error // Clear all debates, participants, and speak requests

	AddParticipant(participant *models.DebateParticipant) error
	RemoveParticipant(debateID, userID string) error
	GetParticipants(debateID string) ([]*models.DebateParticipant, error)
	GetAllParticipants(debateID string) ([]*models.DebateParticipant, error) // Returns all participants including those who left
	UpdateParticipant(participant *models.DebateParticipant) error

	CreateSpeakRequest(request *models.SpeakRequest) error
	UpdateSpeakRequest(request *models.SpeakRequest) error
	GetSpeakRequests(debateID string) ([]*models.SpeakRequest, error)
	DeleteSpeakRequest(id string) error
}

// NotificationRepository defines the interface for notification data access
type NotificationRepository interface {
	Create(notification *models.Notification) error
	GetByUserID(userID string, limit, offset int) ([]*models.Notification, error)
	GetByID(id string) (*models.Notification, error)
	MarkAsRead(id string) error
	MarkAllAsRead(userID string) error
	Delete(id string) error
	GetUnreadCount(userID string) (int, error)
}

// AnalyticsRepository defines the interface for analytics data access
type AnalyticsRepository interface {
	RecordImpression(postID, userID string) error
	GetPostMetrics(postID string) (*models.PostMetrics, error)
	GetPostAnalytics(postID string) (*models.PostAnalytics, error)
	GetUniqueViewers24h(postID string) (int, error)
	GetUniqueViewersAll(postID string) (int, error)
}

// DebateStatsRepository defines the interface for debate topic statistics data access
type DebateStatsRepository interface {
	RecordStats(topic string, agreeCount, disagreeCount, participants int, debateID string) (*models.DebateTopicStats, error)
	GetAllStats() ([]*models.DebateTopicStats, error)
	GetByTopic(topic string) (*models.DebateTopicStats, error)
}
