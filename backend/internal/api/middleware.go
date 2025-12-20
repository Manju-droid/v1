package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/yourusername/v-backend/internal/auth"
)

// RequireAuth is middleware that validates JWT tokens
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			Error(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			Error(w, http.StatusUnauthorized, "Invalid authorization header format")
			return
		}

		token := parts[1]

		// Validate token
		claims, err := auth.ValidateToken(token)
		if err != nil {
			Error(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "email", claims.Email)
		ctx = context.WithValue(ctx, "handle", claims.Handle)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuth is middleware that validates JWT tokens but doesn't require them
func OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				token := parts[1]
				if claims, err := auth.ValidateToken(token); err == nil {
					ctx := context.WithValue(r.Context(), "userID", claims.UserID)
					ctx = context.WithValue(ctx, "email", claims.Email)
					ctx = context.WithValue(ctx, "handle", claims.Handle)
					r = r.WithContext(ctx)
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}

