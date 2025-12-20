#!/bin/bash

# Run All Tests Script
# Executes all test suites and generates comprehensive report

set -e

OUTPUT_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$OUTPUT_DIR/test-report-$TIMESTAMP.txt"

echo "🧪 Running All Tests..."
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to run tests and capture output
run_test_suite() {
    local name=$1
    local command=$2
    
    echo "========================================" >> "$REPORT_FILE"
    echo "$name" >> "$REPORT_FILE"
    echo "========================================" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "Running: $name..."
    
    if eval "$command" >> "$REPORT_FILE" 2>&1; then
        echo "✅ $name: PASSED" | tee -a "$REPORT_FILE"
    else
        echo "❌ $name: FAILED" | tee -a "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

# Clear previous report
> "$REPORT_FILE"

echo "Test Report - $(date)" >> "$REPORT_FILE"
echo "================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Run test suites
echo "1. Running unit tests (shared package)..."
run_test_suite "Unit Tests - Shared Package" "npm run test:shared"

echo "2. Running integration tests (API client)..."
run_test_suite "Integration Tests - API Client" "npm run test:api-client"

echo "3. Running security audit..."
run_test_suite "Security Audit" "bash scripts/security-audit.sh"

echo ""
echo "✅ All tests complete!"
echo "📁 Report saved to: $REPORT_FILE"
echo ""
echo "Summary:"
grep -E "✅|❌" "$REPORT_FILE" || echo "No test results found"
echo ""
echo "View full report:"
echo "  cat $REPORT_FILE"
