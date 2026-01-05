package memory

import (
	"errors"
	"fmt"
	"os"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/yourusername/v-backend/internal/models"
)

type HashtagMemoryRepository struct {
	hashtags              map[string]*models.Hashtag
	hashtagPosts          map[string][]*models.HashtagPost // hashtagID -> posts
	hashtagFollowers      map[string]map[string]bool       // hashtagID -> userID -> true
	postRepo              *PostMemoryRepository
	trendingCache         map[time.Duration][]*models.Hashtag
	trendingCategoryCache map[time.Duration]map[string][]*models.Hashtag
	popularCache          []*models.Hashtag
	cacheMu               sync.RWMutex
	mu                    sync.RWMutex
}

func NewHashtagMemoryRepository(postRepo *PostMemoryRepository) *HashtagMemoryRepository {
	repo := &HashtagMemoryRepository{
		hashtags:              make(map[string]*models.Hashtag),
		hashtagPosts:          make(map[string][]*models.HashtagPost),
		hashtagFollowers:      make(map[string]map[string]bool),
		postRepo:              postRepo,
		trendingCache:         make(map[time.Duration][]*models.Hashtag),
		trendingCategoryCache: make(map[time.Duration]map[string][]*models.Hashtag),
		popularCache:          make([]*models.Hashtag, 0),
	}

	// Start background cache refresher
	go repo.startCacheRefresher()

	return repo
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

	// Check if post already exists in this hashtag
	for _, hp := range r.hashtagPosts[hashtagID] {
		if hp.PostID == postID {
			// Update IsBoost if it changed (e.g. initially false via regex, now true via manual call)
			if isBoost {
				hp.IsBoost = true
			}
			return nil
		}
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
			// Verify post still exists
			_, err := r.postRepo.GetByID(hp.PostID)
			if err != nil {
				continue // Skip deleted posts
			}

			if hp.IsBoost {
				boosts++
			} else {
				shouts++
			}
		}
	}

	return boosts, shouts, nil
}

func (r *HashtagMemoryRepository) RemovePostFromHashtag(postID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	fmt.Printf("DEBUG: HashtagRepo.RemovePostFromHashtag called for PostID: %s\n", postID)

	// Iterate through all hashtags and remove the post if found
	for hashtagID, posts := range r.hashtagPosts {
		newPosts := make([]*models.HashtagPost, 0, len(posts))
		removed := false
		for _, hp := range posts {
			if hp.PostID != postID {
				newPosts = append(newPosts, hp)
			} else {
				removed = true
				fmt.Printf("DEBUG: Found post %s in hashtag %s. Removing.\n", postID, hashtagID)
			}
		}
		// Update if count changed
		if removed {
			r.hashtagPosts[hashtagID] = newPosts
			fmt.Printf("DEBUG: Updated hashtag %s post count. New count: %d\n", hashtagID, len(newPosts))
		}
	}

	return nil
}

func (r *HashtagMemoryRepository) FollowHashtag(userID, hashtagID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.hashtags[hashtagID]; !exists {
		return errors.New("hashtag not found")
	}

	if _, exists := r.hashtagFollowers[hashtagID]; !exists {
		r.hashtagFollowers[hashtagID] = make(map[string]bool)
	}

	r.hashtagFollowers[hashtagID][userID] = true
	// Update the count on the hashtag model itself
	if h, ok := r.hashtags[hashtagID]; ok {
		h.Followers = len(r.hashtagFollowers[hashtagID])
	}
	return nil
}

func (r *HashtagMemoryRepository) UnfollowHashtag(userID, hashtagID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if followers, exists := r.hashtagFollowers[hashtagID]; exists {
		delete(followers, userID)
		// Update the count on the hashtag model itself
		if h, ok := r.hashtags[hashtagID]; ok {
			h.Followers = len(followers)
		}
	}
	return nil
}

func (r *HashtagMemoryRepository) IsFollowing(userID, hashtagID string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if followers, exists := r.hashtagFollowers[hashtagID]; exists {
		return followers[userID], nil
	}
	return false, nil
}

// GetTrending returns trending hashtags for a specific time window
func (r *HashtagMemoryRepository) GetTrending(window time.Duration, limit int) ([]*models.Hashtag, error) {
	r.cacheMu.RLock()
	defer r.cacheMu.RUnlock()

	list, ok := r.trendingCache[window]
	if !ok {
		return []*models.Hashtag{}, nil
	}

	if len(list) > limit {
		return list[:limit], nil
	}
	return list, nil
}

