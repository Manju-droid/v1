package models

import "time"

type Auth struct {
	UserID       string    `json:"userId"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // Never send to client
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SignupRequest struct {
	Name        string `json:"name"`
	Handle      string `json:"handle"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phoneNumber"`
	Language    string `json:"language"`
	Password    string `json:"password"`
	Bio         string `json:"bio"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}
