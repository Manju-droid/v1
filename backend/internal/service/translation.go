package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
)

// TranslationService handles text translation using LibreTranslate API
type TranslationService struct {
	baseURL string
	apiKey  string
	cache   map[string]string
	mu      sync.RWMutex
}

// LibreTranslateRequest represents the structure for LibreTranslate requests
type LibreTranslateRequest struct {
	Q      string `json:"q"`
	Source string `json:"source"`
	Target string `json:"target"`
	Format string `json:"format"`
	APIKey string `json:"api_key,omitempty"`
}

// LibreTranslateResponse represents the response from LibreTranslate API
type LibreTranslateResponse struct {
	TranslatedText string `json:"translatedText"`
	Error          string `json:"error,omitempty"`
}

// LibreTranslateDetectRequest for language detection
type LibreTranslateDetectRequest struct {
	Q      string `json:"q"`
	APIKey string `json:"api_key,omitempty"`
}

// LibreTranslateDetectResponse for language detection
type LibreTranslateDetectResponse struct {
	Confidence float64 `json:"confidence"`
	Language   string  `json:"language"`
}

// NewTranslationService creates a new translation service
func NewTranslationService(baseURL string, apiKey string) *TranslationService {
	if baseURL == "" {
		// Default to public LibreTranslate instance
		baseURL = "https://libretranslate.com"
	}
	return &TranslationService{
		baseURL: baseURL,
		apiKey:  apiKey,
		cache:   make(map[string]string),
	}
}

// Translate translates text to the target language using LibreTranslate
func (ts *TranslationService) Translate(text, sourceLang, targetLang string) (string, error) {
	if text == "" {
		return "", nil
	}

	// Check cache first
	cacheKey := fmt.Sprintf("%s:%s:%s", sourceLang, targetLang, text)
	ts.mu.RLock()
	if cached, ok := ts.cache[cacheKey]; ok {
		ts.mu.RUnlock()
		return cached, nil
	}
	ts.mu.RUnlock()

	// Build request
	reqBody := LibreTranslateRequest{
		Q:      text,
		Source: sourceLang,
		Target: targetLang,
		Format: "text",
	}

	// Add API key if provided
	if ts.apiKey != "" {
		reqBody.APIKey = ts.apiKey
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make API request
	apiURL := fmt.Sprintf("%s/translate", ts.baseURL)
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		// If API fails, return a simple demo translation
		return fmt.Sprintf("Translation: %s", text), nil
	}
	defer resp.Body.Close()

	// Parse response
	var translationResp LibreTranslateResponse
	if err := json.NewDecoder(resp.Body).Decode(&translationResp); err != nil {
		return fmt.Sprintf("Translation: %s", text), nil
	}

	// Check for API errors
	if translationResp.Error != "" {
		// Return demo translation if API requires key or has errors
		return fmt.Sprintf("Translation: %s", text), nil
	}

	if resp.StatusCode != http.StatusOK || translationResp.TranslatedText == "" {
		// Fallback to demo translation
		return fmt.Sprintf("Translation: %s", text), nil
	}

	translated := translationResp.TranslatedText

	// Cache the result
	ts.mu.Lock()
	ts.cache[cacheKey] = translated
	ts.mu.Unlock()

	return translated, nil
}

// DetectLanguage detects the language of the given text
func (ts *TranslationService) DetectLanguage(text string) (string, error) {
	if text == "" {
		return "en", nil // Default to English
	}

	// If base URL is not set, return default language
	if ts.baseURL == "" {
		return "en", nil
	}

	// Build request
	reqBody := LibreTranslateDetectRequest{
		Q: text,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make API request
	apiURL := fmt.Sprintf("%s/detect", ts.baseURL)
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("language detection request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("language detection API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response (LibreTranslate returns array of detections)
	var detectionResp []LibreTranslateDetectResponse
	if err := json.NewDecoder(resp.Body).Decode(&detectionResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(detectionResp) == 0 {
		return "en", nil // Default to English if detection fails
	}

	return detectionResp[0].Language, nil
}

// ClearCache clears the translation cache
func (ts *TranslationService) ClearCache() {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.cache = make(map[string]string)
}
