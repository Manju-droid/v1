package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
	"github.com/yourusername/v-backend/internal/service"
)

type DebateHandlers struct {
	repo          repository.DebateRepository
	userRepo      repository.UserRepository
	pointsService *service.PointsService
	hub           *service.Hub
}

func NewDebateHandlers(repo repository.DebateRepository, userRepo repository.UserRepository, pointsService *service.PointsService, hub *service.Hub) *DebateHandlers {
	return &DebateHandlers{
		repo:          repo,
		userRepo:      userRepo,
		pointsService: pointsService,
		hub:           hub,
	}
}

func (h *DebateHandlers) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title           string `json:"title"`
		Description     string `json:"description"`
		Category        string `json:"category"`
		HostID          string `json:"hostId"`
		Type            string `json:"type"`            // "PUBLIC" or "PRIVATE"
		StartTime       string `json:"startTime"`       // RFC3339 format
		DurationMinutes int    `json:"durationMinutes"` // 30, 60, 360, 1440
		ShowInPulse     bool   `json:"showInPulse"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate required fields
	if err := ValidateRequired(req.Title, "title"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateRequired(req.HostID, "hostId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := ValidateRequired(req.Type, "type"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate title length
	if len(req.Title) > 100 {
		Error(w, http.StatusBadRequest, "Title must be 100 characters or less")
		return
	}

	// Validate debate type
	if req.Type != "PUBLIC" && req.Type != "PRIVATE" {
		Error(w, http.StatusBadRequest, "Type must be 'PUBLIC' or 'PRIVATE'")
		return
	}

	// Validate duration
	validDurations := map[int]bool{30: true, 60: true, 360: true, 1440: true}
	if !validDurations[req.DurationMinutes] {
		Error(w, http.StatusBadRequest, "Duration must be 30, 60, 360, or 1440 minutes")
		return
	}

	// Check if user is muted
	userPoints, err := h.pointsService.GetUserPoints(req.HostID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to check user status")
		return
	}
	if userPoints.TemporarilyMuted {
		if userPoints.MutedUntil != nil && time.Now().Before(*userPoints.MutedUntil) {
			Error(w, http.StatusForbidden, "You are temporarily muted and cannot create debates")
			return
		}
	}

	// Check hosting limits
	canHost, err := h.pointsService.CanHostDebate(req.HostID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to check hosting permission")
		return
	}
	if !canHost {
		Error(w, http.StatusForbidden, "You have reached your daily debate hosting limit. Upgrade to Platinum for unlimited hosting.")
		return
	}

	// Parse and validate start time
	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		Error(w, http.StatusBadRequest, "Invalid startTime format (use RFC3339)")
		return
	}

	// Validate start time is not in the past (allow 1 minute buffer for latency)
	if startTime.Before(time.Now().Add(-1 * time.Minute)) {
		Error(w, http.StatusBadRequest, "Start time must be in the future or now")
		return
	}

	// Calculate end time
	endTime := startTime.Add(time.Duration(req.DurationMinutes) * time.Minute)

	// Determine status based on start time
	status := "ACTIVE"
	if startTime.After(time.Now().Add(1 * time.Minute)) {
		status = "SCHEDULED"
	}

	// For PRIVATE debates, ignore ShowInPulse
	showInPulse := req.ShowInPulse
	if req.Type == "PRIVATE" {
		showInPulse = false
	}

	debate := &models.Debate{
		ID:              uuid.New().String(),
		Title:           req.Title,
		Description:     req.Description,
		Category:        req.Category,
		HostID:          req.HostID,
		Type:            req.Type,
		Status:          status,
		StartTime:       startTime,
		EndTime:         &endTime,
		DurationMinutes: req.DurationMinutes,
		ShowInPulse:     showInPulse,
		AgreeCount:      0,
		DisagreeCount:   0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := h.repo.Create(debate); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Record debate hosting
	if err := h.pointsService.RecordDebateHost(req.HostID); err != nil {
		// Log error but don't fail debate creation
		// In production, you'd want proper logging here
	}

	// Broadcast debate creation to all clients viewing the debates list
	debateCreatedPayload, _ := json.Marshal(map[string]interface{}{
		"type":   "debate:created",
		"debate": debate,
	})
	h.hub.Broadcast <- service.Message{
		RoomID:  "debates-list", // Special room for debates list updates
		Payload: debateCreatedPayload,
		Sender:  nil, // System message, no sender
	}
	log.Printf("[DebateHandlers] Broadcasted debate creation: %s", debate.ID)

	Created(w, debate)
}

func (h *DebateHandlers) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	debate, err := h.repo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Debate not found")
		return
	}

	// Update debate status based on current time
	now := time.Now()
	updated := false

	// SCHEDULED -> ACTIVE when start time arrives
	if debate.Status == "SCHEDULED" && now.After(debate.StartTime) {
		debate.Status = "ACTIVE"
		updated = true
	}

	// ACTIVE -> ENDED when end time arrives
	if debate.Status == "ACTIVE" && debate.EndTime != nil && now.After(*debate.EndTime) {
		debate.Status = "ENDED"
		updated = true
	}

	// Save the updated status
	if updated {
		h.repo.Update(debate)
	}

	// Fetch Host User
	hostUser, err := h.userRepo.GetByID(debate.HostID)
	if err != nil {
		// Log error but continue with fallback
		log.Printf("[Debate List] Error fetching host for debate %s (hostId: %s): %v", debate.ID, debate.HostID, err)
	}

	// Fallback for demo/guest users or if user not found
	if hostUser == nil {
		name := "Unknown Host"
		if debate.HostID == "demo-user" || debate.HostID == "guest" {
			name = "Demo User"
		}

		hostUser = &models.User{
			ID:        debate.HostID,
			Name:      name,
			Handle:    "unknown",
			AvatarURL: "https://ui-avatars.com/api/?name=" + name + "&background=random",
		}
		log.Printf("[Debate List] Using fallback host for debate %s (hostId: %s)", debate.ID, debate.HostID)
	} else {
		log.Printf("[Debate List] Found host for debate %s: %s (@%s)", debate.ID, hostUser.Name, hostUser.Handle)
	}

	response := struct {
		*models.Debate
		Host *models.User `json:"host"`
	}{
		Debate: debate,
		Host:   hostUser,
	}

	JSON(w, http.StatusOK, response)
}

func (h *DebateHandlers) List(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	debates, err := h.repo.List(status, limit, offset)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Update debate statuses based on current time and fetch host info
	now := time.Now()
	debatesWithHosts := make([]map[string]interface{}, 0, len(debates))

	for _, debate := range debates {
		updated := false

		// SCHEDULED -> ACTIVE when start time arrives
		if debate.Status == "SCHEDULED" && now.After(debate.StartTime) {
			debate.Status = "ACTIVE"
			updated = true
		}

		// ACTIVE -> ENDED when end time arrives
		if debate.Status == "ACTIVE" && debate.EndTime != nil && now.After(*debate.EndTime) {
			debate.Status = "ENDED"
			updated = true
		}

		// Save the updated status
		if updated {
			h.repo.Update(debate)
		}

		// Fetch Host User
		hostUser, err := h.userRepo.GetByID(debate.HostID)
		if err != nil {
			// Log error but continue with fallback
			log.Printf("[Debate List] Error fetching host for debate %s (hostId: %s): %v", debate.ID, debate.HostID, err)
		}

		// Fallback for demo/guest users or if user not found
		if hostUser == nil {
			name := "Unknown Host"
			if debate.HostID == "demo-user" || debate.HostID == "guest" {
				name = "Demo User"
			}

			hostUser = &models.User{
				ID:        debate.HostID,
				Name:      name,
				Handle:    "unknown",
				AvatarURL: "https://ui-avatars.com/api/?name=" + name + "&background=random",
			}
			log.Printf("[Debate List] Using fallback host for debate %s (hostId: %s)", debate.ID, debate.HostID)
		} else {
			log.Printf("[Debate List] Found host for debate %s: %s (@%s)", debate.ID, hostUser.Name, hostUser.Handle)
		}

		// Create response with host info
		// Ensure host is always included, even if it's the fallback
		debateWithHost := map[string]interface{}{
			"id":              debate.ID,
			"title":           debate.Title,
			"description":     debate.Description,
			"category":        debate.Category,
			"hostId":          debate.HostID,
			"type":            debate.Type,
			"status":          debate.Status,
			"startTime":       debate.StartTime,
			"endTime":         debate.EndTime,
			"durationMinutes": debate.DurationMinutes,
			"showInPulse":     debate.ShowInPulse,
			"agreeCount":      debate.AgreeCount,
			"disagreeCount":   debate.DisagreeCount,
			"createdAt":       debate.CreatedAt,
			"updatedAt":       debate.UpdatedAt,
		}

		// Always include host - serialize User struct to map to ensure it's included
		if hostUser != nil {
			debateWithHost["host"] = map[string]interface{}{
				"id":        hostUser.ID,
				"name":      hostUser.Name,
				"handle":    hostUser.Handle,
				"avatarUrl": hostUser.AvatarURL,
			}
			log.Printf("[Debate List] Added host to debate %s: %s (@%s)", debate.ID, hostUser.Name, hostUser.Handle)
		} else {
			log.Printf("[Debate List] WARNING: hostUser is nil for debate %s", debate.ID)
		}

		debatesWithHosts = append(debatesWithHosts, debateWithHost)
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"debates": debatesWithHosts,
		"limit":   limit,
		"offset":  offset,
	})
}

func (h *DebateHandlers) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	debate, err := h.repo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Debate not found")
		return
	}

	// Get user ID from context (set by RequireAuth middleware)
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		Error(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var updates struct {
		Status  *string `json:"status"`
		EndTime *string `json:"endTime"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// CRITICAL: Only host can change status to ENDED
	if updates.Status != nil && *updates.Status == "ENDED" {
		if debate.HostID != userID {
			Error(w, http.StatusForbidden, "Only the debate host can end the debate")
			return
		}
		log.Printf("[Debate Update] Host %s ending debate %s", userID, debate.ID)

		// Log user points before ending (for debugging points decrease issue)
		hostUser, err := h.userRepo.GetByID(userID)
		if err == nil && hostUser != nil {
			log.Printf("[Debate Update] Host points BEFORE ending debate: %d", hostUser.Points)
		}

		// NOTE: Ending a debate does NOT affect user points
		// Points are only awarded for: joining debates (+5), winning debates (+10)
		// Points are only deducted for: abusive posts, deleted posts
		// RefundDebateHost only affects DebatesHostedToday count, not points
	}

	oldStatus := debate.Status

	if updates.Status != nil {
		debate.Status = *updates.Status
	}
	if updates.EndTime != nil {
		t, err := time.Parse(time.RFC3339, *updates.EndTime)
		if err != nil {
			Error(w, http.StatusBadRequest, "Invalid endTime format")
			return
		}
		debate.EndTime = &t
	}

	if err := h.repo.Update(debate); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Log user points after ending (for debugging points decrease issue)
	if updates.Status != nil && *updates.Status == "ENDED" {
		hostUser, err := h.userRepo.GetByID(userID)
		if err == nil && hostUser != nil {
			log.Printf("[Debate Update] Host points AFTER ending debate: %d (should be same as before)", hostUser.Points)
		}
	}

	// Broadcast debate status change to all connected clients
	if oldStatus != debate.Status {
		payload, _ := json.Marshal(map[string]interface{}{
			"type":      "debate:status_changed",
			"debateId":  debate.ID,
			"status":    debate.Status,
			"oldStatus": oldStatus,
		})

		h.hub.Broadcast <- service.Message{
			RoomID:  debate.ID,
			Payload: payload,
		}
		log.Printf("[DEBUG] Broadcasting debate status change: %s -> %s for debate %s", oldStatus, debate.Status, debate.ID)
	}

	JSON(w, http.StatusOK, debate)
}

