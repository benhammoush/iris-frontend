import { expect, test } from './support/test';

const document = {
  openapi: '3.0.3',
  info: { title: 'Iris Test API', version: '1.0.0' },
  // The contract's production server must not override this frontend's API origin.
  servers: [{ url: 'https://iris-backend-production.example.invalid' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
  },
  paths: {
    ...Object.fromEntries(
      Array.from({ length: 2 }, (_, index) => [
        `/example-${index}`,
        {
          get: {
            summary: `Example ${index}`,
            operationId: `example${index}`,
            responses: { '200': { description: 'Example response' } },
          },
        },
      ]),
    ),
    '/health': {
      get: {
        summary: 'Check health',
        operationId: 'health',
        responses: { '200': { description: 'healthy' } },
      },
    },
  },
};

test('loads the pinned document, sends a direct request, deep-links and returns to Iris', async ({
  page,
}) => {
  const externalRequests: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (
      ![
        'http://127.0.0.1:4173',
        'https://openapi.test',
        'https://iris.test',
      ].includes(new URL(request.url()).origin)
    ) {
      externalRequests.push(request.url());
    }
  });
  await page.route('https://openapi.test/openapi.yaml', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(document),
    }),
  );
  await page.route('https://iris.test/health', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: '{"status":"iris-docs-request-ok"}',
    }),
  );
  await page.goto('/api-docs');
  await expect(
    page.getByRole('heading', { name: 'Interactive API documentation' }),
  ).toBeVisible();
  await expect(page.getByText('Iris Test API')).toBeVisible();
  await expect(page.getByText('v1.0.0', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Developer Tools', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Ask AI|Agent Scalar/ }),
  ).toHaveCount(0);
  const token = 'iris-test-token-not-a-real-credential';
  await page
    .getByRole('textbox', { name: 'Bearer Token', exact: true })
    .fill(token);
  await page
    .getByRole('button', { name: 'Test Request (get /health)', exact: true })
    .click();
  const request = page.waitForRequest('https://iris.test/health');
  await page
    .getByRole('button', {
      name: 'Send get request to https://iris.test/health',
      exact: true,
    })
    .click();
  const sent = await request;
  expect(sent.method()).toBe('GET');
  expect(sent.headers().authorization).toBe(`Bearer ${token}`);
  await expect(
    page.getByRole('region', { name: 'Response', exact: true }),
  ).toContainText('iris-docs-request-ok');
  await page.getByRole('button', { name: 'Close Client', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'API Client', exact: true }),
  ).toBeHidden();
  const storedValues = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(storedValues).not.toContain(token);
  const hash = await page
    .getByRole('region', { name: 'Check health', exact: true })
    .getAttribute('id');
  expect(hash).toBeTruthy();
  await page.goto(`/api-docs#${hash}`);
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: 'Check health', exact: true })
      .getByRole('heading', { name: 'Check health', exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole('textbox', { name: 'Bearer Token', exact: true }),
  ).toHaveValue('');
  expect(externalRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  await page.getByRole('link', { name: 'Back to Iris' }).click();
  await expect(
    page.getByRole('heading', { name: 'Market overview' }),
  ).toBeVisible();
});
