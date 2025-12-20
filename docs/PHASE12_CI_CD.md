# Phase 12: CI/CD Test Integration

## GitHub Actions Workflow

### Workflow File
- Location: `.github/workflows/tests.yml`
- Triggers: Push to main/develop, Pull requests

### Jobs Configured

#### 1. Unit Tests
- Runs unit tests for shared package
- Runs integration tests for API client
- Generates coverage reports
- Uploads coverage to Codecov

#### 2. E2E Tests
- Installs Playwright
- Builds application
- Starts backend and frontend servers
- Runs E2E tests
- Uploads test results

#### 3. Security Audit
- Runs npm audit
- Checks for vulnerabilities
- Uploads audit results

#### 4. Lint
- Runs ESLint
- Checks code quality

## Local Test Scripts

### Run All Tests
```bash
bash scripts/run-all-tests.sh
```

### Performance Testing
```bash
bash scripts/performance-test.sh [BASE_URL]
# Example: bash scripts/performance-test.sh http://localhost:3000
```

### Security Audit
```bash
bash scripts/security-audit.sh
```

### Accessibility Testing
```bash
bash scripts/accessibility-test.sh [BASE_URL]
# Example: bash scripts/accessibility-test.sh http://localhost:3000
```

## CI/CD Best Practices

### Test Execution
- Tests run on every push and PR
- Failures block merges
- Coverage reports generated
- Test results archived

### Performance
- Lighthouse audits (can be added)
- Load testing (can be added)
- Performance budgets (can be added)

### Security
- Automated vulnerability scanning
- Dependency updates
- Security alerts

## Setup Instructions

### GitHub Actions
1. Push `.github/workflows/tests.yml` to repository
2. GitHub Actions will automatically run on push/PR
3. View results in Actions tab

### Local Setup
1. Make scripts executable:
   ```bash
   chmod +x scripts/*.sh
   ```

2. Install required tools:
   ```bash
   # Lighthouse
   npm install -g lighthouse
   
   # Pa11y
   npm install -g pa11y
   
   # k6 (load testing)
   brew install k6  # macOS
   ```

3. Run tests:
   ```bash
   bash scripts/run-all-tests.sh
   ```

## Test Reports

### Generated Reports
- `test-results/` - Test execution reports
- `performance-reports/` - Lighthouse reports
- `security-reports/` - Security audit reports
- `accessibility-reports/` - Pa11y reports

### Viewing Reports
```bash
# Test results
cat test-results/test-report-*.txt

# Performance (HTML)
open performance-reports/*.html

# Accessibility (HTML)
open accessibility-reports/*.html
```

## Notes

- CI/CD workflow is ready to use
- Local test scripts are executable
- Reports are generated automatically
- Can be extended with more test types
