package api

import (
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/service"
)

// HandleDebateWebSocketMessage processes WebSocket messages for debate room events
func (h *DebateHandlers) HandleDebateWebSocketMessage(msg map[string]interface{}, client *service.Client) {
	msgType, ok := msg["type"].(string)
	if !ok {
		log.Printf("[DEBUG] Invalid message type: %v", msg)
		return
	}

	debateID := client.RoomID
	userID := client.UserID

	log.Printf("[DEBUG] Received WebSocket message: type=%s, debateId=%s, userId=%s", msgType, debateID, userID)

	switch msgType {
	case "debate:join_room":
		h.handleJoinRoom(debateID, userID)
	case "debate:leave_room":
		h.handleLeaveRoom(debateID, userID)
	case "debate:self_mute_change":
		h.handleSelfMuteChange(msg, debateID, userID)
	case "debate:mute_change":
		h.handleMuteChange(msg, debateID, userID)
	default:
		log.Printf("[DEBUG] Unknown message type: %s", msgType)
	}
}

// handleJoinRoom processes a join room request
func (h *DebateHandlers) handleJoinRoom(debateID, userID string) {
	log.Printf("[DEBUG] handleJoinRoom: debateId=%s, userId=%s", debateID, userID)

	// Get debate to check if user is host
	debate, err := h.repo.GetByID(debateID)
	if err != nil {
		log.Printf("[ERROR] Debate not found: %s", debateID)
		return
	}

	// Check if participant already exists
	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		log.Printf("[ERROR] Failed to get participants: %v", err)
		return
	}

	var existingParticipant *models.DebateParticipant
	for _, p := range participants {
		if p.UserID == userID && p.LeftAt == nil {
			existingParticipant = p
			break
		}
	}

	// Determine role
	role := "USER"
	if debate.HostID == userID {
		role = "HOST"
	}

	// If participant doesn't exist, create one
	if existingParticipant == nil {
		now := time.Now()
		participant := &models.DebateParticipant{
			ID:            uuid.New().String(),
			DebateID:      debateID,
			UserID:        userID,
			Role:          role,
			Side:          "", // Will be set when user picks a side
			IsSelfMuted:   true, // Start muted by default
			IsMutedByHost: false,
			JoinedAt:      now,
		}

		if err := h.repo.AddParticipant(participant); err != nil {
			log.Printf("[ERROR] Failed to add participant: %v", err)
			return
		}

		log.Printf("[DEBUG] Created new participant: debateId=%s, userId=%s, role=%s", debateID, userID, role)
	} else {
		// Rejoin if they left
		if existingParticipant.LeftAt != nil {
			existingParticipant.LeftAt = nil
			existingParticipant.JoinedAt = time.Now()
			if err := h.repo.UpdateParticipant(existingParticipant); err != nil {
				log.Printf("[ERROR] Failed to update participant: %v", err)
				return
			}
			log.Printf("[DEBUG] Participant rejoined: debateId=%s, userId=%s", debateID, userID)
		}
	}

	// Broadcast updated participants list
	h.broadcastParticipantsUpdate(debateID)
}

// handleLeaveRoom processes a leave room request
func (h *DebateHandlers) handleLeaveRoom(debateID, userID string) {
	log.Printf("[DEBUG] handleLeaveRoom: debateId=%s, userId=%s", debateID, userID)

	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		log.Printf("[ERROR] Failed to get participants: %v", err)
		return
	}

	for _, p := range participants {
		if p.UserID == userID && p.LeftAt == nil {
			now := time.Now()
			p.LeftAt = &now
			if err := h.repo.UpdateParticipant(p); err != nil {
				log.Printf("[ERROR] Failed to update participant: %v", err)
				return
			}
			log.Printf("[DEBUG] Marked participant as left: debateId=%s, userId=%s", debateID, userID)
			break
		}
	}

	// Broadcast updated participants list
	h.broadcastParticipantsUpdate(debateID)
}

// handleSelfMuteChange processes a self-mute change request
func (h *DebateHandlers) handleSelfMuteChange(msg map[string]interface{}, debateID, userID string) {
	isSelfMuted, ok := msg["isSelfMuted"].(bool)
	if !ok {
		log.Printf("[ERROR] Invalid isSelfMuted value: %v", msg["isSelfMuted"])
		return
	}

	log.Printf("[DEBUG] handleSelfMuteChange: debateId=%s, userId=%s, isSelfMuted=%v", debateID, userID, isSelfMuted)

	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		log.Printf("[ERROR] Failed to get participants: %v", err)
		return
	}

	for _, p := range participants {
		if p.UserID == userID && p.LeftAt == nil {
			// User cannot unmute if host has muted them
			if !isSelfMuted && p.IsMutedByHost {
				log.Printf("[DEBUG] User cannot unmute: muted by host, debateId=%s, userId=%s", debateID, userID)
				return
			}

			p.IsSelfMuted = isSelfMuted
			if err := h.repo.UpdateParticipant(p); err != nil {
				log.Printf("[ERROR] Failed to update participant: %v", err)
				return
			}

			log.Printf("[DEBUG] Updated self-mute: debateId=%s, userId=%s, isSelfMuted=%v", debateID, userID, isSelfMuted)
			break
		}
	}

	// Broadcast updated participants list
	h.broadcastParticipantsUpdate(debateID)
}

// handleMuteChange processes a host mute/unmute request
func (h *DebateHandlers) handleMuteChange(msg map[string]interface{}, debateID, userID string) {
	targetUserID, ok := msg["targetUserId"].(string)
	if !ok {
		log.Printf("[ERROR] Invalid targetUserId: %v", msg["targetUserId"])
		return
	}

	isMutedByHost, ok := msg["isMutedByHost"].(bool)
	if !ok {
		log.Printf("[ERROR] Invalid isMutedByHost: %v", msg["isMutedByHost"])
		return
	}

	log.Printf("[DEBUG] handleMuteChange: debateId=%s, hostUserId=%s, targetUserId=%s, isMutedByHost=%v", debateID, userID, targetUserID, isMutedByHost)

	// Verify user is host
	debate, err := h.repo.GetByID(debateID)
	if err != nil || debate.HostID != userID {
		log.Printf("[ERROR] Only host can mute/unmute users: debateId=%s, userId=%s", debateID, userID)
		return
	}

	participants, err := h.repo.GetParticipants(debateID)
	if err != nil {
		log.Printf("[ERROR] Failed to get participants: %v", err)
		return
	}

	for _, p := range participants {
		if p.UserID == targetUserID && p.LeftAt == nil {
			p.IsMutedByHost = isMutedByHost
			if err := h.repo.UpdateParticipant(p); err != nil {
				log.Printf("[ERROR] Failed to update participant: %v", err)
				return
			}

			log.Printf("[DEBUG] Updated host mute: debateId=%s, targetUserId=%s, isMutedByHost=%v", debateID, targetUserID, isMutedByHost)
			break
		}
	}

	// Broadcast updated participants list
	h.broadcastParticipantsUpdate(debateID)
}

