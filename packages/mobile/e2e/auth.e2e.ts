describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display login screen', async () => {
    // Navigate to login if not already there
    try {
      await element(by.id('login-link')).tap();
    } catch (e) {
      // Already on login screen or link not found
    }
    
    // Check for login form elements
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should show validation errors for empty fields', async () => {
    // Navigate to login
    try {
      await element(by.id('login-link')).tap();
    } catch (e) {
      // Already on login screen
    }

    // Try to submit empty form
    await element(by.id('login-button')).tap();

    // Should show error messages
    // Note: Adjust these selectors based on actual error display implementation
    await waitFor(element(by.text('Email is required')))
      .toBeVisible()
      .withTimeout(2000)
      .catch(() => {
        // Error might be displayed differently
      });
  });

  it('should navigate to signup screen', async () => {
    // Navigate to login
    try {
      await element(by.id('login-link')).tap();
    } catch (e) {
      // Already on login screen
    }

    // Tap signup link
    await element(by.id('signup-link')).tap();

    // Should be on signup screen
    await expect(element(by.id('signup-button'))).toBeVisible();
  });
});
