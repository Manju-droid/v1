package memory

import (
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/yourusername/v-backend/internal/models"
)

type PostMemoryRepository struct {
	posts     map[string]*models.Post
	comments  map[string]*models.Comment
	reactions map[string]*models.Reaction     // key: userID-postID or userID-postID-commentID
	saves     map[string]map[string]time.Time // userID -> map[postID]timestamp
	mu        sync.RWMutex
}

func NewPostMemoryRepository() *PostMemoryRepository {
	return &PostMemoryRepository{
		posts:     make(map[string]*models.Post),
		comments:  make(map[string]*models.Comment),
		reactions: make(map[string]*models.Reaction),
		saves:     make(map[string]map[string]time.Time),
	}
}

func (r *PostMemoryRepository) Create(post *models.Post) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.posts[post.ID]; exists {
		return errors.New("post already exists")
	}

	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()

	// Initialize moderation fields if not set
	if post.Status == "" {
		post.Status = models.PostStatusVisible
	}
	if post.ReportCount == 0 {
		post.ReportCount = 0
	}
	post.InModerationQueue = false

	r.posts[post.ID] = post
	return nil
}

func (r *PostMemoryRepository) GetByID(id string) (*models.Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	post, exists := r.posts[id]
	if !exists {
		return nil, errors.New("post not found")
	}
	return post, nil
}

func (r *PostMemoryRepository) Update(post *models.Post) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.posts[post.ID]; !exists {
		return errors.New("post not found")
	}

	post.UpdatedAt = time.Now()
	r.posts[post.ID] = post
	return nil
}

func (r *PostMemoryRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.posts, id)

	// Delete associated comments
	for commentID, comment := range r.comments {
		if comment.PostID == id {
			delete(r.comments, commentID)
		}
	}

	// Delete associated reactions
	for reactionKey, reaction := range r.reactions {
		if reaction.PostID == id {
			delete(r.reactions, reactionKey)
		}
	}

	// Delete from saves
	for _, savedPosts := range r.saves {
		delete(savedPosts, id)
	}

	return nil
}

func (r *PostMemoryRepository) List(limit, offset int) ([]*models.Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	posts := make([]*models.Post, 0, len(r.posts))
	for _, post := range r.posts {
		// Filter out TEMP_HIDDEN and REMOVED posts from feed
		// AND filter out Community posts from main feed
		if post.Status != models.PostStatusTempHidden && post.Status != models.PostStatusRemoved && post.CommunityID == nil {
			posts = append(posts, post)
		}
	}

	// Sort by created date (newest first)
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].CreatedAt.After(posts[j].CreatedAt)
	})

	start := offset
	if start > len(posts) {
		return []*models.Post{}, nil
	}

	end := start + limit
	if end > len(posts) {
		end = len(posts)
	}

	return posts[start:end], nil
}

func (r *PostMemoryRepository) ListByAuthor(authorID string, limit, offset int) ([]*models.Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	posts := make([]*models.Post, 0)
	for _, post := range r.posts {
		if post.AuthorID == authorID {
			// Filter out TEMP_HIDDEN and REMOVED posts from feed
			if post.Status != models.PostStatusTempHidden && post.Status != models.PostStatusRemoved {
				posts = append(posts, post)
			}
		}
	}

	// Sort by created date (newest first)
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].CreatedAt.After(posts[j].CreatedAt)
	})

	start := offset
	if start > len(posts) {
		return []*models.Post{}, nil
	}

	end := start + limit
	if end > len(posts) {
		end = len(posts)
	}

	return posts[start:end], nil
}

func (r *PostMemoryRepository) ListByCommunity(communityID string, limit, offset int) ([]*models.Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	posts := make([]*models.Post, 0)
	for _, post := range r.posts {
		if post.CommunityID != nil && *post.CommunityID == communityID {
			// Filter out TEMP_HIDDEN and REMOVED posts from feed
			if post.Status != models.PostStatusTempHidden && post.Status != models.PostStatusRemoved {
				posts = append(posts, post)
			}
		}
	}

	// Sort by created date (newest first)
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].CreatedAt.After(posts[j].CreatedAt)
	})

	start := offset
	if start > len(posts) {
		return []*models.Post{}, nil
	}

	end := start + limit
	if end > len(posts) {
		end = len(posts)
	}

	return posts[start:end], nil
}

