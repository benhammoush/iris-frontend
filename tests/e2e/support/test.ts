import { test as base, expect } from '@playwright/test';
import { installWorkerMock, type WorkerMock } from './workerMock';

export const test = base.extend<{ api: WorkerMock }>({
  api: [
    async ({ page }, use) => {
      const api = await installWorkerMock(page);
      await use(api);
      api.assertNoUnexpectedRequests();
    },
    { auto: true },
  ],
});

export { expect };
