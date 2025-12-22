package service

import (
	"testing"
)

// Test normalization function
func TestNormalizeForProfanity(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Leetspeak conversion",
			input:    "3rr1puk",
			expected: "erripuk",
		},
		{
			name:     "Repeated letters collapse",
			input:    "aaaabbbbcccc",
			expected: "aabbcc",
		},
		{
			name:     "Symbol removal",
			input:    "p@u#k$a",
			expected: "puka",
		},
		{
			name:     "Mixed case",
			input:    "ErRiPuKa",
			expected: "erripuka",
		},
		{
			name:     "Complex obfuscation",
			input:    "k0d4kaaaa",
			expected: "kodakaa",
		},
		{
			name:     "Clean text",
			input:    "hello world",
			expected: "helloworld",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizeForProfanity(tt.input)
			if result != tt.expected {
				t.Errorf("normalizeForProfanity(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

// Test profanity detection
func TestDetectProfanity(t *testing.T) {
	tests := []struct {
		name             string
		input            string
		shouldDetect     bool
		expectedSeverity string
	}{
		{
			name:             "Continuous string - embedded word",
			input:            "heyerripukahey",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Repeated letters",
			input:            "erriiipukaaa",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Leetspeak obfuscation",
			input:            "3rr1puk4",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Mixed case",
			input:            "ErRiPuKa",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Embedded with symbols",
			input:            "hey k0d4kaaaa there",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Multiple repeated letters",
			input:            "laaaaanjaaa",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Clean text",
			input:            "hello world",
			shouldDetect:     false,
			expectedSeverity: "",
		},
		{
			name:             "Normal Telugu text",
			input:            "nenu meeru",
			shouldDetect:     false,
			expectedSeverity: "",
		},
		{
			name:             "Complex word - boothi",
			input:            "b00thi!!!",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Compound word",
			input:            "lanjakodaka",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Word with extra chars",
			input:            "dengguuuuu",
			shouldDetect:     true,
			expectedSeverity: "high",
		},
		{
			name:             "Medium severity word",
			input:            "munda",
			shouldDetect:     true,
			expectedSeverity: "medium",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DetectProfanity(tt.input)

			if result.IsProfane != tt.shouldDetect {
				t.Errorf("DetectProfanity(%q).IsProfane = %v, want %v",
					tt.input, result.IsProfane, tt.shouldDetect)
			}

			if result.Severity != tt.expectedSeverity {
				t.Errorf("DetectProfanity(%q).Severity = %q, want %q",
					tt.input, result.Severity, tt.expectedSeverity)
			}
		})
	}
}

// Test IsAbusive backward compatibility
func TestIsAbusive(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "Telugu profanity",
			input:    "erripuka",
			expected: true,
		},
		{
			name:     "Obfuscated profanity",
			input:    "k0d4k4",
			expected: true,
		},
		{
			name:     "Clean text",
			input:    "hello world",
			expected: false,
		},
		{
			name:     "Embedded profanity",
			input:    "heydenguheybro",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsAbusive(tt.input)
			if result != tt.expected {
				t.Errorf("IsAbusive(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

// Test edge cases
func TestProfanityEdgeCases(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		shouldDetect bool
	}{
		{
			name:         "Empty string",
			input:        "",
			shouldDetect: false,
		},
		{
			name:         "Only symbols",
			input:        "@#$%^&*()",
			shouldDetect: false,
		},
		{
			name:         "Only numbers",
			input:        "1234567890",
			shouldDetect: false,
		},
		{
			name:         "Single letter",
			input:        "a",
			shouldDetect: false,
		},
		{
			name:         "Very long repeated letters",
			input:        "puuuuuuuuuuuuuuuuuuukkkkkkkkkkkkaaaaaaaaaa",
			shouldDetect: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DetectProfanity(tt.input)
			if result.IsProfane != tt.shouldDetect {
				t.Errorf("DetectProfanity(%q).IsProfane = %v, want %v",
					tt.input, result.IsProfane, tt.shouldDetect)
			}
		})
	}
}
