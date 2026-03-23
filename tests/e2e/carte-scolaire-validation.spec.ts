import { test, expect, type Page } from '@playwright/test';

const CARTE_SCOLAIRE_URL =
  'https://experience.arcgis.com/experience/5b6803bc7f634620a85da29dd8a113fe';

// French locale for ArcGIS + large viewport
test.use({ locale: 'fr-FR', viewport: { width: 1440, height: 900 } });

// --- Our app helpers ---

async function searchOnOurApp(page: Page, address: string): Promise<string> {
  await page.goto('/');
  const input = page.locator('input[type="text"]');
  await input.fill(address);
  await page.waitForTimeout(500);

  const suggestion = page.locator('.suggestion-item').first();
  await suggestion.waitFor({ timeout: 10000 });
  await suggestion.click();

  const collegeName = page.locator('.college-title h2');
  await collegeName.waitFor({ timeout: 15000 });
  const text = await collegeName.innerText();
  // Normalize: our app may display "COLLEGE VOLTAIRE" or just "VOLTAIRE"
  return text.replace(/^COLLEGE\s+/i, '').trim().toUpperCase();
}

// --- Official carte scolaire helpers ---

async function dismissPopup(page: Page): Promise<void> {
  const okBtn = page.locator('.modal.show button', { hasText: 'OK' });
  await okBtn.waitFor({ timeout: 30000 });
  await okBtn.click();
  await page.waitForTimeout(1000);
}

async function activateCollegeOnly(page: Page): Promise<void> {
  const college = page.locator('input[aria-label="Collège"]');
  if (!(await college.isChecked())) {
    await college.click({ force: true });
  }
  for (const label of ['Ecole maternelle', 'Ecole élémentaire']) {
    const cb = page.locator(`input[aria-label="${label}"]`);
    if (await cb.isChecked()) {
      await cb.click({ force: true });
    }
  }
  await page.waitForTimeout(500);
}

async function searchOnOfficialSite(page: Page, address: string): Promise<string> {
  const searchInput = page.locator(
    'input[placeholder="Rechercher une adresse ou un lieu"]'
  );
  await searchInput.waitFor({ timeout: 15000 });
  await searchInput.click();
  await searchInput.fill(address);
  await page.waitForTimeout(2000);

  const suggestion = page.locator('button.d-flex.align-items-center.py-2').first();
  await suggestion.waitFor({ timeout: 10000 });
  await suggestion.click();

  const collegeStrong = page.locator('strong', { hasText: /^Collège / });
  await collegeStrong.waitFor({ timeout: 15000 });

  const text = await collegeStrong.innerText();
  return text.replace(/^Collège\s+/i, '').trim().toUpperCase();
}

// --- Test data: addresses to cross-validate ---

const ADDRESSES = [
  '12 passage Saint-Ambroise',
  '15 rue de Rivoli',
  '45 rue de Belleville',
  '8 avenue de Suffren',
  '120 boulevard de Ménilmontant',
  '101 avenue de la République',
  '13 rue Charlemagne',
  '45 boulevard des Batignolles',
  '16 boulevard Pasteur',
  '124 rue Amelot',
  '69 avenue Simon Bolivar',
  '208 rue Saint-Charles',
];

// --- Cross-validation tests ---

test.describe('Cross-validation: notre app vs carte scolaire officielle', () => {
  test.setTimeout(120_000);

  for (const address of ADDRESSES) {
    test(`${address}`, async ({ browser }) => {
      // Page 1: search on our app (localhost)
      const appContext = await browser.newContext({ locale: 'fr-FR' });
      const appPage = await appContext.newPage();
      const ourCollege = await searchOnOurApp(appPage, address);
      await appContext.close();

      // Page 2: search on official carte scolaire
      const officialContext = await browser.newContext({
        locale: 'fr-FR',
        viewport: { width: 1440, height: 900 },
      });
      const officialPage = await officialContext.newPage();
      await officialPage.goto(CARTE_SCOLAIRE_URL, { timeout: 60000 });
      await dismissPopup(officialPage);
      await activateCollegeOnly(officialPage);
      const officialCollege = await searchOnOfficialSite(officialPage, address);
      await officialContext.close();

      // Compare
      expect(
        ourCollege,
        `Mismatch for "${address}": notre app dit "${ourCollege}", site officiel dit "${officialCollege}"`
      ).toBe(officialCollege);
    });
  }
});
