import { test as base } from '@playwright/test';

export const test = base.extend({
  // eslint-disable-next-line react-hooks/rules-of-hooks -- `use` is Playwright's fixture callback, not a React hook
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      localStorage.setItem('disclaimer_seen', 'true');
    });
    await use(context);
  },
});

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