func (r *HashtagMemoryRepository) GetTrendingByCategory(window time.Duration, limit int) (map[string][]*models.Hashtag, error) {
	r.cacheMu.RLock()
	defer r.cacheMu.RUnlock()

	categoryMap, ok := r.trendingCategoryCache[window]
	if !ok {
		return make(map[string][]*models.Hashtag), nil
	}

	// Apply limit per category
	result := make(map[string][]*models.Hashtag)
	for cat, list := range categoryMap {
		if len(list) > limit {
			result[cat] = list[:limit]
		} else {
			result[cat] = list
		}
	}
	return result, nil
}

// GetPopular returns all-time popular hashtags
func (r *HashtagMemoryRepository) GetPopular(limit int) ([]*models.Hashtag, error) {
	r.cacheMu.RLock()
	defer r.cacheMu.RUnlock()

	// Use cache if available
	if r.popularCache != nil {
		if len(r.popularCache) > limit {
			return r.popularCache[:limit], nil
		}
		return r.popularCache, nil
	}

	return []*models.Hashtag{}, nil
}

// Background task to refresh caches every 5 minutes (or configured interval)
func (r *HashtagMemoryRepository) startCacheRefresher() {
	// Initial refresh
	r.refreshCaches()

	interval := 5 * time.Minute
	if valStr := os.Getenv("TRENDING_REFRESH_INTERVAL_SEC"); valStr != "" {
		if val, err := strconv.Atoi(valStr); err == nil {
			interval = time.Duration(val) * time.Second
		}
	}

	ticker := time.NewTicker(interval)
	for range ticker.C {
		r.refreshCaches()
	}
}

func (r *HashtagMemoryRepository) refreshCaches() {
	// Refresh 1 hour trending
	r.refreshTrendingCache(1 * time.Hour)
	// Refresh 24 hour trending
	r.refreshTrendingCache(24 * time.Hour)
	// Refresh popular
	r.refreshPopularCache()
}

// getEnvInt reads an integer from environment variable or returns default
func getEnvInt(key string, defaultVal int) int {
	if valStr := os.Getenv(key); valStr != "" {
		if val, err := strconv.Atoi(valStr); err == nil {
			return val
		}
	}
	return defaultVal
}

// getEnvFloat reads a float from environment variable or returns default
func getEnvFloat(key string, defaultVal float64) float64 {
	if valStr := os.Getenv(key); valStr != "" {
		if val, err := strconv.ParseFloat(valStr, 64); err == nil {
			return val
		}
	}
	return defaultVal
}

// TrendingConfig holds thresholds for trending logic
type TrendingConfig struct {
	MinPosts1h  int
	MinUsers1h  int
	MinSpike1h  float64
	MinPosts24h int
	MinUsers24h int
	UserPostCap int
}

// DefaultTrendingConfig with strict values, configurable via env
var DefaultTrendingConfig = TrendingConfig{
	MinPosts1h:  getEnvInt("TRENDING_MIN_POSTS_1H", 250),
	MinUsers1h:  getEnvInt("TRENDING_MIN_USERS_1H", 100),
	MinSpike1h:  getEnvFloat("TRENDING_MIN_SPIKE_1H", 3.0),
	MinPosts24h: getEnvInt("TRENDING_MIN_POSTS_24H", 800),
	MinUsers24h: getEnvInt("TRENDING_MIN_USERS_24H", 300),
	UserPostCap: getEnvInt("TRENDING_USER_POST_CAP", 3),
}

