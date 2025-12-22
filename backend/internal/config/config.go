package config

import (
	"os"
	"strings"
)

type Config struct {
	Port                 string
	JWTSecret            string
	Environment          string
	CORSOrigins          []string
	DatabaseURL          string
	LibreTranslateURL    string // URL to LibreTranslate instance
	LibreTranslateAPIKey string // Optional API key for public instance
}

// LoadConfig loads configuration from environment variables
func LoadConfig() *Config {
	config := &Config{
		Port:                 getEnv("PORT", "8080"),
		JWTSecret:            getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		Environment:          getEnv("ENVIRONMENT", "development"),
		DatabaseURL:          getEnv("DATABASE_URL", ""),
		LibreTranslateURL:    getEnv("LIBRETRANSLATE_URL", "https://libretranslate.com"),
		LibreTranslateAPIKey: getEnv("LIBRETRANSLATE_API_KEY", ""),
		CORSOrigins:          getCORSOrigins(),
	}

	return config
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getCORSOrigins() []string {
	origins := os.Getenv("CORS_ORIGINS")
	if origins == "" {
		// Default to localhost for development
		return []string{"http://localhost:3000", "http://localhost:3001"}
	}
	return strings.Split(origins, ",")
}
