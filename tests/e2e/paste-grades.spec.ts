import { test, expect } from './fixtures';
import { setupApiMocks } from './mocks';
import { SearchPage } from './pages/SearchPage';

test.describe('Coller mes notes', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
  });

  test('parse un collage, affiche la synthèse et remplit les champs vides', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goToScoreTab();
    await expect(page.locator('.grade-input-form')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Coller mes notes")');
    await expect(page.locator('.paste-grades-modal')).toBeVisible();

    const pasted = [
      'Mathématiques 12 14',
      'Français 13',
      'E.M.C. 16',
      'Anglais 17',
      'Espagnol 11',
      'ED. PHYS 18',
      'Absences : 3 demi-journées',
    ].join('\n');

    await page.locator('.paste-grades-textarea').fill(pasted);
    await page.click('.paste-grades-modal button:has-text("Analyser")');

    // Synthèse : maths moyennée (13), et mention "moyenne de 2 notes"
    await expect(page.locator('.paste-grades-summary')).toBeVisible();
    await expect(page.locator('.paste-grades-summary')).toContainText('13,00');
    await expect(page.locator('.paste-grades-summary')).toContainText('moyenne de 2 notes');

    // Ligne ignorée
    await expect(page.locator('.paste-grades-ignored-toggle')).toContainText('1 ligne ignorée');

    await page.click('.paste-grades-modal button:has-text("Appliquer")');

    // Les champs sont remplis dans le formulaire
    await expect(page.getByLabel('Moyenne annuelle de Mathématiques').first()).toHaveValue('13');
    await expect(page.getByLabel('Moyenne annuelle de Français').first()).toHaveValue('13');
    await expect(page.getByLabel('Moyenne annuelle de EMC').first()).toHaveValue('16');
    await expect(page.getByLabel('Moyenne annuelle de LV1').first()).toHaveValue('17');
    await expect(page.getByLabel('Moyenne annuelle de LV2').first()).toHaveValue('11');
    await expect(page.getByLabel('Moyenne annuelle de EPS').first()).toHaveValue('18');
  });

  test('signale un conflit LV2 quand deux langues non-anglaises sont collées', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goToScoreTab();
    await expect(page.locator('.grade-input-form')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Coller mes notes")');
    await page.locator('.paste-grades-textarea').fill('Espagnol 13\nAllemand 11');
    await page.click('.paste-grades-modal button:has-text("Analyser")');

    await expect(page.locator('.paste-grades-conflict')).toBeVisible();
    // LV2 non appliquée tant qu'on n'a pas choisi
    await expect(page.locator('.paste-grades-modal button:has-text("Appliquer")')).toBeDisabled();

    // On choisit l'espagnol => Appliquer s'active
    await page.locator('.paste-grades-radio', { hasText: 'Espagnol' }).locator('input').check();
    await page.click('.paste-grades-modal button:has-text("Appliquer")');
    await expect(page.getByLabel('Moyenne annuelle de LV2').first()).toHaveValue('13');
  });
});