func (r *HashtagMemoryRepository) refreshTrendingCache(window time.Duration) {
	type scoredHashtag struct {
		hashtag *models.Hashtag
		score   float64
	}

	config := DefaultTrendingConfig // In real app, this could be dynamic

	r.mu.RLock()
	fmt.Printf("DEBUG: Refreshing Trending Cache. Window: %v. Config - MinPosts: %d, MinUsers: %d\n", window, config.MinPosts1h, config.MinUsers1h)
	// Create a snapshot to work with to minimize lock time
	scores := make([]scoredHashtag, 0, len(r.hashtags))
	now := time.Now()
	cutoff := now.Add(-window)
	prevCutoff := now.Add(-2 * window) // For spike check

	for id, hashtag := range r.hashtags {
		posts := r.hashtagPosts[id]

		// Filter posts by window
		windowPosts := 0
		prevWindowPosts := 0
		uniqueUsers := make(map[string]int)
		engagement := 0

		for _, hp := range posts {
			// Current Window [now-window, now]
			if hp.CreatedAt.After(cutoff) {
				// Spam check: cap per user contribution to post count
				post, err := r.postRepo.GetByID(hp.PostID)
				if err != nil {
					continue
				}

				// Only count if user hasn't spammed
				userPostCount := uniqueUsers[post.AuthorID]
				if userPostCount < config.UserPostCap {
					windowPosts++
					uniqueUsers[post.AuthorID]++
				}

				// Count engagement (all engagement counts, regardless of user cap on volume)
				engagement += post.ReactionCount + post.CommentCount
			} else if window == 1*time.Hour && hp.CreatedAt.After(prevCutoff) {
				// Previous Window [now-2h, now-1h] for spike check
				// We don't apply user cap strictly here for performance/simplicity, just raw volume
				prevWindowPosts++
			}
		}

		// Apply Thresholds
		if window == 1*time.Hour {
			if windowPosts < config.MinPosts1h {
				continue
			}
			if len(uniqueUsers) < config.MinUsers1h {
				continue
			}
			// Spike Check: Current / Previous > MinSpike

		} else if window == 24*time.Hour {
			if windowPosts < config.MinPosts24h {
				continue
			}
			if len(uniqueUsers) < config.MinUsers24h {
				continue
			}
		}

		// Scoring Formula (New):
		// score = (windowPosts * 1) + (uniqueUsers * 10) + (engagement * 2)
		score := float64(windowPosts*1) + float64(len(uniqueUsers)*10) + float64(engagement*2)

		scores = append(scores, scoredHashtag{hashtag: hashtag, score: score})
	}
	r.mu.RUnlock()

	// Sort by score desc
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	// Group by Category
	categoryScores := make(map[string][]scoredHashtag)
	for _, s := range scores {
		cat := s.hashtag.Category
		if cat == "" {
			cat = "General"
		}
		categoryScores[cat] = append(categoryScores[cat], s)
	}

	// Extract top 50 for cache (Global)
	limit := 50
	if len(scores) < limit {
		limit = len(scores)
	}

	result := make([]*models.Hashtag, limit)
	for i := 0; i < limit; i++ {
		result[i] = scores[i].hashtag
	}

	// Extract top 50 for cache (Grouped)
	categoryResult := make(map[string][]*models.Hashtag)
	for cat, list := range categoryScores {
		limitCat := 50
		if len(list) < limitCat {
			limitCat = len(list)
		}
		catList := make([]*models.Hashtag, limitCat)
		for i := 0; i < limitCat; i++ {
			catList[i] = list[i].hashtag
		}
		categoryResult[cat] = catList
	}

	// Update Cache
	r.cacheMu.Lock()
	r.trendingCache[window] = result
	r.trendingCategoryCache[window] = categoryResult
	r.cacheMu.Unlock()

	fmt.Printf("Refreshed trending cache for window %s. Count: %d\n", window, len(result))
}

func (r *HashtagMemoryRepository) refreshPopularCache() {
	r.mu.RLock()
	hashtags := make([]*models.Hashtag, 0, len(r.hashtags))
	for _, h := range r.hashtags {
		hashtags = append(hashtags, h)
	}
	// We need post counts for "All time popular".
	// Hashtag model has Followers, but total volume logic is: len(r.hashtagPosts[id])
	// Let's sort by Post Count (Volume) + Followers
	type popularHashtag struct {
		hashtag *models.Hashtag
		score   int
	}

	scored := make([]popularHashtag, 0, len(hashtags))
	for _, h := range hashtags {
		posts := len(r.hashtagPosts[h.ID])
		// Simple popularity score: posts + followers*10
		score := posts + (h.Followers * 10)
		scored = append(scored, popularHashtag{hashtag: h, score: score})
	}
	r.mu.RUnlock()

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	limit := 50
	if len(scored) < limit {
		limit = len(scored)
	}

	result := make([]*models.Hashtag, limit)
	for i := 0; i < limit; i++ {
		result[i] = scored[i].hashtag
	}

	r.cacheMu.Lock()
	r.popularCache = result
	r.cacheMu.Unlock()
}
