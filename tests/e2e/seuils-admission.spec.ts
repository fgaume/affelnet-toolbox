import { test, expect } from './fixtures';
import { setupApiMocks } from './mocks';

test.describe('Seuils d\'admission — Non-boursiers & Boursiers', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.click('button:has-text("Seuils d\'admission")');
  });

  test('affiche le tableau Non-boursiers avec colonnes années + valeurs', async ({ page }) => {
    const section = page.locator('.admission-history-section', { hasText: 'Non-boursiers' });
    await expect(section).toBeVisible({ timeout: 15000 });

    const headers = section.locator('thead th');
    await expect(headers.first()).toContainText('Lycée');
    await expect(section.locator('thead th.col-year')).toHaveCount(5);

    const aragoRow = section.locator('tbody tr', { hasText: 'ARAGO' });
    await expect(aragoRow).toBeVisible();
    await expect(aragoRow.locator('.col-year').last()).toContainText('42');

    const henriIv = section.locator('tbody tr', { hasText: 'HENRI IV' });
    await expect(henriIv.locator('.col-year').last()).toContainText('N/A');
  });

  test('affiche le tableau Boursiers en plus du tableau Non-boursiers', async ({ page }) => {
    const boursiersSection = page.locator('.admission-history-section', { hasText: 'Boursiers' }).filter({
      hasNot: page.locator('h3:has-text("Non-boursiers")'),
    });
    await expect(boursiersSection).toBeVisible({ timeout: 15000 });

    const aragoRow = boursiersSection.locator('tbody tr', { hasText: 'ARAGO' });
    await expect(aragoRow).toBeVisible();
    await expect(aragoRow.locator('.col-year').last()).toContainText('35');

    await expect(boursiersSection.locator('th', { hasText: 'Évolution' })).toHaveCount(0);
  });

  test('le filtre par nom restreint les lignes affichées', async ({ page }) => {
    await page.locator('.admission-history-filter').fill('voltaire');

    const nonBoursiers = page.locator('.admission-history-section', { hasText: 'Non-boursiers' });
    await expect(nonBoursiers.locator('tbody tr', { hasText: 'VOLTAIRE' })).toHaveCount(1);
    await expect(nonBoursiers.locator('tbody tr', { hasText: 'ARAGO' })).toHaveCount(0);
  });

  test('toggle sparkline ouvre le graphique d\'évolution', async ({ page }) => {
    const nonBoursiers = page.locator('.admission-history-section', { hasText: 'Non-boursiers' });
    const aragoRow = nonBoursiers.locator('tbody tr', { hasText: 'ARAGO' });

    await aragoRow.locator('.sparkline-toggle').click();
    await expect(aragoRow.locator('.sparkline-container')).toBeVisible();
  });

  test('légende des niveaux de difficulté est présente', async ({ page }) => {
    const legend = page.locator('.admission-history-legend');
    await expect(legend).toBeVisible();
    await expect(legend.locator('.legend-item')).toHaveCount(5);
  });
});

test.describe('Seuils d\'admission — gestion des cas limites', () => {
  test('boursiers indisponibles → seul le tableau non-boursiers s\'affiche', async ({ page }) => {
    await setupApiMocks(page, {
      seuilsBoursiers: { rows: [] },
    });
    await page.goto('/');
    await page.click('button:has-text("Seuils d\'admission")');

    await expect(page.locator('.admission-history-section', { hasText: 'Non-boursiers' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('h3', { hasText: /^Boursiers$/ })).toHaveCount(0);
  });
});
