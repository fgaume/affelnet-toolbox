import { test, expect } from './fixtures';
import { setupApiMocks } from './mocks';

test.describe("Graphiques de tendance des seuils", () => {
  test("desktop : dépliés par défaut", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupApiMocks(page);
    await page.goto('/seuils');

    await expect(page.locator('.admission-history-table').first()).toBeVisible({ timeout: 15000 });
    // ARAGO + VOLTAIRE ont des tendances valides -> 2 sparklines ouvertes d'emblée.
    await expect(page.locator('.sparkline-container')).toHaveCount(2);
  });

  test("mobile : repliés par défaut", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupApiMocks(page);
    await page.goto('/seuils');

    await expect(page.locator('.admission-history-table').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.sparkline-container')).toHaveCount(0);
  });
});
