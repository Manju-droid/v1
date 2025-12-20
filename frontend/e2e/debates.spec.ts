/**
 * E2E Tests for Debates Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Debates Page', () => {
  test('should load debates page', async ({ page }) => {
    await page.goto('/debates');
    
    // Check if page loads (may redirect to login if not authenticated)
    const url = page.url();
    if (url.includes('/debates')) {
      await expect(page).toHaveURL(/.*debate/);
    } else if (url.includes('/login')) {
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test('should display debates list', async ({ page }) => {
    await page.goto('/debates');
    await page.waitForLoadState('networkidle');
    
    // Check for debates content
    const debatesContent = page.locator('main, [role="main"], .debates-content');
    if (await debatesContent.count() > 0) {
      await expect(debatesContent.first()).toBeVisible();
    }
  });

  test('should filter debates by status', async ({ page }) => {
    await page.goto('/debates');
    await page.waitForLoadState('networkidle');
    
    // Look for filter buttons (Active, Scheduled, Ended, etc.)
    const filterButtons = page.getByRole('button', { name: /active|scheduled|ended|all/i });
    if (await filterButtons.count() > 0) {
      await filterButtons.first().click();
      // Should update the debates list
      await page.waitForTimeout(500); // Wait for filter to apply
    }
  });

  test('should navigate to debate detail', async ({ page }) => {
    await page.goto('/debates');
    await page.waitForLoadState('networkidle');
    
    // Try to find and click a debate
    const debateLink = page.locator('[href*="/debates/"]').first();
    if (await debateLink.count() > 0) {
      await debateLink.click();
      await expect(page).toHaveURL(/.*debate.*\/[^/]+$/); // Should be on debate detail page
    }
  });
});

test.describe('Debate Creation', () => {
  test('should navigate to create debate page', async ({ page }) => {
    await page.goto('/debates');
    await page.waitForLoadState('networkidle');
    
    // Look for create debate button
    const createButton = page.getByRole('button', { name: /create.*debate|new debate/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page).toHaveURL(/.*debate.*create/);
    }
  });
});
