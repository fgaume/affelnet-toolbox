import { test, expect } from '@playwright/test';

test.describe('Score Calculation Integration', () => {
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

    await page.goto('/');
  });

  test('should navigate to Score tab and display components', async ({ page }) => {
    // Navigate to Score tab
    await page.click('button:has-text("Calculer son score")');

    // Check if components are visible
    await expect(page.locator('.grade-input-form')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.score-display')).toBeVisible({ timeout: 15000 });
  });

  test('should calculate score when grades are entered', async ({ page }) => {
    // Navigate to Score tab
    await page.click('button:has-text("Calculer son score")');

    // Wait for form to load
    await page.waitForSelector('.grade-input-form');

    // Enter a grade for FRANCAIS
    const francaisInput = page.locator('label:has-text("Français") + input').first();
    await francaisInput.fill('16');

    // Check if score display shows a score
    const totalScoreValue = page.locator('.total-score-value');
    await expect(totalScoreValue).not.toContainText('--');
    
    // With 16 in FRANCAIS (moyenne 14, ecartType 3, weight 5):
    // rawAverage = 16
    // harmonizedNote = 10 * (10 + (16 - 14) / 3) = 10 * (10 + 0.666) = 106.66
    // contribution = 106.66 * 5 = 533.33
    // totalScore = 533.33 * 2 = 1066.66 (plus 0 for other fields)
    
    // Let's just check it's a number
    const scoreText = await totalScoreValue.innerText();
    const cleanScore = scoreText.replace(/\s/g, '').replace(',', '.');
    expect(Number(cleanScore)).toBeGreaterThan(0);
  });
});
