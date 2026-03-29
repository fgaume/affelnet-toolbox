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
    await page.click('button:has-text("Calculer son score")');
    await expect(page.locator('.grade-input-form')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.score-display')).toBeVisible({ timeout: 15000 });
  });

  test('should calculate score and persist it when switching tabs', async ({ page }) => {
    // 1. Calculate score
    await page.click('button:has-text("Calculer son score")');
    const francaisInput = page.locator('label:has-text("Français") + input').first();
    await francaisInput.fill('16');
    
    const totalScoreValue = page.locator('.total-score-value');
    await expect(totalScoreValue).not.toContainText('--');
    const initialScoreText = await totalScoreValue.innerText();

    // 2. Switch to Search tab
    await page.click('button:has-text("Par adresse")');
    await expect(page.locator('input[placeholder="Saisissez votre adresse..."]')).toBeVisible();

    // 3. Switch back to Score tab
    await page.click('button:has-text("Calculer son score")');
    await expect(page.locator('.total-score-value')).toContainText(initialScoreText);
  });

  test('should show admission chances in search results after score is calculated', async ({ page }) => {
    // 1. Calculate a high score
    await page.click('button:has-text("Calculer son score")');
    
    // Fill all subjects with 20 to get a very high score
    const inputs = page.locator('input[type="number"]');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill('20');
    }
    
    await expect(page.locator('.total-score-value')).not.toContainText('--');
    const finalScore = await page.locator('.total-score-value').innerText();

    // 2. Search for an address
    await page.click('button:has-text("Par adresse")');
    const addressInput = page.locator('input[placeholder="Saisissez votre adresse..."]');
    await addressInput.fill('12 passage Saint-Ambroise');
    await page.waitForTimeout(500);
    const suggestion = page.locator('.suggestion-item').first();
    await suggestion.click();

    // 3. Verify CollegeCard and admission chances
    await expect(page.locator('.college-card')).toBeVisible();
    await expect(page.locator('.admission-chances')).toBeVisible();
    
    // 4. Check for a specific lycée in the list (ARAGO from our mock)
    await expect(page.locator('.chance-item:has-text("ARAGO")')).toBeVisible();
    
    // 5. Verify the "Collèges en concurrence" section also has ARAGO
    await expect(page.locator('.concurrence-lycee-btn:has-text("ARAGO")')).toBeVisible();
    
    // 6. Click on it to expand
    await page.locator('.concurrence-lycee-btn:has-text("ARAGO")').click();
    
    // 7. Verify colleges list is shown (it will be empty because we didn't mock collegesConcurrenceApi but the button should stay expanded)
    await expect(page.locator('.concurrence-lycee-btn:has-text("ARAGO")')).toHaveClass(/expanded/);
  });
});
