# Phase 12: Testing Guide

## Quick Start

### Running Tests

```bash
# Run all tests in shared package
npm run test:shared

# Run tests with coverage
npm run test:shared:coverage

# Run tests in watch mode (for development)
npm run test:shared:watch

# Or from package directory
cd packages/shared && npm test
```

## Test Structure

```
packages/shared/
├── __tests__/
│   ├── utils.test.ts          # Utility function tests
│   ├── user.service.test.ts   # User service tests
│   └── ...                    # More test files
├── src/                       # Source code
└── vitest.config.ts          # Test configuration
```

## Test Coverage

### Current Coverage
- ✅ Utility functions: 100% coverage
- ✅ User service: 100% coverage
- ⏳ Other services: Pending

### Coverage Goals
- **Shared Package**: 80%+ (Target)
- **API Client**: 70%+ (Target)

## Writing Tests

### Example Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/utils';

describe('myFunction', () => {
  it('should handle normal case', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('');
  });

  it('should handle errors', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Test Best Practices

1. **Test one thing at a time** - Each test should verify one behavior
2. **Use descriptive names** - Test names should clearly describe what they test
3. **Arrange-Act-Assert** - Structure tests clearly
4. **Test edge cases** - Include boundary conditions and error cases
5. **Keep tests independent** - Tests should not depend on each other

## Test Types

### Unit Tests
- Test individual functions in isolation
- Fast execution
- High coverage target

### Integration Tests
- Test interactions between components
- Use mocks for external dependencies
- Test API client with MSW

### E2E Tests
- Test complete user flows
- Use Playwright (web) or Detox (mobile)
- Focus on critical paths

## CI/CD Integration

Tests should run automatically on:
- Pull requests
- Commits to main branch
- Before deployments

## Troubleshooting

### Tests not running
- Check that Vitest is installed: `npm list vitest`
- Verify test files are in `__tests__/` directory
- Check `vitest.config.ts` configuration

### Coverage not showing
- Install coverage provider: `@vitest/coverage-v8`
- Run with coverage flag: `npm run test:coverage`

### Type errors in tests
- Ensure `tsconfig.json` includes test files
- Check that types are properly imported

## Next Steps

1. Add more unit tests for remaining services
2. Set up integration tests for API client
3. Set up E2E tests for web and mobile
4. Add performance tests
5. Set up CI/CD pipeline
