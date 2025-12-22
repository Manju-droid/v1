package service

import (
	"encoding/json"
	"os"
	"regexp"
	"strings"
	"unicode"
)

// ProfanityWord represents a single profane word configuration
type ProfanityWord struct {
	ID        string `json:"id"`
	Canonical string `json:"canonical"`
	Severity  string `json:"severity"`
}

// ProfanityConfig holds the full configuration
type ProfanityConfig struct {
	Words []ProfanityWord `json:"words"`
}

// ProfanityMatch represents a detected match
type ProfanityMatch struct {
	RuleID string
	Start  int
	End    int
}

// ProfanityResult is the result of profanity detection
type ProfanityResult struct {
	IsProfane bool
	Severity  string
	Matches   []ProfanityMatch
}

// Global configuration and patterns
var (
	profanityConfig   *ProfanityConfig
	profanityPatterns map[string]*regexp.Regexp
)

// Initialize profanity engine
func init() {
	// Load configuration
	config, err := loadProfanityConfig("internal/service/profanity_config.json")
	if err != nil {
		// Fallback to hardcoded config if file not found
		config = getDefaultConfig()
	}
	profanityConfig = config

	// Build patterns
	profanityPatterns = make(map[string]*regexp.Regexp)
	for _, word := range config.Words {
		profanityPatterns[word.ID] = buildPattern(word.Canonical)
	}
}

// getDefaultConfig returns a hardcoded default configuration
func getDefaultConfig() *ProfanityConfig {
	return &ProfanityConfig{
		Words: []ProfanityWord{
			{ID: "telugu_erripuka", Canonical: "erripuka", Severity: "high"},
			{ID: "telugu_kodaka", Canonical: "kodaka", Severity: "high"},
			{ID: "telugu_koduku", Canonical: "koduku", Severity: "high"},
			{ID: "telugu_dengu", Canonical: "dengu", Severity: "high"},
			{ID: "telugu_dengey", Canonical: "dengey", Severity: "high"},
			{ID: "telugu_puka", Canonical: "puka", Severity: "high"},
			{ID: "telugu_pooka", Canonical: "pooka", Severity: "high"},
			{ID: "telugu_gudda", Canonical: "gudda", Severity: "high"},
			{ID: "telugu_boothi", Canonical: "boothi", Severity: "high"},
			{ID: "telugu_boothulu", Canonical: "boothulu", Severity: "high"},
			{ID: "telugu_lanja", Canonical: "lanja", Severity: "high"},
			{ID: "telugu_lanjakodaka", Canonical: "lanjakodaka", Severity: "high"},
			{ID: "telugu_lanjakoduku", Canonical: "lanjakoduku", Severity: "high"},
			{ID: "telugu_thoka", Canonical: "thoka", Severity: "medium"},
			{ID: "telugu_munda", Canonical: "munda", Severity: "medium"},
			{ID: "telugu_modda", Canonical: "modda", Severity: "high"},
			{ID: "telugu_gujju", Canonical: "gujju", Severity: "medium"},
			{ID: "telugu_boothumunda", Canonical: "boothumunda", Severity: "high"},
			{ID: "telugu_dengali", Canonical: "dengali", Severity: "high"},
			{ID: "telugu_dengana", Canonical: "dengana", Severity: "high"},
			{ID: "telugu_dengichuko", Canonical: "dengichuko", Severity: "high"},
			{ID: "telugu_boothibidda", Canonical: "boothibidda", Severity: "high"},
			{ID: "telugu_nakodaka", Canonical: "nakodaka", Severity: "high"},
			{ID: "telugu_nakoduku", Canonical: "nakoduku", Severity: "high"},
		},
	}
}

// loadProfanityConfig loads the profanity configuration from JSON file
func loadProfanityConfig(path string) (*ProfanityConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var config ProfanityConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

// normalizeForProfanity normalizes text for profanity detection
func normalizeForProfanity(input string) string {
	// Step 1: Convert to lowercase
	text := strings.ToLower(input)

	// Step 2: Remove all non-alphanumeric characters FIRST (before leetspeak conversion)
	var builder strings.Builder
	for _, r := range text {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			builder.WriteRune(r)
		}
	}
	text = builder.String()

	// Step 3: Replace leetspeak (now only on remaining alphanumerics)
	leetspeak := map[rune]rune{
		'0': 'o',
		'1': 'i',
		'3': 'e',
		'4': 'a',
		'5': 's',
		'7': 't',
		'8': 'b',
	}

	builder.Reset()
	for _, r := range text {
		if replacement, ok := leetspeak[r]; ok {
			builder.WriteRune(replacement)
		} else {
			builder.WriteRune(r)
		}
	}
	text = builder.String()

	// Step 4: Collapse repeated letters (max 2 consecutive)
	builder.Reset()
	var prevRune rune
	var count int

	for _, r := range text {
		if r == prevRune {
			count++
			if count <= 2 {
				builder.WriteRune(r)
			}
		} else {
			builder.WriteRune(r)
			prevRune = r
			count = 1
		}
	}

	return builder.String()
}

// buildPattern creates a flexible regex pattern from a canonical word
func buildPattern(canonical string) *regexp.Regexp {
	// Build pattern that allows repeated letters
	var pattern strings.Builder

	for _, r := range canonical {
		// Each letter must appear at least once, can optionally repeat
		pattern.WriteRune(r)
		pattern.WriteRune('+') // one or more
	}

	// Compile and return regex (case-insensitive, no word boundaries)
	return regexp.MustCompile("(?i)" + pattern.String())
}

// DetectProfanity detects profanity in the given text
func DetectProfanity(text string) ProfanityResult {
	result := ProfanityResult{
		IsProfane: false,
		Severity:  "",
		Matches:   []ProfanityMatch{},
	}

	// Normalize the input
	normalized := normalizeForProfanity(text)

	// Check against all patterns
	maxSeverity := ""
	for id, pattern := range profanityPatterns {
		matches := pattern.FindAllStringIndex(normalized, -1)
		if len(matches) > 0 {
			result.IsProfane = true

			// Find the word config to get severity
			for _, word := range profanityConfig.Words {
				if word.ID == id {
					// Track highest severity (high > medium > low)
					if maxSeverity == "" {
						maxSeverity = word.Severity
					} else if word.Severity == "high" {
						maxSeverity = "high"
					} else if word.Severity == "medium" && maxSeverity != "high" {
						maxSeverity = "medium"
					}

					// Add all matches
					for _, match := range matches {
						result.Matches = append(result.Matches, ProfanityMatch{
							RuleID: id,
							Start:  match[0],
							End:    match[1],
						})
					}
					break
				}
			}
		}
	}

	result.Severity = maxSeverity
	return result
}

// IsAbusive checks if text contains abusive content (backward compatibility)
func IsAbusive(text string) bool {
	result := DetectProfanity(text)
	return result.IsProfane
}
