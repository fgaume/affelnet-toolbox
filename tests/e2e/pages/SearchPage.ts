import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class SearchPage {
  readonly page: Page;
  readonly addressInput: Locator;
  readonly suggestionItem: Locator;
  readonly collegeTitle: Locator;
  readonly collegeCard: Locator;
  readonly errorMessage: Locator;
  readonly newSearchButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addressInput = page.locator('input[type="text"]');
    this.suggestionItem = page.locator('.suggestion-item').first();
    this.collegeTitle = page.locator('.college-title h2');
    this.collegeCard = page.locator('.college-card');
    this.errorMessage = page.locator('.error-message');
    this.newSearchButton = page.locator('.new-search-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async searchAddress(address: string): Promise<void> {
    await this.addressInput.fill(address);
    await this.suggestionItem.waitFor({ timeout: 10000 });
    await this.suggestionItem.click();
  }

  async searchAndExpectCollege(address: string, collegeName: string): Promise<void> {
    await this.searchAddress(address);
    await expect(this.collegeTitle).toContainText(collegeName, { timeout: 15000 });
    await expect(this.collegeCard).toBeVisible({ timeout: 15000 });
  }

  async goToScoreTab(): Promise<void> {
    await this.page.click('button:has-text("Simuler")');
  }

  async goToSearchTab(): Promise<void> {
    await this.page.click('button:has-text("Lycées de secteur")');
  }
}
