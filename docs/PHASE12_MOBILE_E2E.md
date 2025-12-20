# Phase 12: Mobile E2E Testing Setup

## Status: ✅ COMPLETE

Mobile E2E testing infrastructure is set up using Detox.

## What Was Set Up

### 1. Detox Configuration ✅
- `.detoxrc.js` - Detox configuration file
- Configured for iOS and Android
- Debug builds for both platforms

### 2. Test Infrastructure ✅
- `e2e/jest.config.js` - Jest configuration for Detox
- Test file structure created
- Example tests provided

### 3. Test Files Created ✅
- `e2e/firstTest.e2e.ts` - Basic example test
- `e2e/auth.e2e.ts` - Authentication flow tests
- `e2e/navigation.e2e.ts` - Navigation flow tests

### 4. Package.json Scripts ✅
- `test:e2e` - Run all E2E tests
- `test:e2e:ios` - Run iOS tests
- `test:e2e:android` - Run Android tests
- `test:e2e:build:ios` - Build iOS app for testing
- `test:e2e:build:android` - Build Android app for testing

### 5. Test IDs Added ✅
- Added `testID` props to login screen components
- Added `testID` props to home screen navigation elements
- Ready for test automation

## Dependencies Added

```json
{
  "detox": "^20.14.0",
  "jest": "^29.7.0",
  "jest-circus": "^29.7.0"
}
```

## Setup Instructions

### Prerequisites

1. **Development Build Required**
   - Detox requires native builds (not Expo Go)
   - Since LiveKit also requires native builds, this is already set up

2. **Install Dependencies**
   ```bash
   cd packages/mobile
   npm install
   ```

3. **Install Detox CLI** (optional, for global commands)
   ```bash
   npm install -g detox-cli
   ```

### Building for Testing

#### iOS
```bash
cd packages/mobile
npm run test:e2e:build:ios
```

#### Android
```bash
cd packages/mobile
npm run test:e2e:build:android
```

### Running Tests

#### iOS
```bash
npm run test:e2e:ios
```

#### Android
```bash
npm run test:e2e:android
```

#### Both
```bash
npm run test:e2e
```

## Test Structure

### Example Test
```typescript
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display login screen', async () => {
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });
});
```

## Test IDs Added

### Login Screen (`app/login.tsx`)
- `email-input` - Email TextInput
- `password-input` - Password TextInput
- `login-button` - Login button
- `signup-link` - Sign up link

### Home Screen (`app/index.tsx`)
- `login-link` - Login navigation link
- `signup-link` - Signup navigation link

## Configuration Files

### `.detoxrc.js`
- iOS simulator configuration (iPhone 15 Pro)
- Android emulator configuration (Pixel_5_API_33)
- Build commands for both platforms
- App binary paths

### `e2e/jest.config.js`
- Jest configuration for Detox
- Test timeout: 120 seconds
- Test match pattern: `**/*.e2e.ts`
- Detox test environment

## Next Steps

### Expand Test Coverage

1. **Authentication Tests**
   - Login with valid credentials
   - Login with invalid credentials
   - Signup flow
   - Logout flow

2. **Feature Tests**
   - Posts creation and viewing
   - Debates joining and participation
   - Messages sending and receiving
   - Profile viewing and editing

3. **Navigation Tests**
   - Tab navigation
   - Deep linking
   - Back navigation

4. **Audio Tests** (Advanced)
   - LiveKit connection
   - Audio streaming
   - Debate room participation

### CI/CD Integration

Add mobile E2E tests to CI/CD pipeline:
1. Build app in CI environment
2. Start simulator/emulator
3. Run tests
4. Collect and report results

## Troubleshooting

### Build Issues
- Ensure `npx expo prebuild` has been run
- Check Xcode/Android Studio configuration
- Verify simulator/emulator is available

### Test Execution Issues
- Ensure app is built before running tests
- Check that simulator/emulator is running
- Verify test IDs are correctly added to components

### Element Not Found
- Verify `testID` prop is added to component
- Check element is actually rendered (not conditionally hidden)
- Use `waitFor()` for async elements

## Documentation

- `packages/mobile/e2e/README.md` - Detailed testing guide
- This document - Setup summary

## Status

✅ **Mobile E2E testing infrastructure is complete and ready to use!**

All necessary files, configurations, and test IDs are in place. Tests can be run once the app is built for the target platform.
