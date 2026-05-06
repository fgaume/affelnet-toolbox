import { test, expect } from './fixtures';
import { setupApiMocks } from './mocks';
import { SearchPage } from './pages/SearchPage';

test.describe('Graphiques & visualisations', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    const search = new SearchPage(page);
    await search.goto();
    await search.searchAndExpectCollege('12 passage Saint-Ambroise', 'VOLTAIRE');
  });

  test('SectorMap (Leaflet) est rendue avec la légende', async ({ page }) => {
    await expect(page.locator('.sector-map')).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.map-legend')).toBeVisible();
    await expect(page.locator('.map-legend .legend-item', { hasText: 'Collège' })).toBeVisible();
    await expect(page.locator('.map-legend .legend-item', { hasText: 'Lycée' })).toBeVisible();
  });

  test('IpsGauge du collège affiche la valeur IPS après scolarisation "Oui"', async ({ page }) => {
    await page.locator('.scolarisation-btn-yes').click();
    await expect(page.locator('.ips-gauge')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.ips-gauge-title')).toContainText('IPS');
    await expect(page.locator('.ips-number').first()).toContainText('110,5');
    await expect(page.locator('.ips-gauge-marker')).toBeVisible();
  });

  test('EffectifsDonut est rendu pour le collège', async ({ page }) => {
    const donut = page.locator('.recharts-pie-sector').first();
    await expect(donut).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.recharts-pie-sector')).toHaveCount(2);
    await expect(page.locator('.donut-label-box').first()).toBeVisible();
  });
});
