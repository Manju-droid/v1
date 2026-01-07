package models

import "time"

type PostStatus string

const (
	PostStatusVisible     PostStatus = "VISIBLE"
	PostStatusAbusiveFlag PostStatus = "ABUSIVE_FLAG"
	PostStatusTempHidden  PostStatus = "TEMP_HIDDEN"
	PostStatusRemoved     PostStatus = "REMOVED"
)

type Post struct {
	ID               string `json:"id"`
	AuthorID         string `json:"authorId"`
	Content          string `json:"content"`
	MediaType        string `json:"mediaType,omitempty"` // "image" or "video"
	MediaURL         string `json:"mediaUrl,omitempty"`
	CommentsDisabled bool   `json:"commentsDisabled"`
	CommentLimit     *int   `json:"commentLimit,omitempty"`
	ReactionCount    int    `json:"reactionCount"`
	CommentCount     int    `json:"commentCount"`
	SaveCount        int    `json:"saveCount"`
	Reach24h         int    `json:"reach_24h"`
	ReachAll         int    `json:"reach_all"`

	// Community fields
	CommunityID      *string `json:"communityId,omitempty"`
	PostType         string  `json:"postType,omitempty"` // Question, Discussion, Resource, Announcement
	TopicTag         string  `json:"topicTag,omitempty"`
	ResponseToPostID string  `json:"responseToPostId,omitempty"` // ID of the post being responded to
	ResponseToPost   *Post   `json:"responseToPost,omitempty"`   // The actual post being responded to (enriched)

	// Moderation fields
	Status            PostStatus `json:"status"`            // VISIBLE, ABUSIVE_FLAG, TEMP_HIDDEN, REMOVED
	ReportCount       int        `json:"reportCount"`       // Number of reports
	InModerationQueue bool       `json:"inModerationQueue"` // In admin review queue

	// Translation fields
	OriginalLanguage string            `json:"originalLanguage,omitempty"` // Detected/specified language code (e.g., "en", "te")
	Translations     map[string]string `json:"translations,omitempty"`     // Cached translations {"te": "...", "hi": "..."}

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Comment struct {
	ID        string    `json:"id"`
	PostID    string    `json:"postId"`
	AuthorID  string    `json:"authorId"`
	ParentID  *string   `json:"parentId,omitempty"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Reaction struct {
	UserID    string    `json:"userId"`
	PostID    string    `json:"postId"`
	CommentID *string   `json:"commentId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type SavedPost struct {
	UserID    string    `json:"userId"`
	PostID    string    `json:"postId"`
	CreatedAt time.Time `json:"createdAt"`
}
