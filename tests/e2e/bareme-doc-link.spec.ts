import { test, expect } from './fixtures';
import { setupApiMocks } from './mocks';
import { SearchPage } from './pages/SearchPage';

test("lien vers la démonstration PDF dans « Information sur le calcul »", async ({ page }) => {
  await setupApiMocks(page);
  await page.goto('/');
  const search = new SearchPage(page);
  await search.goToScoreTab();

  // Le bloc info (et donc le lien) n'apparaît qu'une fois un score calculé.
  await page.getByLabel('Moyenne annuelle de Français').first().fill('15');

  const info = page.locator('.score-info');
  await expect(info).toContainText('quatre éléments');
  await expect(info).toContainText('bonus boursier');

  const link = info.locator('a.bareme-doc-link');
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  expect(href).toContain('bareme-scolaire.pdf');

  // Le PDF est bien servi.
  const resp = await page.request.get(new URL(href!, page.url()).toString());
  expect(resp.status()).toBe(200);
  expect(resp.headers()['content-type']).toContain('pdf');
});