func (h *DebateHandlers) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get debate details before deleting to check status for refund
	debate, err := h.repo.GetByID(id)
	if err != nil {
		Error(w, http.StatusNotFound, "Debate not found")
		return
	}

	if err := h.repo.Delete(id); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Refund hosting limit if debate was scheduled (not started yet)
	if debate.Status == "SCHEDULED" {
		// We don't check for error here as it's a non-critical background operation
		// In production, we should log this
		_ = h.pointsService.RefundDebateHost(debate.HostID)
	}

	NoContent(w)
}

// Participant handlers
func (h *DebateHandlers) JoinDebate(w http.ResponseWriter, r *http.Request) {
	debateID := chi.URLParam(r, "id")

	var req struct {
		UserID string `json:"userId"`
		Side   string `json:"side"`
	}

	log.Printf("[JoinDebate] ENTRY: debateID=%s", debateID)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[JoinDebate] ERROR: Invalid request body: %v", err)
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	log.Printf("[JoinDebate] Request decoded: userId=%s, side=%s", req.UserID, req.Side)

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		log.Printf("[JoinDebate] ERROR: Missing userId: %v", err)
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Side != "agree" && req.Side != "disagree" && req.Side != "neutral" {
		log.Printf("[JoinDebate] ERROR: Invalid side: %s", req.Side)
		Error(w, http.StatusBadRequest, "Side must be 'agree', 'disagree', or 'neutral'")
		return
	}

	// Check if debate exists
	debate, err := h.repo.GetByID(debateID)
	if err != nil {
		log.Printf("[JoinDebate] ERROR: Debate not found: %s, error: %v", debateID, err)
		Error(w, http.StatusNotFound, "Debate not found")
		return
	}
	log.Printf("[JoinDebate] Debate found: id=%s, status=%s", debate.ID, debate.Status)

	// Check ALL participants (including those who left) to determine if user should get points
	// We need to check the full history to avoid awarding points multiple times for the same debate
	allParticipants, err := h.repo.GetAllParticipants(debateID)
	userAlreadyParticipated := false
	if err != nil {
		log.Printf("[JoinDebate] WARNING: Failed to get all participants: %v", err)
	} else {
		log.Printf("[JoinDebate] Total participants (including left): %d", len(allParticipants))
		for _, p := range allParticipants {
			if p.UserID == req.UserID {
				log.Printf("[JoinDebate] User has participated before: userId=%s, side=%s, leftAt=%v", p.UserID, p.Side, p.LeftAt)
				// User participated in this debate before (even if they left and are rejoining)
				// Don't award points again for the same debate
				userAlreadyParticipated = true
				break
			}
		}
	}

	participant := &models.DebateParticipant{
		DebateID:      debateID,
		UserID:        req.UserID,
		Side:          req.Side,
		IsSelfMuted:   true,  // Start muted by default
		IsMutedByHost: false, // Host hasn't muted them
		JoinedAt:      time.Now(),
	}

	log.Printf("[JoinDebate] User %s joining debate %s (side: %s)", req.UserID, debateID, participant.Side)

	// IMMEDIATELY broadcast user-joined signal BEFORE adding to repo (fastest possible)
	userJoinedPayload, _ := json.Marshal(map[string]interface{}{
		"type":   "user-joined",
		"userId": req.UserID,
		"side":   req.Side,
	})

	h.hub.Broadcast <- service.Message{
		RoomID:  debateID,
		Payload: userJoinedPayload,
	}
	log.Printf("[DEBUG] [JOIN] Broadcast user-joined IMMEDIATELY (before repo add)")

	log.Printf("[JoinDebate] Calling AddParticipant: debateID=%s, userId=%s, side=%s", participant.DebateID, participant.UserID, participant.Side)
	if err := h.repo.AddParticipant(participant); err != nil {
		log.Printf("[JoinDebate] ERROR: AddParticipant failed: %v", err)
		Error(w, http.StatusConflict, err.Error())
		return
	}
	log.Printf("[JoinDebate] AddParticipant succeeded")

	// Fetch updated participants list
	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get participants")
		return
	}

	// Enrich participants with user data (synchronous, like leave)
	var enrichedParticipants []map[string]interface{}
	enrichedParticipants = make([]map[string]interface{}, 0, len(participants))

	for _, p := range participants {
		user, err := h.userRepo.GetByID(p.UserID)
		if err != nil {
			// Fallback for missing users
			name := "Unknown User"
			if p.UserID == "demo-user" || p.UserID == "guest" {
				name = "Demo User"
			}

			user = &models.User{
				ID:        p.UserID,
				Name:      name,
				Handle:    "unknown",
				AvatarURL: "https://ui-avatars.com/api/?name=" + name + "&background=random",
			}
		}

		enrichedParticipants = append(enrichedParticipants, map[string]interface{}{
			"id":            p.UserID,
			"debateId":      p.DebateID,
			"side":          p.Side,
			"isSelfMuted":   p.IsSelfMuted,
			"isMutedByHost": p.IsMutedByHost,
			"joinedAt":      p.JoinedAt,
			// User details
			"displayName": user.Name,
			"handle":      user.Handle,
			"avatar":      user.AvatarURL,
		})
	}

	// Broadcast updated list to all clients in the room (same as leave)
	payload, _ := json.Marshal(map[string]interface{}{
		"type":         "debate:participants_updated",
		"participants": enrichedParticipants,
	})

	h.hub.Broadcast <- service.Message{
		RoomID:  debateID,
		Payload: payload,
	}

	// LOGGING FOR DEBUG
	var userIDs []string
	for _, p := range participants {
		userIDs = append(userIDs, p.UserID)
	}
	log.Printf("[DEBUG] PARTICIPANTS_AFTER_JOIN DebateID=%s Users=%v", debateID, userIDs)
	log.Printf("[DEBUG] Broadcasting participants_updated to room %s with %d participants", debateID, len(enrichedParticipants))

	// Award points for joining debate (BEFORE returning response)
	// Only award points if this is the first time joining this specific debate
	if !userAlreadyParticipated {
		// First time joining this debate - award points
		if err := h.pointsService.UpdateUserPoints(req.UserID, service.ActionDebateJoin); err != nil {
			log.Printf("[JoinDebate] WARNING: Failed to award points for joining debate: %v", err)
			// Don't fail the join if points award fails
		} else {
			log.Printf("[JoinDebate] ✅ Awarded 5 points to user %s for joining debate %s", req.UserID, debateID)
		}
	} else {
		log.Printf("[JoinDebate] User %s already participated in debate %s, skipping points award", req.UserID, debateID)
	}

	// Return full participants list in response
	JSON(w, http.StatusOK, map[string]interface{}{
		"status":       "joined",
		"participants": enrichedParticipants,
	})
}

