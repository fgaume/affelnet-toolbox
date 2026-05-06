import { test, expect, type Page } from './fixtures';

const CARTE_SCOLAIRE_URL =
  'https://experience.arcgis.com/experience/5b6803bc7f634620a85da29dd8a113fe';

// French locale for ArcGIS + large viewport
test.use({ locale: 'fr-FR', viewport: { width: 1440, height: 900 } });

// --- Our app helpers ---

async function searchOnOurApp(page: Page, address: string): Promise<string> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('disclaimer_seen', 'true'));
  await page.reload();
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
  // Handle both old checkboxes and new toggle switches
  const collegeCheckbox = page.locator('input[aria-label="Collège"]');
  const hasOldUi = (await collegeCheckbox.count()) > 0;

  if (hasOldUi) {
    if (!(await collegeCheckbox.isChecked())) {
      await collegeCheckbox.click({ force: true });
    }
    for (const label of ['Ecole maternelle', 'Ecole élémentaire']) {
      const cb = page.locator(`input[aria-label="${label}"]`);
      if ((await cb.count()) > 0 && (await cb.isChecked())) {
        await cb.click({ force: true });
      }
    }
  } else {
    // New ArcGIS UI with toggle switches
    const collegeSwitch = page.locator('switch "Collège"');
    if ((await collegeSwitch.count()) > 0) {
      const isChecked = await collegeSwitch.getAttribute('checked');
      if (isChecked === null) {
        await collegeSwitch.click();
      }
    }
    for (const label of ['Ecole maternelle', 'Ecole élémentaire']) {
      const sw = page.locator(`switch "${label}"`);
      if ((await sw.count()) > 0 && (await sw.getAttribute('checked')) !== null) {
        await sw.click();
      }
    }
  }
  await page.waitForTimeout(1000);
}

async function searchOnOfficialSite(page: Page, address: string): Promise<string> {
  // Try both French and English placeholder
  const searchInput = page.locator(
    'input[placeholder="Rechercher une adresse ou un lieu"], input[placeholder="Find address or place"]'
  ).first();
  await searchInput.waitFor({ timeout: 15000 });
  await searchInput.click();
  await searchInput.fill(address);
  await page.waitForTimeout(3000);

  // Try old suggestion format, then generic
  const oldSuggestion = page.locator('button.d-flex.align-items-center.py-2').first();
  if ((await oldSuggestion.count()) > 0) {
    await oldSuggestion.waitFor({ timeout: 10000 });
    await oldSuggestion.click();
  } else {
    // Look for any suggestion containing the address
    const suggestion = page.locator('button:has-text("Paris")').first();
    await suggestion.waitFor({ timeout: 10000 });
    await suggestion.click();
  }

  await page.waitForTimeout(2000);

  // Wait for college result with longer timeout
  const collegeStrong = page.locator('strong', { hasText: /^Collège / });
  await collegeStrong.waitFor({ timeout: 30000 });

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

test.describe('Cross-validation: notre app vs carte scolaire officielle @cross-check', () => {
  test.setTimeout(120_000);

  for (const address of ADDRESSES) {
    test(`${address} @cross-check`, async ({ browser }) => {
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
