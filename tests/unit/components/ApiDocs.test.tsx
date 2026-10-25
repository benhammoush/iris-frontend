/**
 * Regression coverage and controlled fixtures for api docs.
 * @packageDocumentation
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import ApiDocs, {
  apiDocsConfiguration,
  openApiUrl,
} from '../../../src/components/ApiDocs';

vi.mock('@scalar/api-reference-react', () => ({
  /** Render the configured API URL instead of loading the external reference UI in the unit test. */
  ApiReferenceReact: ({
    configuration,
  }: {
    configuration: Pick<typeof apiDocsConfiguration, 'url'>;
  }) => <div data-testid="scalar">{configuration.url}</div>,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each([
  'https://iris-backend-dev.example.invalid',
  'https://iris-backend-production.example.invalid',
  'https://custom-backend.example.invalid',
])('binds documentation to the configured Worker %s', async (origin) => {
  vi.stubEnv('PROD', true);
  vi.stubEnv('VITE_API_BASE', `${origin}/`);
  vi.resetModules();
  const { apiDocsConfiguration: configuration } =
    await import('../../../src/components/ApiDocs');
  expect(configuration.servers).toEqual([{ url: origin }]);
});

test('keeps the dashboard localhost fallback for local documentation', async () => {
  vi.stubEnv('PROD', false);
  vi.stubEnv('VITE_API_BASE', undefined);
  vi.resetModules();
  const { apiDocsConfiguration: configuration } =
    await import('../../../src/components/ApiDocs');
  expect(configuration.servers).toEqual([{ url: 'http://localhost:8787' }]);
});

test('does not mount an interactive renderer without deployment API configuration', async () => {
  vi.stubEnv('PROD', true);
  vi.stubEnv('VITE_API_BASE', undefined);
  vi.resetModules();
  const { default: UnconfiguredDocs } =
    await import('../../../src/components/ApiDocs');
  render(
    <BrowserRouter>
      <UnconfiguredDocs />
    </BrowserRouter>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'VITE_API_BASE must be set',
  );
  expect(screen.queryByTestId('scalar')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Iris' })).toHaveAttribute(
    'href',
    '/',
  );
});

test('renders Scalar with the published Iris OpenAPI document', () => {
  render(
    <BrowserRouter>
      <ApiDocs />
    </BrowserRouter>,
  );
  expect(
    screen.getByRole('heading', { name: 'Interactive API documentation' }),
  ).toBeInTheDocument();
  expect(screen.getByTestId('scalar')).toHaveTextContent(openApiUrl);
  expect(screen.getByRole('link', { name: 'Back to Iris' })).toHaveAttribute(
    'href',
    '/',
  );
});

test('disables persisted authentication and optional external services', () => {
  expect(apiDocsConfiguration).toMatchObject({
    persistAuth: false,
    telemetry: false,
    agent: { disabled: true },
    withDefaultFonts: false,
    proxyUrl: '',
  });
});