func (h *DebateHandlers) LeaveDebate(w http.ResponseWriter, r *http.Request) {
	debateID := chi.URLParam(r, "id")

	var req struct {
		UserID string `json:"userId"`
	}

	log.Printf("[LeaveDebate] ENTRY: debateID=%s", debateID)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[LeaveDebate] ERROR: Invalid request body: %v", err)
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	log.Printf("[LeaveDebate] Request decoded: userId=%s", req.UserID)

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		log.Printf("[LeaveDebate] ERROR: Missing userId: %v", err)
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Instead of removing, mark as left (set LeftAt) to allow rejoin
	// Get active participants first (those who haven't left)
	activeParticipants, err := h.repo.GetParticipants(debateID)
	var foundParticipant *models.DebateParticipant
	if err == nil {
		for _, p := range activeParticipants {
			if p.UserID == req.UserID {
				foundParticipant = p
				break
			}
		}
	}

	if foundParticipant != nil {
		// Mark as left instead of removing
		now := time.Now()
		foundParticipant.LeftAt = &now
		if err := h.repo.UpdateParticipant(foundParticipant); err != nil {
			log.Printf("[LeaveDebate] WARNING: Failed to update participant (will try remove): %v", err)
			// Fallback to remove if update fails
			if err := h.repo.RemoveParticipant(debateID, req.UserID); err != nil {
				log.Printf("[LeaveDebate] ERROR: RemoveParticipant failed: %v", err)
				Error(w, http.StatusNotFound, err.Error())
				return
			}
			log.Printf("[LeaveDebate] Removed participant (fallback): userId=%s, debateID=%s", req.UserID, debateID)
		} else {
			log.Printf("[LeaveDebate] Marked participant as left: userId=%s, debateID=%s", req.UserID, debateID)
			// Update debate counts
			debate, err := h.repo.GetByID(debateID)
			if err == nil {
				side := strings.ToLower(strings.TrimSpace(foundParticipant.Side))
				if side == "agree" && debate.AgreeCount > 0 {
					debate.AgreeCount--
					log.Printf("[LeaveDebate] Decremented AgreeCount: debateID=%s, new count=%d", debateID, debate.AgreeCount)
				} else if side == "disagree" && debate.DisagreeCount > 0 {
					debate.DisagreeCount--
					log.Printf("[LeaveDebate] Decremented DisagreeCount: debateID=%s, new count=%d", debateID, debate.DisagreeCount)
				}
				h.repo.Update(debate)
			}
		}
	} else {
		// Participant not found in active list - they might have already left or been removed
		// Try remove anyway (idempotent operation)
		if err := h.repo.RemoveParticipant(debateID, req.UserID); err != nil {
			log.Printf("[LeaveDebate] WARNING: Participant not found in active list and RemoveParticipant failed: %v (this is OK if they already left)", err)
			// Don't return error - user might have already left
		} else {
			log.Printf("[LeaveDebate] Removed participant: userId=%s, debateID=%s", req.UserID, debateID)
		}
	}

	// Fetch updated participants list and broadcast
	participants, err := h.repo.GetParticipants(debateID)
	if err == nil {
		// Enrich with user data
		var enrichedParticipants []map[string]interface{}
		for _, p := range participants {
			user, err := h.userRepo.GetByID(p.UserID)
			if err != nil {
				// Fallback for missing users
				name := "Unknown User"
				if p.UserID == "demo-user" || p.UserID == "guest" {
					name = "Demo User"
				}

				user = &models.User{
					ID:        p.UserID,
					Name:      name,
					Handle:    "unknown",
					AvatarURL: "https://ui-avatars.com/api/?name=" + name + "&background=random",
				}
			}

			enrichedParticipants = append(enrichedParticipants, map[string]interface{}{
				"id":            p.UserID,
				"debateId":      p.DebateID,
				"side":          p.Side,
				"isSelfMuted":   p.IsSelfMuted,
				"isMutedByHost": p.IsMutedByHost,
				"joinedAt":      p.JoinedAt,
				// User details
				"displayName": user.Name,
				"handle":      user.Handle,
				"avatar":      user.AvatarURL,
			})
		}

		// Broadcast updated list to all clients in the room
		payload, _ := json.Marshal(map[string]interface{}{
			"type":         "debate:participants_updated",
			"participants": enrichedParticipants,
		})

		h.hub.Broadcast <- service.Message{
			RoomID:  debateID,
			Payload: payload,
		}

		log.Printf("[DEBUG] Broadcasting participants_updated after leave to room %s with %d participants", debateID, len(enrichedParticipants))
	}

	Success(w, "Left debate successfully")
}

