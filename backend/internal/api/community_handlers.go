package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yourusername/v-backend/internal/models"
	"github.com/yourusername/v-backend/internal/repository"
	"github.com/yourusername/v-backend/internal/service"
)

type CommunityHandlers struct {
	communityRepo repository.CommunityRepository
	userRepo      repository.UserRepository
	pointsService *service.PointsService
}

func NewCommunityHandlers(communityRepo repository.CommunityRepository, userRepo repository.UserRepository, pointsService *service.PointsService) *CommunityHandlers {
	return &CommunityHandlers{
		communityRepo: communityRepo,
		userRepo:      userRepo,
		pointsService: pointsService,
	}
}

// Create new community
func (h *CommunityHandlers) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string                   `json:"name"`
		Description string                   `json:"description"`
		Category    models.CommunityCategory `json:"category"`
		ImageURL    string                   `json:"imageUrl"`
		BannerURL   string                   `json:"bannerUrl"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || !models.IsValidCategory(req.Category) {
		http.Error(w, "Name and valid Category are required", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value("userID").(string)

	// Set default image if not provided
	if req.ImageURL == "" {
		req.ImageURL = getRandomImageForCategory(req.Category)
	}

	community := &models.Community{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		ImageURL:    req.ImageURL,
		BannerURL:   req.BannerURL,
		CreatorID:   userID,
		MemberCount: 1, // Creator is first member
		PostCount:   0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.communityRepo.Create(community); err != nil {
		http.Error(w, "Failed to create community", http.StatusInternalServerError)
		return
	}

	// Add creator as admin member
	member := &models.CommunityMember{
		CommunityID:   community.ID,
		UserID:        userID,
		Role:          models.RoleAdmin,
		Status:        "active",
		PointsAwarded: true, // Creator gets points implicitly or handled by join? Let's say yes for simplicity
		JoinedAt:      time.Now(),
	}
	h.communityRepo.AddMember(member)

	JSON(w, http.StatusCreated, community)
}

// List communities
func (h *CommunityHandlers) List(w http.ResponseWriter, r *http.Request) {
	communities, err := h.communityRepo.List()
	if err != nil {
		http.Error(w, "Failed to list communities", http.StatusInternalServerError)
		return
	}
	JSON(w, http.StatusOK, communities)
}

// Get community details
func (h *CommunityHandlers) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	community, err := h.communityRepo.GetByID(id)
	if err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}

	// Check if current user is member (Observer logic)
	// For API, we just return the community data. Frontend decides UI based on membership check.
	// But we might want to return "isMember" flag for convenience.

	// Implementation note: The frontend likely needs to fetch "Am I a member?" separately or we enrich this.
	// For now, simple return.
	JSON(w, http.StatusOK, community)
}

// Join community
func (h *CommunityHandlers) Join(w http.ResponseWriter, r *http.Request) {
	communityID := chi.URLParam(r, "id")
	userID := r.Context().Value("userID").(string)

	// Check if already member
	existing, _ := h.communityRepo.GetMember(communityID, userID)
	if existing != nil {
		http.Error(w, "Already a member", http.StatusBadRequest)
		return
	}

	// Check history to see if they EVER joined before (Anti-farming)
	hasJoinedBefore, _ := h.communityRepo.HasJoinedBefore(communityID, userID)

	pointsAwarded := false
	if !hasJoinedBefore {
		// Award points
		h.pointsService.UpdateUserPoints(userID, service.ActionCommunityJoin)
		pointsAwarded = true
	}

	member := &models.CommunityMember{
		CommunityID:   communityID,
		UserID:        userID,
		Role:          models.RoleMember,
		Status:        "pending", // Default to pending
		PointsAwarded: pointsAwarded,
		JoinedAt:      time.Now(),
	}

	// LOGGING FOR DEBUGGING
	fmt.Printf("JOIN: Adding member %s to community %s with status %s\n", userID, communityID, member.Status)

	if err := h.communityRepo.AddMember(member); err != nil {
		http.Error(w, "Failed to join community", http.StatusInternalServerError)
		return
	}

	// Do NOT increment member count here for pending members
	// Only increment when status becomes active (in UpdateMemberStatus)

	JSON(w, http.StatusCreated, map[string]interface{}{
		"status":   "pending",
		"isMember": true, // Technically a member record exists
	})
}

// Leave community
func (h *CommunityHandlers) Leave(w http.ResponseWriter, r *http.Request) {
	communityID := chi.URLParam(r, "id")
	userID := r.Context().Value("userID").(string)

	if err := h.communityRepo.RemoveMember(communityID, userID); err != nil {
		http.Error(w, "Failed to leave community", http.StatusInternalServerError)
		return
	}

	// Decrement member count
	comm, _ := h.communityRepo.GetByID(communityID)
	if comm != nil {
		comm.MemberCount--
		h.communityRepo.Update(comm)
	}

	JSON(w, http.StatusOK, map[string]string{"status": "left"})
}

// Delete community (Creator only)
func (h *CommunityHandlers) Delete(w http.ResponseWriter, r *http.Request) {
	communityID := chi.URLParam(r, "id")
	userID := r.Context().Value("userID").(string)

	community, err := h.communityRepo.GetByID(communityID)
	if err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}

	// Strict check: Only creator can delete
	if community.CreatorID != userID {
		http.Error(w, "Only the creator can delete this community", http.StatusForbidden)
		return
	}

	if err := h.communityRepo.Delete(communityID); err != nil {
		http.Error(w, "Failed to delete community", http.StatusInternalServerError)
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// Get Members
func (h *CommunityHandlers) GetMembers(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	statusFilter := r.URL.Query().Get("status")

	members, err := h.communityRepo.GetMembers(id)
	if err != nil {
		http.Error(w, "Failed to fetch members", http.StatusInternalServerError)
		return
	}

	// Filter and Enrich
	type EnrichedMember struct {
		*models.CommunityMember
		User *models.User `json:"user"`
	}

	var enrichedMembers []EnrichedMember

	fmt.Printf("DEBUG: GetMembers for Community %s. Total Raw Members: %d. Filter Status: %s\n", id, len(members), statusFilter)

	for _, m := range members {
		fmt.Printf("DEBUG: Member %s, Status: %s\n", m.UserID, m.Status)
		if statusFilter != "" && m.Status != statusFilter {
			fmt.Println("DEBUG: Skipping due to status mismatch")
			continue
		}

		user, err := h.userRepo.GetByID(m.UserID)
		if err != nil {
			fmt.Printf("DEBUG: Skipping member %s - User not found in repo\n", m.UserID)
			continue // Skip if user not found (shouldn't happen)
		}

		enrichedMembers = append(enrichedMembers, EnrichedMember{
			CommunityMember: m,
			User:            user,
		})
	}

	fmt.Printf("DEBUG: Returning %d enriched members\n", len(enrichedMembers))

	JSON(w, http.StatusOK, enrichedMembers)
}

// Update Member Status (Accept Request)
func (h *CommunityHandlers) UpdateMemberStatus(w http.ResponseWriter, r *http.Request) {
	communityID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userId")
	creatorID := r.Context().Value("userID").(string)

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 1. Verify Community Ownership
	community, err := h.communityRepo.GetByID(communityID)
	if err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	if community.CreatorID != creatorID {
		http.Error(w, "Only the creator can manage members", http.StatusForbidden)
		return
	}

	// 2. Get Member
	member, err := h.communityRepo.GetMember(communityID, targetUserID)
	if err != nil {
		http.Error(w, "Member not found", http.StatusNotFound)
		return
	}

	// 3. Update Status
	oldStatus := member.Status
	member.Status = req.Status
	if err := h.communityRepo.UpdateMember(member); err != nil {
		http.Error(w, "Failed to update member", http.StatusInternalServerError)
		return
	}

	// 4. Update Member Count if status changed to active
	if oldStatus != "active" && member.Status == "active" {
		community.MemberCount++
		h.communityRepo.Update(community)
	}

	JSON(w, http.StatusOK, member)
}

// Kick/Decline Member
func (h *CommunityHandlers) KickMember(w http.ResponseWriter, r *http.Request) {
	communityID := chi.URLParam(r, "id")
	targetUserID := chi.URLParam(r, "userId")
	creatorID := r.Context().Value("userID").(string)

	// 1. Verify Community Ownership
	community, err := h.communityRepo.GetByID(communityID)
	if err != nil {
		http.Error(w, "Community not found", http.StatusNotFound)
		return
	}
	if community.CreatorID != creatorID {
		http.Error(w, "Only the creator can manage members", http.StatusForbidden)
		return
	}

	// 2. Remove Member
	if err := h.communityRepo.RemoveMember(communityID, targetUserID); err != nil {
		http.Error(w, "Failed to remove member", http.StatusInternalServerError)
		return
	}

	// Decrement count if they were active or pending?
	// Usually RemoveMember doesn't handle count automatically in repo logic in some patterns,
	// checking repo logic: RemoveMember in memory repo just removes from slice.
	// So we should decrement count.
	community.MemberCount--
	h.communityRepo.Update(community)

	JSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

// Get specific member (check membership)
func (h *CommunityHandlers) GetMember(w http.ResponseWriter, r *http.Request) {
	communityID := chi.URLParam(r, "id")
	userID := chi.URLParam(r, "userId")

	// LOGGING FOR DEBUGGING
	fmt.Printf("GET MEMBER: Checking user %s in community %s...\n", userID, communityID)

	member, err := h.communityRepo.GetMember(communityID, userID)
	if err != nil {
		fmt.Println("GET MEMBER: Not found")
		// Not found is a valid state for checking membership
		JSON(w, http.StatusOK, map[string]interface{}{
			"isMember": false,
		})
		return
	}

	fmt.Printf("GET MEMBER: Found! Role: %s, Status: %s\n", member.Role, member.Status)

	// Found
	JSON(w, http.StatusOK, map[string]interface{}{
		"isMember": true,
		"status":   member.Status, // Return actual status (pending/active)
		"role":     member.Role,
	})
}

// Helper to get random image based on category
func getRandomImageForCategory(category models.CommunityCategory) string {
	// Simple map of categories to a few high-quality Unsplash images
	// In production, this could be more sophisticated or use a real image service

	// Seed random to ensure variation if called multiple times (though for this simple app, simplistic mock is fine)
	// For true randomness in Go < 1.20 we'd need rand.Seed, but let's just use a simple selection based on time or just return one for now to keep it simple and robust.
	// Actually, let's just pick one "hero" image per category for now to be safe, or use Unsplash source API which randomizes.

	// Using source.unsplash.com with specific keywords is a good way to get random relevant images
	// Format: https://source.unsplash.com/1600x900/?{keyword}
	// Note: source.unsplash.com is deprecated/flaky. Better to use specific IDs or specific high-quality search URLs if possible.
	// Let's use a small pool of hardcoded reliable Unsplash IDs for better UX stability.

	switch category {
	case models.CategoryTechnology:
		return "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop"
	case models.CategorySports:
		return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070&auto=format&fit=crop"
	case models.CategoryEntertainment:
		return "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?q=80&w=2070&auto=format&fit=crop"
	case models.CategoryPolitics:
		return "https://images.unsplash.com/photo-1529107386303-066509ccc322?q=80&w=2076&auto=format&fit=crop" // Gavel/Law
	case models.CategoryEducation:
		return "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop"
	default:
		// General or fallback
		return "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2832&auto=format&fit=crop" // Friends/Group
	}
}
