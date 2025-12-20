package api

import (
	"errors"
	"strings"
)

var (
	ErrInvalidEmail   = errors.New("invalid email format")
	ErrEmptyField     = errors.New("required field is empty")
	ErrInvalidHandle  = errors.New("invalid handle format")
	ErrInvalidContent = errors.New("content too long or invalid")
)

// ValidateEmail checks if email is valid
func ValidateEmail(email string) error {
	if email == "" {
		return ErrEmptyField
	}
	if !strings.Contains(email, "@") || !strings.Contains(email, ".") {
		return ErrInvalidEmail
	}
	return nil
}

// ValidateHandle checks if handle is valid
func ValidateHandle(handle string) error {
	if handle == "" {
		return ErrEmptyField
	}
	if len(handle) < 3 || len(handle) > 30 {
		return ErrInvalidHandle
	}
	// Handle should only contain alphanumeric and underscores
	for _, c := range handle {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_') {
			return ErrInvalidHandle
		}
	}
	return nil
}

// ValidateRequired checks if string is not empty
func ValidateRequired(value, fieldName string) error {
	if strings.TrimSpace(value) == "" {
		return errors.New(fieldName + " is required")
	}
	return nil
}

// ValidateContentLength checks content length
func ValidateContentLength(content string, maxLength int) error {
	if len(content) == 0 {
		return errors.New("content is required")
	}
	if len(content) > maxLength {
		return ErrInvalidContent
	}
	return nil
}