func (h *DebateHandlers) GetParticipants(w http.ResponseWriter, r *http.Request) {
	debateID := chi.URLParam(r, "id")

	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Enrich with user data
	var enrichedParticipants []map[string]interface{}
	// log.Printf("GetParticipants: Found %d participants in repo", len(participants))
	for _, p := range participants {
		user, err := h.userRepo.GetByID(p.UserID)
		if err != nil {
			// Fallback for missing users
			name := "Unknown User"
			if p.UserID == "demo-user" || p.UserID == "guest" {
				name = "Demo User"
			}

			user = &models.User{
				ID:        p.UserID,
				Name:      name,
				Handle:    "unknown",
				AvatarURL: "https://ui-avatars.com/api/?name=" + name + "&background=random",
			}
		}

		// Only include active participants (not left)
		if p.LeftAt == nil {
			enrichedParticipants = append(enrichedParticipants, map[string]interface{}{
				"id":            p.UserID,
				"userId":        p.UserID, // Also include as userId for consistency
				"debateId":      p.DebateID,
				"role":          p.Role,
				"side":          p.Side,
				"isSelfMuted":   p.IsSelfMuted,
				"isMutedByHost": p.IsMutedByHost,
				"joinedAt":      p.JoinedAt,
				"leftAt":        p.LeftAt, // Include leftAt so frontend can filter
				// User details
				"displayName": user.Name,
				"handle":      user.Handle,
				"avatar":      user.AvatarURL,
			})
		}
	}

	// Return empty array instead of null if no participants
	if enrichedParticipants == nil {
		enrichedParticipants = []map[string]interface{}{}
	}

	JSON(w, http.StatusOK, enrichedParticipants)
}

