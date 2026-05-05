import { test, expect } from './fixtures';
import { setupApiMocks } from './mocks';
import { SearchPage } from './pages/SearchPage';

test.describe('Parcours — recherche par nom de collège', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    const search = new SearchPage(page);
    await search.goto();
  });

  test('bascule sur l\'onglet "Par collège" et trouve VOLTAIRE par autocomplete', async ({ page }) => {
    await page.locator('.search-mode-tab', { hasText: 'Par collège de secteur' }).click();
    await expect(page.locator('.college-autocomplete-container')).toBeVisible();

    const input = page.locator('.college-input');
    await input.fill('VOLT');

    const suggestion = page.locator('.suggestions-list .suggestion-item', { hasText: 'VOLTAIRE' }).first();
    await suggestion.waitFor({ timeout: 10000 });
    await suggestion.click();

    await expect(page.locator('.college-title h2')).toContainText('VOLTAIRE', { timeout: 15000 });
    await expect(page.locator('.college-card')).toBeVisible();
  });
});

test.describe('Parcours — collège de scolarisation différent du secteur', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    const search = new SearchPage(page);
    await search.goto();
    await search.searchAndExpectCollege('12 passage Saint-Ambroise', 'VOLTAIRE');
  });

  test('clique "Non" et sélectionne un autre collège → IPS du collège choisi', async ({ page }) => {
    await page.locator('.scolarisation-btn-no').click();

    const otherInput = page.locator('.scolarisation-other .college-input');
    await expect(otherInput).toBeVisible();
    await otherInput.fill('CESARIA');

    const suggestion = page.locator('.suggestions-list .suggestion-item', { hasText: 'CESARIA EVORA' }).first();
    await suggestion.waitFor({ timeout: 10000 });
    await suggestion.click();

    await expect(page.locator('.scolarisation-badge-other')).toContainText('CESARIA EVORA');
    await expect(page.locator('.ips-gauge')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.ips-number').first()).toContainText('78,3');
    await expect(page.locator('.ips-number').nth(1)).toContainText('600');
  });

  test('le bouton "Modifier" remet la question scolarisation à zéro', async ({ page }) => {
    await page.locator('.scolarisation-btn-yes').click();
    await expect(page.locator('.scolarisation-badge', { hasText: 'Secteur · Scolarisation' })).toBeVisible();

    await page.locator('.scolarisation-change').click();
    await expect(page.locator('.scolarisation-question')).toBeVisible();
    await expect(page.locator('.ips-gauge')).toHaveCount(0);
  });
});
