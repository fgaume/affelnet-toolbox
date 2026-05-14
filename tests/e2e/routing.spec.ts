import { test, expect } from './fixtures';
import { setupApiMocks } from './mocks';

test.describe('URL Routing', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('Redirect / to /lycees', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/lycees$/);
    const activeTab = page.locator('.input-tab.active').filter({ visible: true });
    await expect(activeTab).toContainText('Lycées de secteur');
  });

  test('Tab click updates URL', async ({ page }) => {
    await page.goto('/lycees');
    await page.click('button:has-text("Simuler")');
    await expect(page).toHaveURL(/\/simuler$/);
    const activeTab = page.locator('.input-tab.active').filter({ visible: true });
    await expect(activeTab).toContainText('Simuler');
  });

  test('Direct URL navigation', async ({ page }) => {
    await page.goto('/seuils');
    await expect(page).toHaveURL(/\/seuils$/);
    // On desktop, the tab is visible inline. On mobile it's in overflow.
    // The fixture default seems to be desktop.
    const activeTab = page.locator('.input-tab.active').filter({ visible: true });
    await expect(activeTab).toContainText('Seuils d\'admission');
  });

  test('State preservation between routes', async ({ page }) => {
    // 1. Go to /simuler
    await page.goto('/simuler');
    
    // 2. Enter a value in a grade input
    const francaisInput = page.locator('#grade-FRANCAIS');
    await francaisInput.fill('15');
    
    // 3. Go to /lycees
    await page.click('button:has-text("Lycées de secteur")');
    await expect(page).toHaveURL(/\/lycees$/);
    
    // 4. Go back to /simuler
    await page.click('button:has-text("Simuler")');
    await expect(page).toHaveURL(/\/simuler$/);
    
    // 5. Verify the grade value is still there
    await expect(page.locator('#grade-FRANCAIS')).toHaveValue('15');
  });
});