func (h *DebateHandlers) DebugParticipants(w http.ResponseWriter, r *http.Request) {
	debateID := chi.URLParam(r, "id")
	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"debateId":     debateID,
		"participants": participants,
	})
}

// UpdateParticipant - Host force mute/unmute (isMutedByHost)
func (h *DebateHandlers) UpdateParticipant(w http.ResponseWriter, r *http.Request) {
	debateID := chi.URLParam(r, "id")

	var req struct {
		UserID        string `json:"userId"`
		IsMutedByHost bool   `json:"isMutedByHost"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Get existing participant
	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	var participant *models.DebateParticipant
	for _, p := range participants {
		if p.UserID == req.UserID {
			participant = p
			break
		}
	}

	if participant == nil {
		Error(w, http.StatusNotFound, "Participant not found")
		return
	}

	participant.IsMutedByHost = req.IsMutedByHost

	if err := h.repo.UpdateParticipant(participant); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Broadcast updated participants list to all clients
	h.broadcastParticipantsUpdate(debateID)

	Success(w, "Participant updated successfully")
}

// UpdateSelfMute - User toggles their own mute (isSelfMuted)
func (h *DebateHandlers) UpdateSelfMute(w http.ResponseWriter, r *http.Request) {
	debateID := chi.URLParam(r, "id")

	var req struct {
		UserID      string `json:"userId"`
		IsSelfMuted bool   `json:"isSelfMuted"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Get existing participant
	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	var participant *models.DebateParticipant
	for _, p := range participants {
		if p.UserID == req.UserID {
			participant = p
			break
		}
	}

	if participant == nil {
		Error(w, http.StatusNotFound, "Participant not found")
		return
	}

	// User cannot unmute if host has muted them
	if !req.IsSelfMuted && participant.IsMutedByHost {
		Error(w, http.StatusForbidden, "Cannot unmute: muted by host")
		return
	}

	participant.IsSelfMuted = req.IsSelfMuted

	if err := h.repo.UpdateParticipant(participant); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Broadcast updated participants list to all clients
	h.broadcastParticipantsUpdate(debateID)

	Success(w, "Self-mute updated successfully")
}

// Helper function to broadcast participants update
func (h *DebateHandlers) broadcastParticipantsUpdate(debateID string) {
	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		return
	}

	// Enrich with user data
	var enrichedParticipants []map[string]interface{}
	for _, p := range participants {
		user, err := h.userRepo.GetByID(p.UserID)
		if err != nil {
			name := "Unknown User"
			if p.UserID == "demo-user" || p.UserID == "guest" {
				name = "Demo User"
			}
			user = &models.User{
				ID:        p.UserID,
				Name:      name,
				Handle:    "unknown",
				AvatarURL: "https://ui-avatars.com/api/?name=" + name + "&background=random",
			}
		}

		// Only include active participants (not left)
		if p.LeftAt == nil {
			enrichedParticipants = append(enrichedParticipants, map[string]interface{}{
				"id":            p.UserID,
				"debateId":      p.DebateID,
				"role":          p.Role,
				"side":          p.Side,
				"isSelfMuted":   p.IsSelfMuted,
				"isMutedByHost": p.IsMutedByHost,
				"joinedAt":      p.JoinedAt,
				"displayName":   user.Name,
				"handle":        user.Handle,
				"avatar":        user.AvatarURL,
			})
		}
	}

	// Broadcast updated list
	payload, _ := json.Marshal(map[string]interface{}{
		"type":         "debate:participants_updated",
		"participants": enrichedParticipants,
	})

	h.hub.Broadcast <- service.Message{
		RoomID:  debateID,
		Payload: payload,
	}

	log.Printf("[DEBUG] Broadcasting participants_updated to room %s with %d participants", debateID, len(enrichedParticipants))
}

