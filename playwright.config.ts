import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';
const useLocalServer = !process.env.BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    baseURL,
    headless: !!process.env.CI,
  },
  ...(useLocalServer
    ? {
        webServer: {
          command: 'npm run preview',
          port: 4173,
          reuseExistingServer: !process.env.CI,
        },
      }
    : {}),
});
