/**
 * Three-engine release verification against the prepared frontend artifact.
 * @packageDocumentation
 */

/** Run core journeys against the exact deployable build, retaining separate account-enabled fixtures. */
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  // Account activation remains a separate setup gate; its full fixture suite still runs in ci:integration.
  testIgnore: ['vertical/**', 'account.spec.ts'],
  workers: 1,
  webServer: {
    command: 'npm run preview:e2e',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