// Speak request handlers
func (h *DebateHandlers) CreateSpeakRequest(w http.ResponseWriter, r *http.Request) {
	debateID := chi.URLParam(r, "id")

	var req struct {
		UserID string `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.UserID, "userId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	speakRequest := &models.SpeakRequest{
		ID:        uuid.New().String(),
		DebateID:  debateID,
		UserID:    req.UserID,
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	if err := h.repo.CreateSpeakRequest(speakRequest); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Created(w, speakRequest)
}

func (h *DebateHandlers) GetSpeakRequests(w http.ResponseWriter, r *http.Request) {
	debateID := chi.URLParam(r, "id")

	requests, err := h.repo.GetSpeakRequests(debateID)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, requests)
}

func (h *DebateHandlers) UpdateSpeakRequest(w http.ResponseWriter, r *http.Request) {
	requestID := chi.URLParam(r, "requestId")

	var req struct {
		Status string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Status != "approved" && req.Status != "denied" {
		Error(w, http.StatusBadRequest, "Status must be 'approved' or 'denied'")
		return
	}

	speakRequest := &models.SpeakRequest{
		ID:     requestID,
		Status: req.Status,
	}

	if err := h.repo.UpdateSpeakRequest(speakRequest); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	Success(w, "Speak request updated")
}

// Award points for winning debate (called when debate ends)
func (h *DebateHandlers) AwardDebateWin(w http.ResponseWriter, r *http.Request) {
	_ = chi.URLParam(r, "id") // debateID available if needed for validation

	var req struct {
		WinnerID string `json:"winnerId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := ValidateRequired(req.WinnerID, "winnerId"); err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Award points for winning debate
	if err := h.pointsService.UpdateUserPoints(req.WinnerID, service.ActionDebateWin); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to award points")
		return
	}

	Success(w, "Points awarded for winning debate")
}

func (h *DebateHandlers) DeleteSpeakRequest(w http.ResponseWriter, r *http.Request) {
	requestID := chi.URLParam(r, "requestId")

	if err := h.repo.DeleteSpeakRequest(requestID); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	NoContent(w)
}

// ClearAllDebates clears all debates, participants, and speak requests
func (h *DebateHandlers) ClearAllDebates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		Error(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	if err := h.repo.ClearAll(); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	log.Printf("[DEBUG] All debates cleared")
	JSON(w, http.StatusOK, map[string]string{"message": "All debates cleared successfully"})
}
