# Testing Patterns

**Analysis Date:** 2025-05-18

## Test Framework

**Runner:**
- Vitest 4.1.1 (for Unit/Integration)
- Playwright 1.58.2 (for E2E)

**Assertion Library:**
- Vitest (built-in assertions, Jest-compatible)
- Playwright (built-in `@playwright/test` assertions)

**Run Commands:**
```bash
npm run test           # Run all Vitest tests
npm run test:watch     # Vitest watch mode
npm run test:e2e       # Run all Playwright tests
```

## Test File Organization

**Location:**
- Unit Tests: Co-located `__tests__` directory in `src/` (e.g., `src/services/__tests__`)
- E2E Tests: Dedicated `tests/e2e` directory in root.

**Naming:**
- Unit Tests: `filename.test.ts`
- E2E Tests: `filename.spec.ts`

**Structure:**
```
src/
└── services/
    ├── sectorApi.ts
    └── __tests__/
        └── sectorApi.test.ts
tests/
└── e2e/
    └── sector-search.spec.ts
```

## Test Structure

**Vitest (Service Testing):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { someFunction } from '../someService';

describe('someService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('behaves correctly', async () => {
    // ... setup and assertions
    expect(result).toEqual(expectedValue);
  });
});
```

**Playwright (E2E Testing):**
```typescript
import { test, expect } from '@playwright/test';

test('feature test', async ({ page }) => {
  await page.goto('/');
  // Interactions
  await page.locator('selector').fill('value');
  // Assertions
  await expect(page.locator('selector')).toBeVisible();
});
```

## Mocking

**Framework:**
- Vitest: Built-in `vi` utility.
- Playwright: Built-in `page.route` for network mocking.

**Patterns:**
- Mocking `fetch`: Use `vi.spyOn(globalThis, 'fetch')` in Vitest.
```typescript
vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
  ok: true,
  json: async () => [{ uai: '...', nom: '...' }],
} as Response);
```
- Mocking APIs in Playwright:
```typescript
await page.route('**/api.url/**', (route) =>
  route.fulfill({ body: JSON.stringify({ ... }), contentType: 'application/json' })
);
```

## Fixtures and Factories

**Test Data:**
- Constant arrays of objects used for data-driven testing in Playwright.
```typescript
const TEST_CASES = [
  { address: '...', college: '...', uai: '...' },
];
for (const tc of TEST_CASES) {
  test(`search for ${tc.address}`, async ({ page }) => { ... });
}
```

**Location:**
- Defined directly in the test file for small data sets.

## Coverage

**Requirements:**
- None explicitly enforced in `vitest.config.ts`.

**View Coverage:**
- Not currently configured in `package.json` scripts.

## Test Types

**Unit Tests:**
- Test individual service functions and utilities (e.g., `src/services/__tests__/geo.test.ts`).

**Integration Tests:**
- Test orchestration in services with mocked API responses (e.g., `src/services/__tests__/sectorApi.test.ts`).

**E2E Tests:**
- Test complete user flows (e.g., searching for an address and verifying the results).
- Cross-validation: `tests/e2e/carte-scolaire-validation.spec.ts` compares the app results with official government sites.

## Common Patterns

**Async Testing:**
- Use `async/await` in all test functions and `expect(...).rejects.toThrow()`.

**Error Testing:**
- Mocking network errors and checking for user-facing error messages.
```typescript
await expect(page.locator('.error-message')).toBeVisible({ timeout: 15000 });
```

---

*Testing analysis: 2025-05-18*
