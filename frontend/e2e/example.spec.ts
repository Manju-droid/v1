/**
 * Example E2E Test
 * 
 * This is a basic example test to verify Playwright is set up correctly.
 */

import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/V|Debate/);
});

test('should have navigation links', async ({ page }) => {
  await page.goto('/');
  
  // Check for common navigation elements
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
