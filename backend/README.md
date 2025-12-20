# V Backend API

Clean Go backend with in-memory repositories that can be easily swapped with Postgres.

## Architecture

```
backend/
├── cmd/
│   └── api/
│       └── main.go           # Entry point, routes, handlers
├── internal/
│   ├── models/              # Domain models
│   │   ├── user.go
│   │   ├── post.go
│   │   ├── message.go
│   │   ├── hashtag.go
│   │   └── debate.go
│   └── repository/
│       ├── repository.go    # Repository interfaces
│       └── memory/          # In-memory implementations
│           ├── user.go      # ✅ Complete
│           ├── post.go      # TODO
│           ├── message.go   # TODO
│           ├── hashtag.go   # TODO
│           └── debate.go    # TODO
└── go.mod
```

## Setup

1. **Install dependencies:**
```bash
cd backend
go mod download
```

2. **Run the server:**
```bash
go run cmd/api/main.go
```

Server will start on `http://localhost:8080`

## API Endpoints

### Users
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user by ID
- `GET /api/users/handle/{handle}` - Get user by handle
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `POST /api/users/{id}/follow` - Follow user
- `DELETE /api/users/{id}/follow` - Unfollow user
- `GET /api/users/{id}/followers` - Get followers
- `GET /api/users/{id}/following` - Get following

### Posts (TODO - follow user pattern)
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `GET /api/posts/{id}` - Get post
- `POST /api/posts/{id}/comments` - Add comment
- `POST /api/posts/{id}/react` - React to post

### Messages (TODO)
- `GET /api/messages/conversations` - List conversations
- `POST /api/messages/conversations` - Create conversation
- `GET /api/messages/conversations/{id}/messages` - Get messages
- `POST /api/messages/conversations/{id}/messages` - Send message

### Hashtags (TODO)
- `GET /api/hashtags` - List hashtags
- `POST /api/hashtags` - Create hashtag
- `GET /api/hashtags/{slug}` - Get hashtag
- `GET /api/hashtags/{slug}/posts` - Get hashtag posts

### Debates (TODO)
- `GET /api/debates` - List debates
- `POST /api/debates` - Create debate
- `GET /api/debates/{id}` - Get debate
- `POST /api/debates/{id}/join` - Join debate

## How to Extend

### 1. Create Repository Implementation

Follow the pattern in `internal/repository/memory/user.go`:

```go
// internal/repository/memory/post.go
type PostMemoryRepository struct {
    posts map[string]*models.Post
    mu    sync.RWMutex
}

func NewPostMemoryRepository() *PostMemoryRepository {
    return &PostMemoryRepository{
        posts: make(map[string]*models.Post),
    }
}

// Implement all methods from repository.PostRepository interface
func (r *PostMemoryRepository) Create(post *models.Post) error {
    r.mu.Lock()
    defer r.mu.Unlock()
    // ... implementation
}
```

### 2. Add to API struct

```go
// cmd/api/main.go
type API struct {
    userRepo *memory.UserMemoryRepository
    postRepo *memory.PostMemoryRepository  // Add this
}

func main() {
    api := &API{
        userRepo: memory.NewUserMemoryRepository(),
        postRepo: memory.NewPostMemoryRepository(),  // Initialize
    }
}
```

### 3. Implement Handlers

Follow the pattern in `main.go` user handlers:

```go
func (api *API) createPost(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Content string `json:"content"`
        // ... other fields
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    post := &models.Post{
        ID:        uuid.New().String(),
        Content:   req.Content,
        CreatedAt: time.Now(),
    }

    if err := api.postRepo.Create(post); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(post)
}
```

## Migrating to Postgres

When ready to add Postgres:

1. **Create new package:**
```
internal/repository/postgres/
├── user.go
├── post.go
└── ...
```

2. **Implement same interfaces:**
```go
type UserPostgresRepository struct {
    db *sql.DB
}

// Implement repository.UserRepository interface
func (r *UserPostgresRepository) Create(user *models.User) error {
    query := `INSERT INTO users (id, name, handle, ...) VALUES ($1, $2, $3, ...)`
    _, err := r.db.Exec(query, user.ID, user.Name, user.Handle, ...)
    return err
}
```

3. **Swap in main.go:**
```go
// Change from:
userRepo: memory.NewUserMemoryRepository()

// To:
userRepo: postgres.NewUserPostgresRepository(db)
```

**No handler code changes needed!** The interface abstraction makes it seamless.

## Testing

Each repository can be tested independently:

```go
func TestUserRepository(t *testing.T) {
    repo := memory.NewUserMemoryRepository()
    
    user := &models.User{
        ID:     "test-id",
        Name:   "Test User",
        Handle: "test",
    }
    
    err := repo.Create(user)
    // ... assertions
}
```

## Development Notes

- All data is in-memory, cleared on restart
- No authentication yet (add middleware later)
- No validation yet (add as needed)
- Thread-safe with sync.RWMutex
- Ready for Postgres migration

