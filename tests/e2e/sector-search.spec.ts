import { test, expect } from './fixtures';

// These tests hit real upstream APIs (CapGeo, ArcGIS).
// Retry transient failures from rate-limits or upstream slowness.
test.describe.configure({ retries: 2 });

// Single representative case: validates the full real pipeline end-to-end.
// Keep narrow to limit upstream API load and flakiness.
// Test data valid for 2025-2026 school year — update each year.
const TEST_CASES = [
  {
    address: '12 passage Saint-Ambroise',
    college: 'VOLTAIRE',
    uai: '0752536Z',
    lyceesSecteur1: ['DORIAN', 'CHARLEMAGNE', 'COLBERT', 'TURGOT', 'VOLTAIRE'],
  },
];

for (const tc of TEST_CASES) {
  test(`finds sector schools for ${tc.address} @external`, async ({ page }) => {
    await page.goto('/');

    // Type address and wait for suggestions
    const input = page.locator('input[type="text"]');
    await input.fill(tc.address);
    await page.waitForTimeout(500); // debounce

    // Click first suggestion
    const suggestion = page.locator('.suggestion-item').first();
    await suggestion.waitFor({ timeout: 10000 });
    await suggestion.click();

    // Wait for college result
    const collegeName = page.locator('.college-title h2');
    await expect(collegeName).toContainText(tc.college, { timeout: 15000 });

    // Verify UAI is in the rectorat link
    await expect(page.locator(`.etablissement-link[href*="${tc.uai}"]`)).toBeVisible();

    // Verify lycees secteur 1 are in the card (donut chart labels or concurrence section)
    const collegeCard = page.locator('.college-card');
    await expect(collegeCard).toBeVisible({ timeout: 15000 });

    for (const lyceeName of tc.lyceesSecteur1) {
      await expect(collegeCard).toContainText(lyceeName);
    }
  });
}

test('displays error for search failure @external', async ({ page }) => {
  await page.goto('/');

  // Mock API to return empty
  await page.route('**/capgeo2.paris.fr/**', (route) =>
    route.fulfill({ body: JSON.stringify({ features: [] }), contentType: 'application/json' })
  );

  const input = page.locator('input[type="text"]');
  await input.fill('12 passage Saint-Ambroise');
  await page.waitForTimeout(500);

  const suggestion = page.locator('.suggestion-item').first();
  await suggestion.waitFor({ timeout: 10000 });
  await suggestion.click();

  // Should show error
  await expect(page.locator('.error-message')).toBeVisible({ timeout: 15000 });
});

test('history displays and restores results @external', async ({ page }) => {
  await page.goto('/');

  // Search for an address
  const input = page.locator('input[type="text"]');
  await input.fill('12 passage Saint-Ambroise');
  await page.waitForTimeout(500);
  const suggestion = page.locator('.suggestion-item').first();
  await suggestion.waitFor({ timeout: 10000 });
  await suggestion.click();

  // Wait for result
  await expect(page.locator('.college-title h2')).toContainText('VOLTAIRE', { timeout: 15000 });

  // Go back to search
  await page.locator('.new-search-button').click();

  // History should appear
  const historyItem = page.locator('.history-content').first();
  await expect(historyItem).toBeVisible();
  await expect(historyItem).toContainText('VOLTAIRE');

  // Click history entry — should show result immediately
  await historyItem.click();
  await expect(page.locator('.college-title h2')).toContainText('VOLTAIRE');
});
