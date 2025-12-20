package memory

import (
	"errors"
	"sync"
	"time"

	"github.com/yourusername/v-backend/internal/models"
)

type HashtagMemoryRepository struct {
	hashtags     map[string]*models.Hashtag
	hashtagPosts map[string][]*models.HashtagPost // hashtagID -> posts
	postRepo     *PostMemoryRepository
	mu           sync.RWMutex
}

func NewHashtagMemoryRepository(postRepo *PostMemoryRepository) *HashtagMemoryRepository {
	return &HashtagMemoryRepository{
		hashtags:     make(map[string]*models.Hashtag),
		hashtagPosts: make(map[string][]*models.HashtagPost),
		postRepo:     postRepo,
	}
}

func (r *HashtagMemoryRepository) Create(hashtag *models.Hashtag) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.hashtags[hashtag.ID]; exists {
		return errors.New("hashtag already exists")
	}

	hashtag.CreatedAt = time.Now()
	r.hashtags[hashtag.ID] = hashtag
	return nil
}

func (r *HashtagMemoryRepository) GetByID(id string) (*models.Hashtag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	hashtag, exists := r.hashtags[id]
	if !exists {
		return nil, errors.New("hashtag not found")
	}
	return hashtag, nil
}

func (r *HashtagMemoryRepository) GetBySlug(slug string) (*models.Hashtag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, hashtag := range r.hashtags {
		if hashtag.Slug == slug {
			return hashtag, nil
		}
	}
	return nil, errors.New("hashtag not found")
}

func (r *HashtagMemoryRepository) List(limit, offset int) ([]*models.Hashtag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	hashtags := make([]*models.Hashtag, 0, len(r.hashtags))
	for _, hashtag := range r.hashtags {
		hashtags = append(hashtags, hashtag)
	}

	start := offset
	if start > len(hashtags) {
		return []*models.Hashtag{}, nil
	}

	end := start + limit
	if end > len(hashtags) {
		end = len(hashtags)
	}

	return hashtags[start:end], nil
}

func (r *HashtagMemoryRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.hashtags, id)
	delete(r.hashtagPosts, id)
	return nil
}

func (r *HashtagMemoryRepository) AddPostToHashtag(hashtagID, postID string, isBoost bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.hashtags[hashtagID]; !exists {
		return errors.New("hashtag not found")
	}

	hashtagPost := &models.HashtagPost{
		HashtagID: hashtagID,
		PostID:    postID,
		IsBoost:   isBoost,
		CreatedAt: time.Now(),
	}

	r.hashtagPosts[hashtagID] = append(r.hashtagPosts[hashtagID], hashtagPost)
	return nil
}

func (r *HashtagMemoryRepository) GetPostsByHashtag(hashtagID string) ([]*models.Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	posts := make([]*models.Post, 0)
	if hashtagPostList, exists := r.hashtagPosts[hashtagID]; exists {
		for _, hp := range hashtagPostList {
			post, err := r.postRepo.GetByID(hp.PostID)
			if err == nil {
				posts = append(posts, post)
			}
		}
	}

	return posts, nil
}

func (r *HashtagMemoryRepository) GetHashtagStats(hashtagID string) (boosts, shouts int, err error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, exists := r.hashtags[hashtagID]; !exists {
		return 0, 0, errors.New("hashtag not found")
	}

	boosts = 0
	shouts = 0

	if hashtagPostList, exists := r.hashtagPosts[hashtagID]; exists {
		for _, hp := range hashtagPostList {
			if hp.IsBoost {
				boosts++
			} else {
				shouts++
			}
		}
	}

	return boosts, shouts, nil
}

