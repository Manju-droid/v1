package service

import (
	"regexp"
	"strings"
	"unicode"
)

// Bad words list - English + Indian languages typed in English
var badWords = []string{
	// English profanity
	"fuck", "shit", "damn", "bitch", "asshole", "bastard", "cunt", "piss",
	"dick", "cock", "pussy", "whore", "slut", "faggot", "nigger", "retard",
	
	// Hindi/Urdu typed in English
	"madarchod", "behenchod", "bhenchod", "chutiya", "chut", "lund", "gaand",
	"randi", "harami", "kutta", "kutti", "saala", "saali", "bhosdike", "bhosdi",
	"choot", "chootiya", "maderchod", "behenchod", "lund", "gaandu",
	
	// Tamil typed in English
	"punda", "pundai", "punda", "mairu", "thayoli", "thayoli", "kuthi",
	"kuthi", "pombala", "pombala", "sombu", "sombu",
	
	// Telugu typed in English
	"lanja", "lanja", "pukka", "pukka", "gudda", "gudda", "pooka",
	
	// Malayalam typed in English
	"mone", "punda", "punda", "kuthi", "kuthi", "pombala",
	
	// Kannada typed in English
	"henge", "henge", "punda", "punda", "kuthi",
}

// Spaced variations patterns (regex)
var spacedPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\b(madar|mader|madar|mother)\s+(chod|chud|choot)\b`),
	regexp.MustCompile(`(?i)\b(behen|bhen|sister)\s+(chod|chud|choot)\b`),
	regexp.MustCompile(`(?i)\b(fuck|fuk|fuc)\s+(you|u|off)\b`),
	regexp.MustCompile(`(?i)\b(go|get)\s+(to|2)\s+(hell|heck)\b`),
}

// Levenshtein distance for fuzzy matching
func levenshteinDistance(s1, s2 string) int {
	r1, r2 := []rune(s1), []rune(s2)
	column := make([]int, len(r1)+1)

	for y := 1; y <= len(r1); y++ {
		column[y] = y
	}

	for x := 1; x <= len(r2); x++ {
		column[0] = x
		lastDiag := x - 1
		for y := 1; y <= len(r1); y++ {
			oldDiag := column[y]
			cost := 0
			if r1[y-1] != r2[x-1] {
				cost = 1
			}
			column[y] = min(column[y]+1, column[y-1]+1, lastDiag+cost)
			lastDiag = oldDiag
		}
	}
	return column[len(r1)]
}

func min(a, b, c int) int {
	if a < b && a < c {
		return a
	}
	if b < c {
		return b
	}
	return c
}

// Calculate similarity percentage (0-100)
func similarity(s1, s2 string) float64 {
	if len(s1) == 0 && len(s2) == 0 {
		return 100.0
	}
	if len(s1) == 0 || len(s2) == 0 {
		return 0.0
	}
	
	maxLen := len(s1)
	if len(s2) > maxLen {
		maxLen = len(s2)
	}
	
	if maxLen == 0 {
		return 100.0
	}
	
	distance := levenshteinDistance(s1, s2)
	similarity := 100.0 * (1.0 - float64(distance)/float64(maxLen))
	return similarity
}

// Normalize text for matching (remove special chars, spaces)
func normalizeText(text string) string {
	var result strings.Builder
	for _, r := range text {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			result.WriteRune(unicode.ToLower(r))
		}
	}
	return result.String()
}

// Check if text contains abusive content
func IsAbusive(text string) bool {
	// Convert to lowercase
	lowerText := strings.ToLower(text)
	
	// Check regex patterns for spaced variations
	for _, pattern := range spacedPatterns {
		if pattern.MatchString(lowerText) {
			return true
		}
	}
	
	// Split text into words
	words := strings.Fields(lowerText)
	
	// Check each word against bad words list
	for _, word := range words {
		// Remove punctuation
		word = strings.Trim(word, ".,!?;:()[]{}\"'")
		
		// Direct match
		for _, badWord := range badWords {
			if word == badWord {
				return true
			}
		}
		
		// Fuzzy matching (80% similarity threshold)
		normalizedWord := normalizeText(word)
		for _, badWord := range badWords {
			normalizedBadWord := normalizeText(badWord)
			if similarity(normalizedWord, normalizedBadWord) >= 80.0 {
				return true
			}
		}
	}
	
	// Check for word combinations (e.g., "madar chod" without space)
	normalizedText := normalizeText(text)
	for _, badWord := range badWords {
		normalizedBadWord := normalizeText(badWord)
		if strings.Contains(normalizedText, normalizedBadWord) {
			return true
		}
	}
	
	return false
}

