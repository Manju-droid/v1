package main

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"github.com/yourusername/v-backend/internal/api"
	"github.com/yourusername/v-backend/internal/auth"
	"github.com/yourusername/v-backend/internal/config"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
	"github.com/yourusername/v-backend/internal/repository/memory"
	"github.com/yourusername/v-backend/internal/service"
)

type Server struct {
	router *chi.Mux
}

// initializeDefaultUsers creates default users for development/demo purposes
func initializeDefaultUsers(userRepo repository.UserRepository) {
	now := time.Now()

	// Default demo user (matches frontend currentUserMock)
	defaultUser := &models.User{
		ID:                    "demo-user",
		Name:                  "You",
		Handle:                "you",
		Email:                 "demo@example.com",
		Bio:                   "Your bio here",
		AvatarURL:             "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf",
		CoverPhotoURL:         "",
		FollowersOnlyComments: false,
		FollowersCount:        0,
		FollowingCount:        0,
		PostsCount:            0,
		Tier:                  models.TierSilver,
		Points:                0,
		SubscriptionActive:    false,
		TemporarilyMuted:      false,
		MutedUntil:            nil,
		LastAbusivePostDate:   nil,
		AbusivePostCountToday: 0,
		LastDebateHostDate:    nil,
		DebatesHostedToday:    0,
		LastLoginDate:         nil,
		LoginStreak:           0,
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	// Try to create default user (ignore error if already exists)
	if err := userRepo.Create(defaultUser); err != nil {
		log.Printf("Default user already exists or error creating: %v", err)
	} else {
		log.Println("✅ Initialized default user: demo-user")
	}
}

// initializeSampleNotifications creates sample notifications for the demo user
func initializeSampleNotifications(notifRepo repository.NotificationRepository) {
	now := time.Now()

	sampleNotifications := []*models.Notification{
		{
			ID:          "notif-1",
			UserID:      "demo-user",
			Type:        "follow",
			Title:       "New Follower",
			Message:     "Sarah Johnson started following you",
			ActorID:     stringPtr("user-1"),
			ActorName:   stringPtr("Sarah Johnson"),
			ActorHandle: stringPtr("sarahj"),
			Read:        false,
			CreatedAt:   now.Add(-2 * time.Hour),
		},
		{
			ID:          "notif-2",
			UserID:      "demo-user",
			Type:        "reaction",
			Title:       "New Reaction",
			Message:     "Mike Chen reacted 👍 to your post",
			PostID:      stringPtr("post-1"),
			ActorID:     stringPtr("user-2"),
			ActorName:   stringPtr("Mike Chen"),
			ActorHandle: stringPtr("mikechen"),
			Read:        false,
			CreatedAt:   now.Add(-5 * time.Hour),
		},
		{
			ID:          "notif-3",
			UserID:      "demo-user",
			Type:        "comment",
			Title:       "New Comment",
			Message:     "Alex Rivera commented on your post: \"Great point!\"",
			PostID:      stringPtr("post-1"),
			ActorID:     stringPtr("user-3"),
			ActorName:   stringPtr("Alex Rivera"),
			ActorHandle: stringPtr("alexr"),
			Read:        true,
			CreatedAt:   now.Add(-24 * time.Hour),
		},
		{
			ID:          "notif-4",
			UserID:      "demo-user",
			Type:        "mention",
			Title:       "You were mentioned",
			Message:     "Emma Davis mentioned you in a post",
			PostID:      stringPtr("post-2"),
			ActorID:     stringPtr("user-4"),
			ActorName:   stringPtr("Emma Davis"),
			ActorHandle: stringPtr("emmad"),
			Read:        false,
			CreatedAt:   now.Add(-3 * time.Hour),
		},
		{
			ID:          "notif-5",
			UserID:      "demo-user",
			Type:        "debate_starting",
			Title:       "Debate Starting Soon! 🎙️",
			Message:     "\"Climate Change Solutions\" debate starts in 15 minutes",
			DebateID:    stringPtr("debate-1"),
			DebateTitle: stringPtr("Climate Change Solutions"),
			Read:        false,
			CreatedAt:   now.Add(-30 * time.Minute),
		},
		{
			ID:          "notif-6",
			UserID:      "demo-user",
			Type:        "follow",
			Title:       "New Follower",
			Message:     "James Wilson started following you",
			ActorID:     stringPtr("user-5"),
			ActorName:   stringPtr("James Wilson"),
			ActorHandle: stringPtr("jameswilson"),
			Read:        true,
			CreatedAt:   now.Add(-48 * time.Hour),
		},
	}

	for _, notif := range sampleNotifications {
		if err := notifRepo.Create(notif); err != nil {
			log.Printf("Error creating sample notification: %v", err)
		}
	}

	log.Println("✅ Initialized sample notifications for demo-user")
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}

func main() {
	// Load .env file if it exists (ignore error if file doesn't exist)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	cfg := config.LoadConfig()

	// Set JWT secret
	auth.SetJWTSecret(cfg.JWTSecret)

	server := NewServer(cfg)

	log.Println("🚀 Server starting on :" + cfg.Port)
	log.Println("🌍 Environment:", cfg.Environment)
	log.Println("📍 API Documentation: http://localhost:" + cfg.Port + "/api")
	log.Println("💚 Health Check: http://localhost:" + cfg.Port + "/api/health")

	if err := http.ListenAndServe(":"+cfg.Port, server.router); err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
func NewServer(cfg *config.Config) *Server {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS - Allow frontend to access API
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Initialize repositories (in-memory for now, easy to swap with Postgres later)
	authRepo := memory.NewAuthMemoryRepository()
	userRepo := memory.NewUserMemoryRepository()
	postRepo := memory.NewPostMemoryRepository()
	messageRepo := memory.NewMessageMemoryRepository()
	hashtagRepo := memory.NewHashtagMemoryRepository(postRepo)
	debateRepo := memory.NewDebateMemoryRepository()
	debateStatsRepo := memory.NewDebateStatsMemoryRepository()
	notifRepo := memory.NewNotificationMemoryRepository()
	analyticsRepo := memory.NewAnalyticsMemoryRepository(postRepo)

	// Initialize default users (for development/demo)
	initializeDefaultUsers(userRepo)

	// Initialize sample notifications (for development/demo)
	initializeSampleNotifications(notifRepo)

	// Initialize services
	pointsService := service.NewPointsService(userRepo)
	moderationService := service.NewModerationService(postRepo, userRepo, pointsService)

	// Initialize WebSocket Hub
	hub := service.NewHub()
	go hub.Run()

	// Initialize handlers
	authHandlers := api.NewAuthHandlers(authRepo, userRepo, pointsService, notifRepo)
	userHandlers := api.NewUserHandlers(userRepo)
	postHandlers := api.NewPostHandlers(postRepo, userRepo, notifRepo, analyticsRepo, pointsService, moderationService)
	messageHandlers := api.NewMessageHandlers(messageRepo)
	hashtagHandlers := api.NewHashtagHandlers(hashtagRepo, hub)
	debateHandlers := api.NewDebateHandlers(debateRepo, userRepo, pointsService, hub)
	debateStatsHandlers := api.NewDebateStatsHandlers(debateStatsRepo)

	// Register debate WebSocket message handlers
	hub.RegisterMessageHandler("debate:join_room", func(msg map[string]interface{}, client *service.Client) {
		debateHandlers.HandleDebateWebSocketMessage(msg, client)
	})
	hub.RegisterMessageHandler("debate:leave_room", func(msg map[string]interface{}, client *service.Client) {
		debateHandlers.HandleDebateWebSocketMessage(msg, client)
	})
	hub.RegisterMessageHandler("debate:self_mute_change", func(msg map[string]interface{}, client *service.Client) {
		debateHandlers.HandleDebateWebSocketMessage(msg, client)
	})
	hub.RegisterMessageHandler("debate:mute_change", func(msg map[string]interface{}, client *service.Client) {
		debateHandlers.HandleDebateWebSocketMessage(msg, client)
	})

	notifHandlers := api.NewNotificationHandlers(notifRepo, userRepo)
	analyticsHandlers := api.NewAnalyticsHandlers(analyticsRepo)
	moderationHandlers := api.NewModerationHandlers(moderationService)
	livekitHandlers := api.NewLiveKitHandlers()

	// Root route - API information
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		api.JSON(w, http.StatusOK, map[string]interface{}{
			"name":        "V Social API",
			"version":     "1.0.0",
			"status":      "running",
			"environment": cfg.Environment,
			"endpoints": map[string]string{
				"health":        "/api/health",
				"auth":          "/api/auth",
				"users":         "/api/users",
				"posts":         "/api/posts",
				"messages":      "/api/messages",
				"hashtags":      "/api/hashtags",
				"debates":       "/api/debates",
				"debate-stats":  "/api/debate-stats",
				"notifications": "/api/notifications",
				"analytics":     "/api/analytics",
				"moderation":    "/api/moderation",
			},
			"documentation": "All API endpoints are prefixed with /api",
		})
	})

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Health check
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			api.JSON(w, http.StatusOK, map[string]interface{}{
				"status":  "ok",
				"version": "1.0.0",
				"time":    time.Now().Format(time.RFC3339),
			})
		})

		// Auth routes (public)
		r.Post("/auth/signup", authHandlers.Signup)
		r.Post("/auth/login", authHandlers.Login)

		// Protected auth routes
		r.Group(func(r chi.Router) {
			r.Use(api.RequireAuth)
			r.Get("/auth/me", authHandlers.GetCurrentUser)
			r.Post("/auth/change-password", authHandlers.ChangePassword)
		})

		// User routes
		r.Route("/users", func(r chi.Router) {
			r.Get("/", userHandlers.List)
			r.Post("/", userHandlers.Create)
			r.Get("/{id}", userHandlers.GetByID)
			r.Get("/handle/{handle}", userHandlers.GetByHandle)
			r.Put("/{id}", userHandlers.Update)
			r.Delete("/{id}", userHandlers.Delete)

			// Follow routes
			r.Post("/{id}/follow", userHandlers.Follow)
			r.Delete("/{id}/follow", userHandlers.Unfollow)
			r.Get("/{id}/followers", userHandlers.GetFollowers)
			r.Get("/{id}/following", userHandlers.GetFollowing)
		})

		// Post routes
		r.Route("/posts", func(r chi.Router) {
			r.Get("/", postHandlers.List)
			r.Post("/", postHandlers.Create)
			r.Get("/{id}", postHandlers.Get)
			r.Put("/{id}", postHandlers.Update)
			r.Delete("/{id}", postHandlers.Delete)

			// Comment routes
			r.Post("/{id}/comments", postHandlers.CreateComment)
			r.Get("/{id}/comments", postHandlers.GetComments)
			r.Delete("/{id}/comments/{commentId}", postHandlers.DeleteComment)

			// Reaction routes
			r.Post("/{id}/react", postHandlers.React)
			r.Delete("/{id}/react", postHandlers.Unreact)

			// Save routes
			r.Post("/{id}/save", postHandlers.Save)
			r.Delete("/{id}/save", postHandlers.Unsave)
			r.Get("/saved", postHandlers.GetSavedPosts)

			// Reporting route
			r.Post("/{id}/report", moderationHandlers.ReportPost)
		})

		// Message routes
		r.Route("/messages", func(r chi.Router) {
			// Conversation routes
			r.Get("/conversations", messageHandlers.ListConversations)
			r.Post("/conversations", messageHandlers.CreateConversation)
			r.Get("/conversations/{id}", messageHandlers.GetConversation)

			// Message routes
			r.Get("/conversations/{id}/messages", messageHandlers.GetMessages)
			r.Post("/conversations/{id}/messages", messageHandlers.SendMessage)
			r.Patch("/messages/{messageId}/read", messageHandlers.MarkAsRead)
			r.Get("/conversations/{id}/unread", messageHandlers.GetUnreadCount)
		})

		// Hashtag routes
		r.Route("/hashtags", func(r chi.Router) {
			r.Get("/", hashtagHandlers.List)
			r.Post("/", hashtagHandlers.Create)
			r.Get("/{slug}", hashtagHandlers.GetBySlug)
			r.Delete("/{slug}", hashtagHandlers.Delete)

			// Post linking
			r.Post("/{slug}/posts", hashtagHandlers.AddPost)
			r.Get("/{slug}/posts", hashtagHandlers.GetPosts)
		})

		// Debate routes
		r.Route("/debates", func(r chi.Router) {
			r.Get("/", debateHandlers.List)
			r.Get("/{id}", debateHandlers.Get)

			// Protected routes (require authentication)
			r.Group(func(r chi.Router) {
				r.Use(api.RequireAuth)
				r.Post("/", debateHandlers.Create)
				r.Delete("/clear-all", debateHandlers.ClearAllDebates) // Clear all debates
				r.Put("/{id}", debateHandlers.Update)
				r.Delete("/{id}", debateHandlers.Delete)

				// Participant routes
				r.Post("/{id}/join", debateHandlers.JoinDebate)
				r.Post("/{id}/leave", debateHandlers.LeaveDebate)
				r.Get("/{id}/participants", debateHandlers.GetParticipants)
				r.Patch("/{id}/participants", debateHandlers.UpdateParticipant)
				r.Patch("/{id}/self-mute", debateHandlers.UpdateSelfMute)
				r.Get("/{id}/debug-participants", debateHandlers.DebugParticipants)

				// Speak request routes
				r.Post("/{id}/speak-requests", debateHandlers.CreateSpeakRequest)
				r.Get("/{id}/speak-requests", debateHandlers.GetSpeakRequests)
				r.Patch("/speak-requests/{requestId}", debateHandlers.UpdateSpeakRequest)
				r.Delete("/speak-requests/{requestId}", debateHandlers.DeleteSpeakRequest)

				// Award debate win
				r.Post("/{id}/award-win", debateHandlers.AwardDebateWin)
			})
		})

		// Debate stats routes
		r.Route("/debate-stats", func(r chi.Router) {
			r.Post("/", debateStatsHandlers.RecordStats)
			r.Get("/", debateStatsHandlers.GetAllStats)
		})

		// Moderation routes (admin only - in production, add admin middleware)
		r.Route("/moderation", func(r chi.Router) {
			r.Get("/queue", moderationHandlers.GetModerationQueue)
			r.Post("/posts/{id}/approve", moderationHandlers.ApprovePost)
			r.Post("/posts/{id}/reject", moderationHandlers.RejectPost)
		})

		// Notification routes (protected)
		r.Group(func(r chi.Router) {
			r.Use(api.RequireAuth)
			r.Get("/notifications", notifHandlers.List)
			r.Post("/notifications", notifHandlers.Create)
			r.Get("/notifications/{id}", notifHandlers.Get)
			r.Patch("/notifications/{id}/read", notifHandlers.MarkAsRead)
			r.Post("/notifications/read-all", notifHandlers.MarkAllAsRead)
			r.Delete("/notifications/{id}", notifHandlers.Delete)
			r.Get("/notifications/unread/count", notifHandlers.GetUnreadCount)
		})

		// Analytics routes
		r.Post("/analytics/impression", analyticsHandlers.RecordImpression)
		r.Get("/posts/{id}/metrics", analyticsHandlers.GetPostMetrics)
		r.Get("/posts/{id}/analytics", analyticsHandlers.GetPostAnalytics)

		// WebSocket route
		r.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
			api.ServeWs(hub, w, r)
		})

		// LiveKit token route
		r.Get("/livekit-token", livekitHandlers.GetToken)
	})

	return &Server{router: r}
}
