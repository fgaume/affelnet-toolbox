import { test, expect } from './fixtures';
import { setupApiMocks } from './mocks';
import { SearchPage } from './pages/SearchPage';

test.describe('Score Calculation & Admission Chances Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
  });

  test('should navigate to Score tab and display components', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goToScoreTab();
    await expect(page.locator('.grade-input-form')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.score-display')).toBeVisible({ timeout: 15000 });
  });

  test('should calculate score and persist it when switching tabs', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goToScoreTab();

    const francaisInput = page.getByLabel('Moyenne annuelle de Français').first();
    await francaisInput.fill('16');

    const sector1Score = page.locator('.secteur-1 .score-value');
    await expect(sector1Score).toBeVisible();
    const initialScoreText = await sector1Score.innerText();

    await search.goToSearchTab();
    await expect(page.locator(`input[placeholder="Saisissez l'adresse de votre domicile"]`)).toBeVisible();

    await search.goToScoreTab();
    await expect(page.locator('.secteur-1 .score-value')).toContainText(initialScoreText);
  });

  test('should show results summary after score is calculated', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goToScoreTab();

    await page.getByLabel('Moyenne annuelle de Français').first().fill('20');
    await page.getByLabel('Moyenne annuelle de Mathématiques').first().fill('20');

    await expect(page.locator('.secteur-1 .score-value')).toBeVisible();
    await expect(page.locator('.score-summary-breakdown').first()).toBeVisible();
    await expect(page.locator('.summary-item:has-text("Barème scolaire total")')).toBeVisible();
  });
});
