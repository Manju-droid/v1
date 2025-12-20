#!/bin/bash

# Accessibility Testing Script
# Runs Pa11y accessibility audits on key pages

set -e

BASE_URL="${1:-http://localhost:3000}"
OUTPUT_DIR="./accessibility-reports"

echo "♿ Starting Accessibility Tests..."
echo "Base URL: $BASE_URL"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if Pa11y is installed
if ! command -v pa11y &> /dev/null; then
    echo "📦 Installing Pa11y..."
    npm install -g pa11y
fi

# Pages to test
PAGES=(
    "/"
    "/feed"
    "/debates"
    "/login"
    "/signup"
)

echo "🔍 Running Pa11y audits..."
for page in "${PAGES[@]}"; do
    echo "Testing: $page"
    page_name=$(echo $page | tr '/' '_' | sed 's/^_//' | sed 's/_$//')
    if [ -z "$page_name" ]; then
        page_name="home"
    fi
    
    pa11y "$BASE_URL$page" \
        --reporter json \
        --reporter cli \
        > "$OUTPUT_DIR/${page_name}.json" 2>&1 || true
    
    # Also generate HTML report
    pa11y "$BASE_URL$page" \
        --reporter html \
        > "$OUTPUT_DIR/${page_name}.html" 2>&1 || true
done

echo ""
echo "✅ Accessibility tests complete!"
echo "📁 Reports saved to: $OUTPUT_DIR"
echo ""
echo "View HTML reports:"
echo "  open $OUTPUT_DIR/*.html"
