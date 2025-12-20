# Mobile E2E Tests with Detox

This directory contains end-to-end tests for the mobile app using Detox.

## Prerequisites

1. **Development Build Required**: Detox requires a native build. Since the app uses LiveKit (which also requires native builds), you'll need to create a development build first.

2. **Install Dependencies**:
   ```bash
   cd packages/mobile
   npm install
   ```

3. **Install Detox CLI** (globally):
   ```bash
   npm install -g detox-cli
   ```

4. **iOS Setup**:
   - Xcode installed
   - iOS Simulator available
   - Run: `npm run test:e2e:build:ios` to build the app

5. **Android Setup**:
   - Android Studio installed
   - Android Emulator configured
   - Run: `npm run test:e2e:build:android` to build the app

## Running Tests

### iOS
```bash
# Build first
npm run test:e2e:build:ios

# Run tests
npm run test:e2e:ios
```

### Android
```bash
# Build first
npm run test:e2e:build:android

# Run tests
npm run test:e2e:android
```

### Both Platforms
```bash
npm run test:e2e
```

## Test Files

- `firstTest.e2e.ts` - Basic example test
- `auth.e2e.ts` - Authentication flow tests
- `navigation.e2e.ts` - Navigation flow tests

## Writing Tests

### Basic Structure
```typescript
describe('Feature Name', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should do something', async () => {
    await expect(element(by.id('element-id'))).toBeVisible();
    await element(by.id('button-id')).tap();
  });
});
```

### Finding Elements

Use `testID` prop in React Native components:
```typescript
<TouchableOpacity testID="my-button">
  <Text>Click Me</Text>
</TouchableOpacity>
```

Then in tests:
```typescript
await element(by.id('my-button')).tap();
```

### Common Matchers

- `by.id('testID')` - Find by testID
- `by.text('Text')` - Find by text content
- `by.label('Label')` - Find by accessibility label
- `by.type('TouchableOpacity')` - Find by component type

### Common Actions

- `tap()` - Tap an element
- `typeText('text')` - Type text into input
- `scroll()` - Scroll a scrollable view
- `swipe()` - Swipe gesture

### Common Assertions

- `toBeVisible()` - Element is visible
- `toExist()` - Element exists
- `toHaveText('text')` - Element has text
- `toHaveValue('value')` - Input has value

## Configuration

Detox configuration is in `.detoxrc.js` at the root of the mobile package.

## Troubleshooting

### Build Fails
- Ensure you've run `npx expo prebuild` first
- Check that Xcode/Android Studio is properly configured
- Verify simulator/emulator is running

### Tests Can't Find Elements
- Ensure `testID` props are added to components
- Check that elements are actually rendered (not conditionally hidden)
- Use `await waitFor()` for elements that appear after async operations

### App Crashes During Tests
- Check device logs: `detox logs`
- Ensure backend API is running if tests require it
- Verify environment variables are set correctly

## CI/CD Integration

For CI/CD, you'll need to:
1. Build the app in CI environment
2. Start simulator/emulator
3. Run tests
4. Collect results

See `.github/workflows/tests.yml` for example CI configuration.
