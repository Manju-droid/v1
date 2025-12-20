import React from 'react';

/**
 * Parses text and highlights hashtags (#hashtag) in green (or red for shout posts)
 * @param text - The text content to parse
 * @param isShout - Whether this is a shout post (hashtags will be red)
 * @returns JSX element with hashtags highlighted in green or red
 */
export function renderTextWithHashtags(text: string, isShout: boolean = false): React.ReactNode {
  if (!text || typeof text !== 'string') {
    return <>{text}</>;
  }

  // Check if text contains #shout (if isShout not explicitly provided)
  // Check for #shout as a complete hashtag (followed by space, newline, or end of string)
  const textLower = text.toLowerCase();
  const hasShout = isShout || 
    /#shout(\s|$|\n)/.test(textLower) || 
    textLower.endsWith('#shout') ||
    textLower.includes('#shout ');
  
  // Regex to match hashtags: # followed by word characters (letters, numbers, underscore, hyphen)
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let matchCount = 0;
  
  // Reset regex lastIndex to avoid issues with global regex
  hashtagRegex.lastIndex = 0;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    // Add text before the hashtag
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        parts.push(beforeText);
      }
    }
    
    // Get the hashtag text (without #)
    const hashtagText = match[1].toLowerCase();
    
    // If post contains #shout, make ALL hashtags red; otherwise green
    const hashtagColor = hasShout ? '#ef4444' : '#4ade80';
    
    // Add the hashtag with appropriate styling
    parts.push(
      <span 
        key={`hashtag-${matchCount++}`} 
        className="hashtag"
        style={{ 
          color: hashtagColor,
        }}
      >
        #{match[1]}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last hashtag
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(remainingText);
    }
  }
  
  // If no hashtags found, return the original text as a fragment
  if (parts.length === 0 || matchCount === 0) {
    return <>{text}</>;
  }
  
  // Return parts as a fragment (no wrapper needed since parent already has styling)
  return <>{parts}</>;
}

