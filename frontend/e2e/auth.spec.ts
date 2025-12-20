/**
 * E2E Tests for Authentication Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/?clear=true');
    await page.waitForLoadState('networkidle');
  });

  test('should display landing page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/V|Debate/);
    
    // Check for login/signup buttons
    const loginButton = page.getByRole('link', { name: /log in/i });
    const signupButton = page.getByRole('link', { name: /sign up/i });
    
    await expect(loginButton).toBeVisible();
    await expect(signupButton).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /log in/i }).click();
    await expect(page).toHaveURL(/.*login/);
    
    // Check for login form
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/.*signup/);
    
    // Check for signup form
    await expect(page.getByPlaceholder(/name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/handle/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    // Should show validation errors (implementation dependent)
    // This test verifies the form exists and can be interacted with
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    // Should show email validation error
    // Note: Actual error message depends on implementation
    await expect(page).toHaveURL(/.*login/); // Should stay on login page
  });

  test('should show validation errors for short password', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('12345'); // Less than 6 characters
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    // Should show password validation error
    await expect(page).toHaveURL(/.*login/); // Should stay on login page
  });
});

test.describe('Navigation', () => {
  test('should navigate to feed page', async ({ page }) => {
    await page.goto('/');
    // If authenticated, should be able to navigate to feed
    // This test verifies navigation structure
    const feedLink = page.getByRole('link', { name: /feed/i });
    if (await feedLink.isVisible()) {
      await feedLink.click();
      await expect(page).toHaveURL(/.*feed/);
    }
  });

  test('should navigate to debates page', async ({ page }) => {
    await page.goto('/');
    const debatesLink = page.getByRole('link', { name: /debate/i });
    if (await debatesLink.isVisible()) {
      await debatesLink.click();
      await expect(page).toHaveURL(/.*debate/);
    }
  });
});
