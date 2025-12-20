#!/bin/bash
# Create placeholder assets using ImageMagick or fallback

# Try ImageMagick first
if command -v convert &> /dev/null; then
  convert -size 1024x1024 xc:'#0C1117' splash.png
  convert -size 1024x1024 xc:'#0C1117' adaptive-icon.png
  convert -size 32x32 xc:'#0C1117' favicon.png
  echo "Created assets using ImageMagick"
  exit 0
fi

# Try sips (macOS)
if command -v sips &> /dev/null; then
  # Create a 1x1 pixel and resize
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > temp.png
  sips -z 1024 1024 temp.png --out splash.png 2>/dev/null
  sips -z 1024 1024 temp.png --out adaptive-icon.png 2>/dev/null
  sips -z 32 32 temp.png --out favicon.png 2>/dev/null
  rm -f temp.png
  echo "Created assets using sips"
  exit 0
fi

# Fallback: create minimal PNG files
echo "Creating minimal placeholder files..."
touch splash.png adaptive-icon.png favicon.png
echo "Created placeholder files (may need manual replacement)"
