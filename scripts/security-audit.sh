#!/bin/bash

# Security Audit Script
# Runs npm audit on all packages and generates report

set -e

OUTPUT_DIR="./security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$OUTPUT_DIR/audit-report-$TIMESTAMP.txt"

echo "🔒 Starting Security Audit..."
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to run audit on a directory
run_audit() {
    local dir=$1
    local name=$2
    
    echo "📦 Auditing $name..."
    echo "========================================" >> "$REPORT_FILE"
    echo "$name - $dir" >> "$REPORT_FILE"
    echo "========================================" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if [ -f "$dir/package.json" ]; then
        cd "$dir"
        npm audit >> "$REPORT_FILE" 2>&1 || echo "Audit completed with issues" >> "$REPORT_FILE"
        cd - > /dev/null
    else
        echo "No package.json found" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

# Clear previous report
> "$REPORT_FILE"

echo "Running audits on all packages..."
echo ""

# Root
run_audit "." "Root"

# Frontend
if [ -d "frontend" ]; then
    run_audit "frontend" "Frontend"
fi

# Packages
for pkg in packages/*; do
    if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then
        pkg_name=$(basename "$pkg")
        run_audit "$pkg" "Package: $pkg_name"
    fi
done

# Mobile
if [ -d "packages/mobile" ]; then
    run_audit "packages/mobile" "Mobile"
fi

echo ""
echo "✅ Security audit complete!"
echo "📁 Report saved to: $REPORT_FILE"
echo ""
echo "Summary:"
grep -i "vulnerabilities" "$REPORT_FILE" | head -5 || echo "No vulnerabilities summary found"
echo ""
echo "View full report:"
echo "  cat $REPORT_FILE"
