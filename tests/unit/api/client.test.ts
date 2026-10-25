/**
 * Regression coverage and controlled fixtures for client.
 * @packageDocumentation
 */

import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** Load a fresh client module under the test configuration.
 * @returns The client configured with an isolated, non-production Worker origin.
 */
async function loadClient() {
  vi.stubEnv('PROD', false);
  vi.stubEnv('VITE_API_BASE', 'http://iris.test/');
  return import('../../../src/api/client');
}

test('keeps atomic strings, null values and metadata at the typed transport boundary', async () => {
  const client = await loadClient();
  const data = { atomicAmount: '9007199254740993123', priceUsd: null };
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ data, meta: { source: 'helius', stale: true } }),
      ),
    );
  vi.stubGlobal('fetch', fetchMock);
  const result = await client.apiGet('/v3/wallets/example');
  expect(result.data).toEqual(data);
  expect(result.meta).toMatchObject({
    source: 'helius',
    stale: true,
  });
  expect(result.meta.requestId).toEqual(expect.any(String));
  expect(fetchMock).toHaveBeenCalledWith(
    'http://iris.test/v3/wallets/example',
    expect.any(Object),
  );
  expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
});

test('rejects missing data and normalizes malformed metadata without an unchecked cast', async () => {
  const client = await loadClient();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ meta: {} })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: null, meta: 'invalid' })),
      ),
  );
  await expect(client.apiGet('/health')).rejects.toMatchObject({
    code: 'CONTRACT_ERROR',
  });
  const result = await client.apiGet('/health');
  expect(result.data).toBeNull();
  expect(result.meta).toMatchObject({
    source: 'live',
  });
  expect(result.meta.requestId).toEqual(expect.any(String));
});

test('preserves HTTP status and provider error diagnostics', async () => {
  const client = await loadClient();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'UPSTREAM_UNAVAILABLE',
            message: 'Provider unavailable',
          },
        }),
        { status: 502 },
      ),
    ),
  );
  const pending = client.apiGet('/v3/assets');
  await expect(pending).rejects.toMatchObject({
    code: 'UPSTREAM_UNAVAILABLE',
    message: 'Provider unavailable',
    status: 502,
  });
  await expect(pending).rejects.toHaveProperty('requestId', expect.any(String));
});

test('normalizes a rejected abort as the existing TIMEOUT error', async () => {
  const client = await loadClient();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
  );
  await expect(client.apiGet('/health')).rejects.toMatchObject({
    code: 'TIMEOUT',
  });
});

test('does not coerce object-shaped public error messages', async () => {
  const client = await loadClient();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { message: { private: 'not display text' } } },
          { status: 502 },
        ),
      ),
  );
  await expect(client.apiGet('/v3/assets')).rejects.toMatchObject({
    message: 'Worker request failed (502)',
    status: 502,
  });
});

test('missing deployment configuration fails before sending a request', async () => {
  vi.stubEnv('PROD', true);
  vi.stubEnv('VITE_API_BASE', '');
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const client = await import('../../../src/api/client');
  await expect(client.apiGet('/health')).rejects.toMatchObject({
    code: 'CONFIGURATION_ERROR',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test('an unknown rejection cannot escape the transport as a secondary type error', async () => {
  const client = await loadClient();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(null));
  await expect(client.apiGet('/health')).rejects.toMatchObject({
    code: 'NETWORK_ERROR',
    message: 'Unable to reach Worker',
  });
});
