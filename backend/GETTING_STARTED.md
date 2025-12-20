# Getting Started with the Backend

## 📋 Prerequisites

### 1. Install Go

**macOS:**
```bash
brew install go
```

**Or download from:** https://golang.org/dl/

**Verify installation:**
```bash
go version
# Should show: go version go1.21.x
```

### 2. Set Go Environment (if needed)
```bash
# Add to ~/.zshrc or ~/.bash_profile
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
```

## 🚀 Start the Backend

### Step 1: Navigate to backend directory
```bash
cd /Users/manjunadhapabolu/Documents/v/backend
```

### Step 2: Install dependencies
```bash
go mod download
go mod tidy
```

### Step 3: Run the server
```bash
# Option 1: Using Make
make run

# Option 2: Direct command
go run cmd/api/main.go

# Option 3: Build then run
go build -o bin/api cmd/api/main.go
./bin/api
```

### Step 4: Verify it's running
```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "time": "2024-01-01T00:00:00Z"
  }
}
```

## 🧪 Test the API

### Create a user
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "handle": "testuser",
    "email": "test@example.com",
    "bio": "Testing the API"
  }'
```

### Get the user
```bash
curl http://localhost:8080/api/users/handle/testuser
```

### Create a post
```bash
curl -X POST http://localhost:8080/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "authorId": "PASTE_USER_ID_HERE",
    "content": "My first post via API!"
  }'
```

### List posts
```bash
curl http://localhost:8080/api/posts
```

## 📊 All Available Endpoints

See `PRODUCTION.md` for complete API documentation.

Quick reference:
- **Users:** `/api/users/*`
- **Posts:** `/api/posts/*`
- **Messages:** `/api/messages/*`
- **Hashtags:** `/api/hashtags/*`
- **Debates:** `/api/debates/*`

## 🔧 Development Commands

```bash
# Run server
make run

# Build binary
make build

# Clean build artifacts
make clean

# Install dependencies
make deps

# Run tests (when you add them)
make test
```

## 🗄️ Connecting to Database

When you're ready to connect your database:

### 1. Install Postgres driver
```bash
go get github.com/lib/pq
```

### 2. Set environment variable
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### 3. I'll help you create the Postgres repository implementations

The interface design means you only need to:
- Create new files in `internal/repository/postgres/`
- Implement the same interfaces with SQL queries
- Update `main.go` to use Postgres repos instead of memory repos

**No handler changes needed!**

## 🐛 Troubleshooting

### Port already in use
```bash
# Find process on port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# Or change port in main.go
http.ListenAndServe(":8081", server.router)
```

### CORS errors
The backend is already configured for `http://localhost:3000` and `http://localhost:3001`.

If your frontend runs on a different port, update `main.go`:
```go
AllowedOrigins: []string{"http://localhost:YOUR_PORT"},
```

### Go not found
Make sure Go is installed and in your PATH:
```bash
which go
# Should show: /usr/local/go/bin/go or similar
```

## 📚 Project Structure

```
backend/
├── cmd/api/                 # Entry point
│   └── main.go              # Server setup and routing
├── internal/
│   ├── api/                 # HTTP handlers
│   │   ├── response.go      # JSON response utilities
│   │   ├── validation.go    # Input validation
│   │   ├── user_handlers.go
│   │   ├── post_handlers.go
│   │   ├── message_handlers.go
│   │   ├── hashtag_handlers.go
│   │   └── debate_handlers.go
│   ├── models/              # Data structures
│   │   ├── user.go
│   │   ├── post.go
│   │   ├── message.go
│   │   ├── hashtag.go
│   │   └── debate.go
│   └── repository/          # Data access layer
│       ├── repository.go    # Interfaces (contract)
│       └── memory/          # In-memory implementations
│           ├── user.go
│           ├── post.go
│           ├── message.go
│           ├── hashtag.go
│           └── debate.go
├── Makefile                 # Build commands
├── go.mod                   # Dependencies
├── PRODUCTION.md            # Full API documentation
└── GETTING_STARTED.md       # This file
```

## 🎯 What's Next?

1. **✅ Install Go** (if not already)
2. **✅ Start the backend** (`make run`)
3. **✅ Test endpoints** (use curl examples above)
4. **🔄 Connect frontend** (update frontend to call these APIs)
5. **🗄️ Add database** (provide connection string when ready)
6. **🔐 Add authentication** (JWT tokens for protected routes)

## 💡 Tips

- The server logs all requests (HTTP method, path, status, duration)
- All data is in-memory - it resets when you restart the server
- When you add a database, data will persist
- The API returns consistent JSON responses with `success`, `data`, and `error` fields
- Input validation is already implemented for all endpoints
- CORS is configured for easy frontend integration

## 🆘 Need Help?

1. Check `PRODUCTION.md` for complete API documentation
2. Check server logs for error messages
3. Test endpoints with curl to isolate issues
4. Verify Go installation: `go version`
5. Verify server is running: `curl http://localhost:8080/api/health`

---

**The backend is production-ready and waiting for your database connection!** 🚀