// Comment operations
func (r *PostMemoryRepository) CreateComment(comment *models.Comment) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.comments[comment.ID]; exists {
		return errors.New("comment already exists")
	}

	// Verify post exists
	if _, exists := r.posts[comment.PostID]; !exists {
		return errors.New("post not found")
	}

	comment.CreatedAt = time.Now()
	comment.UpdatedAt = time.Now()
	r.comments[comment.ID] = comment

	// Increment post comment count
	r.posts[comment.PostID].CommentCount++

	return nil
}

func (r *PostMemoryRepository) GetCommentsByPost(postID string) ([]*models.Comment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	comments := make([]*models.Comment, 0)
	for _, comment := range r.comments {
		if comment.PostID == postID {
			comments = append(comments, comment)
		}
	}

	return comments, nil
}

func (r *PostMemoryRepository) DeleteComment(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	comment, exists := r.comments[id]
	if !exists {
		return errors.New("comment not found")
	}

	// Decrement post comment count
	if post, exists := r.posts[comment.PostID]; exists && post.CommentCount > 0 {
		post.CommentCount--
	}

	delete(r.comments, id)
	return nil
}

// Reaction operations
func (r *PostMemoryRepository) AddReaction(reaction *models.Reaction) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	var key string
	if reaction.CommentID != nil {
		key = reaction.UserID + "-" + reaction.PostID + "-" + *reaction.CommentID
	} else {
		key = reaction.UserID + "-" + reaction.PostID
	}

	if _, exists := r.reactions[key]; exists {
		return errors.New("already reacted")
	}

	reaction.CreatedAt = time.Now()
	r.reactions[key] = reaction

	// Increment post reaction count
	if post, exists := r.posts[reaction.PostID]; exists {
		post.ReactionCount++
	}

	return nil
}

func (r *PostMemoryRepository) RemoveReaction(userID, postID string, commentID *string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	var key string
	if commentID != nil {
		key = userID + "-" + postID + "-" + *commentID
	} else {
		key = userID + "-" + postID
	}

	if _, exists := r.reactions[key]; !exists {
		return errors.New("reaction not found")
	}

	delete(r.reactions, key)

	// Decrement post reaction count
	if post, exists := r.posts[postID]; exists && post.ReactionCount > 0 {
		post.ReactionCount--
	}

	return nil
}

func (r *PostMemoryRepository) HasReacted(userID, postID string, commentID *string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var key string
	if commentID != nil {
		key = userID + "-" + postID + "-" + *commentID
	} else {
		key = userID + "-" + postID
	}

	_, exists := r.reactions[key]
	return exists, nil
}

// Save operations
func (r *PostMemoryRepository) SavePost(userID, postID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.posts[postID]; !exists {
		return errors.New("post not found")
	}

	if r.saves[userID] == nil {
		r.saves[userID] = make(map[string]time.Time)
	}

	if _, exists := r.saves[userID][postID]; exists {
		return errors.New("post already saved")
	}

	r.saves[userID][postID] = time.Now()

	// Increment post save count
	r.posts[postID].SaveCount++

	return nil
}

func (r *PostMemoryRepository) UnsavePost(userID, postID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.saves[userID] != nil {
		delete(r.saves[userID], postID)

		// Decrement post save count
		if post, exists := r.posts[postID]; exists && post.SaveCount > 0 {
			post.SaveCount--
		}
	}

	return nil
}

func (r *PostMemoryRepository) GetSavedPosts(userID string, limit, offset int) ([]*models.Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	savedPosts := make([]*models.Post, 0)
	if savedPostIDs := r.saves[userID]; savedPostIDs != nil {
		for postID := range savedPostIDs {
			if post, exists := r.posts[postID]; exists {
				savedPosts = append(savedPosts, post)
			}
		}
	}

	start := offset
	if start > len(savedPosts) {
		return []*models.Post{}, nil
	}

	end := start + limit
	if end > len(savedPosts) {
		end = len(savedPosts)
	}

	return savedPosts[start:end], nil
}

func (r *PostMemoryRepository) IsSaved(userID, postID string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.saves[userID] == nil {
		return false, nil
	}

	_, exists := r.saves[userID][postID]
	return exists, nil
}
