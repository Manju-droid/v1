package api

import (
	"net/http"
	"os"

	"github.com/livekit/protocol/auth"
)

// LiveKitHandlers handles LiveKit-related endpoints
type LiveKitHandlers struct{}

// NewLiveKitHandlers creates a new LiveKit handlers instance
func NewLiveKitHandlers() *LiveKitHandlers {
	return &LiveKitHandlers{}
}

// GetToken generates a LiveKit access token for a user to join a room
func (h *LiveKitHandlers) GetToken(w http.ResponseWriter, r *http.Request) {
	// Get query parameters
	roomName := r.URL.Query().Get("roomName")
	userId := r.URL.Query().Get("userId")

	if roomName == "" {
		roomName = "default-room"
	}
	if userId == "" {
		userId = "anonymous"
	}

	// Get LiveKit credentials from environment
	apiKey := os.Getenv("LIVEKIT_API_KEY")
	apiSecret := os.Getenv("LIVEKIT_API_SECRET")

	if apiKey == "" || apiSecret == "" {
		Error(w, http.StatusInternalServerError, "LiveKit not configured")
		return
	}

	// Create access token
	at := auth.NewAccessToken(apiKey, apiSecret)
	at.SetIdentity(userId)

	// Add grant for room access
	canPublish := true
	canSubscribe := true
	canUpdateOwnMetadata := true
	grant := &auth.VideoGrant{
		RoomJoin:             true,
		Room:                 roomName,
		CanPublish:           &canPublish,
		CanSubscribe:         &canSubscribe,
		CanUpdateOwnMetadata: &canUpdateOwnMetadata,
	}
	at.AddGrant(grant)

	// Generate JWT token
	token, err := at.ToJWT()
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate token: "+err.Error())
		return
	}

	// Return token
	JSON(w, http.StatusOK, map[string]string{
		"token": token,
	})
}
