# Phase 12: E2E Testing Setup

## Playwright Configuration

### Installation
```bash
cd frontend
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

### Configuration
- Config file: `frontend/playwright.config.ts`
- Test directory: `frontend/e2e/`
- Base URL: `http://localhost:3000` (configurable via `PLAYWRIGHT_TEST_BASE_URL`)

### Test Files Created
1. `e2e/auth.spec.ts` - Authentication flow tests
2. `e2e/feed.spec.ts` - Feed/Posts flow tests
3. `e2e/debates.spec.ts` - Debates flow tests
4. `e2e/example.spec.ts` - Basic example test

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## Test Coverage

### Authentication Tests
- Landing page display
- Login page navigation
- Signup page navigation
- Form validation
- Error handling

### Feed Tests
- Feed page loading
- Posts display
- Post interactions

### Debates Tests
- Debates page loading
- Debates list display
- Filtering by status
- Debate detail navigation
- Debate creation flow

## Next Steps

1. Add authenticated test scenarios
2. Add post creation tests
3. Add debate joining tests
4. Add messaging tests
5. Add profile tests
6. Set up test data fixtures
7. Add visual regression tests

## Notes

- Tests are designed to work with or without authentication
- Some tests check for conditional elements (e.g., if user is authenticated)
- Tests use `waitForLoadState('networkidle')` to ensure content is loaded
- Web server auto-starts before tests (configured in playwright.config.ts)
