/**
 * Isolated frontend/Worker vertical integration with owned local test servers.
 * @packageDocumentation
 */

import { defineConfig, devices } from '@playwright/test';

const workerRoot = process.env.IRIS_WORKER_ROOT || '../iris-backend';

export default defineConfig({
  testDir: './tests/e2e/vertical',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npm --prefix ${workerRoot} run e2e:serve`,
      url: 'http://127.0.0.1:8787/health',
      reuseExistingServer: false,
      timeout: 90_000,
    },
    {
      command: 'npm run preview:vertical',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
