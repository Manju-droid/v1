#!/bin/bash

# Performance Testing Script
# Runs Lighthouse audits on key pages

set -e

BASE_URL="${1:-http://localhost:3000}"
OUTPUT_DIR="./performance-reports"

echo "🚀 Starting Performance Tests..."
echo "Base URL: $BASE_URL"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if Lighthouse is installed
if ! command -v lighthouse &> /dev/null; then
    echo "📦 Installing Lighthouse..."
    npm install -g lighthouse
fi

# Pages to test
PAGES=(
    "/"
    "/feed"
    "/debates"
    "/login"
)

echo "📊 Running Lighthouse audits..."
for page in "${PAGES[@]}"; do
    echo "Testing: $page"
    lighthouse "$BASE_URL$page" \
        --output=html,json \
        --output-path="$OUTPUT_DIR/$(echo $page | tr '/' '_' | sed 's/^_//')" \
        --only-categories=performance \
        --chrome-flags="--headless" \
        --quiet || true
done

echo ""
echo "✅ Performance tests complete!"
echo "📁 Reports saved to: $OUTPUT_DIR"
echo ""
echo "View reports:"
echo "  open $OUTPUT_DIR/index.html"
