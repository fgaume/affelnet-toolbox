import { test, expect } from '@playwright/test';

test.describe('Score Calculation & Admission Chances Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Academic Stats API
    await page.route('**/datasets-server.huggingface.co/rows?dataset=fgaume%2Faffelnet-paris-statistiques-champs-disciplinaires**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rows: [
            { row: { annee: 2024, champ: 'FRANCAIS', moyenne: 14, 'ecart-type': 3 } },
            { row: { annee: 2024, champ: 'MATHEMATIQUES', moyenne: 13, 'ecart-type': 4 } },
            { row: { annee: 2024, champ: 'HISTOIRE-GEO', moyenne: 15, 'ecart-type': 2 } },
            { row: { annee: 2024, champ: 'LANGUES VIVANTES', moyenne: 14, 'ecart-type': 3 } },
            { row: { annee: 2024, champ: 'SCIENCES-TECHNO-DP', moyenne: 12, 'ecart-type': 5 } },
            { row: { annee: 2024, champ: 'ARTS', moyenne: 16, 'ecart-type': 2 } },
            { row: { annee: 2024, champ: 'EPS', moyenne: 14, 'ecart-type': 3 } },
          ],
          num_rows_total: 7,
        }),
      });
    });

    // Mock Seuils API
    await page.route('**/datasets-server.huggingface.co/rows?dataset=fgaume%2Faffelnet-paris-seuils-admission-lycees**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rows: [
            { row: { code: '0750680G', nom: 'ARAGO', seuils: [0, 0, 0, 0, 42000] } },
          ],
        }),
      });
    });

    // Mock Address API
    await page.route('https://api-adresse.data.gouv.fr/search/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          features: [
            {
              properties: { label: '12 passage Saint-Ambroise, 75011 Paris', postcode: '75011', city: 'Paris' },
              geometry: { coordinates: [2.37, 48.86] },
            },
          ],
        }),
      });
    });

    // Mock ArcGIS for Sector
    await page.route('**/services9.arcgis.com/**/Sector_College/FeatureServer/0/query**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          features: [{ attributes: { NOM_COLLEG: 'VOLTAIRE' } }],
        }),
      });
    });

    // Mock ArcGIS for College UAI
    await page.route('**/services9.arcgis.com/**/COLLEGES_PARIS_UAI/FeatureServer/0/query**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          features: [{ attributes: { UAI: '0750247L', NOM: 'VOLTAIRE' }, geometry: { x: 2.38, y: 48.85 } }],
        }),
      });
    });

    // Mock ArcGIS for Lycées
    await page.route('**/services9.arcgis.com/**/Sector_Lycees/FeatureServer/0/query**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          features: [
            { attributes: { UAI: '0750680G', NOM_ETAB: 'ARAGO', SECTEUR: 1 }, geometry: { x: 2.39, y: 48.84 } },
          ],
        }),
      });
    });

    // Mock Effectifs API
    await page.route('**/data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-etablissements-publics-et-prives-d-ile-de-france/records**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            { uai: '0750680G', nom: 'ARAGO', effectifs: 100 },
          ],
        }),
      });
    });

    // Mock Niveau Scolaire & IPS for Charts
    await page.route('**/datasets-server.huggingface.co/rows?dataset=fgaume%2Faffelnet-paris-niveaux-scolaires-lycees**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rows: [] }) });
    });
    await page.route('**/datasets-server.huggingface.co/rows?dataset=fgaume%2Faffelnet-paris-ips-lycees**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rows: [] }) });
    });

    await page.goto('/');
  });

  test('should navigate to Score tab and display components', async ({ page }) => {
    await page.click('button:has-text("Simuler son barème")');
    await expect(page.locator('.grade-input-form')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.score-display')).toBeVisible({ timeout: 15000 });
  });

  test('should calculate score and persist it when switching tabs', async ({ page }) => {
    // 1. Calculate score
    await page.click('button:has-text("Simuler son barème")');
    const francaisInput = page.getByLabel('Moyenne annuelle de Français').first();
    await francaisInput.fill('16');
    
    const sector1Score = page.locator('.secteur-1 .score-value');
    await expect(sector1Score).toBeVisible();
    const initialScoreText = await sector1Score.innerText();

    // 2. Switch to Search tab
    await page.click('button:has-text("Lycées de secteur")');
    await expect(page.locator('input[placeholder="Saisissez votre adresse..."]')).toBeVisible();

    // 3. Switch back to Score tab
    await page.click('button:has-text("Simuler son barème")');
    await expect(page.locator('.secteur-1 .score-value')).toContainText(initialScoreText);
  });

  test('should show results summary after score is calculated', async ({ page }) => {
    // 1. Calculate a score
    await page.click('button:has-text("Simuler son barème")');
    
    // Fill some subjects to get a high score
    const francaisInput = page.getByLabel('Moyenne annuelle de Français').first();
    await francaisInput.fill('20');
    const mathInput = page.getByLabel('Moyenne annuelle de Mathématiques').first();
    await mathInput.fill('20');
    
    await expect(page.locator('.secteur-1 .score-value')).toBeVisible();

    // 2. Verify summary breakdown exists
    await expect(page.locator('.score-summary-breakdown')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("Total champs disciplinaires")')).toBeVisible();
  });
});
