import { test, expect } from '@playwright/test';

test.describe('DisclaimerModal', () => {
  test('shows on first visit and dismisses on close', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');

    const overlay = page.locator('.disclaimer-overlay');
    await expect(overlay).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.disclaimer-title')).toContainText('IMPORTANT');

    await page.locator('.disclaimer-close').click();
    await expect(overlay).toBeHidden();
  });

  test('does not reappear after first dismissal', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('disclaimer_seen', 'true'));
    await page.goto('/');
    await expect(page.locator('.disclaimer-overlay')).toHaveCount(0);
  });
});
