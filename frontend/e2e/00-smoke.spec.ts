import { test, expect } from '@playwright/test';

test.describe('Smoke test', () => {
  test('frontend is reachable and shows login page', async ({ page }) => {
    await page.goto('/login');
    // Should show login form with username, password and submit button
    await expect(page.locator('#username')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    // Should show the brand
    await expect(page.getByText('GJ Logística')).toBeVisible();
  });
});
