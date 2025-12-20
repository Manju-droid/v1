/**
 * Client-side abuse detection (basic check)
 * Full detection happens on backend, this is just for user feedback
 */

const badWords = [
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'cunt',
  'madarchod', 'behenchod', 'chutiya', 'lund', 'gaand', 'randi',
  'punda', 'mairu', 'thayoli', 'lanja', 'pukka',
];

export function checkAbusiveContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for bad words
  for (const word of badWords) {
    if (lowerText.includes(word)) {
      return true;
    }
  }
  
  // Check for spaced variations
  const spacedPatterns = [
    /madar\s+chod/i,
    /behen\s+chod/i,
    /fuck\s+(you|u|off)/i,
  ];
  
  for (const pattern of spacedPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
}

