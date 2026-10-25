/**
 * Regression coverage and controlled fixtures for worker.
 * @packageDocumentation
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

describe('worker fixture behavior', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('surfaces Worker HTTP errors when fixtures are not enabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          /** Return the controlled JSON payload for this provider-response fixture. */
          json: () => Promise.resolve({ error: { message: 'Unavailable' } }),
        }),
      ),
    );
    const { workerApi } = await import('../../../src/api/worker');

    await expect(workerApi.assets()).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 503,
    });
  });

  test('uses emergency fixtures only when explicitly enabled', async () => {
    vi.stubEnv('VITE_ENABLE_FIXTURES', 'true');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          /** Return the controlled JSON payload for this provider-response fixture. */
          json: () => Promise.resolve({}),
        }),
      ),
    );
    const { workerApi } = await import('../../../src/api/worker');

    await expect(workerApi.assets()).resolves.toMatchObject({
      data: expect.any(Array),
      meta: { source: 'fixture', stale: true },
    });
  });

  test('uses v3 asset, candle, DefiLlama, global swaps, recent transactions, and canonical wallet transaction routes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          /** Return the controlled JSON payload for this provider-response fixture. */
          json: () => Promise.resolve({ data: {} }),
        }),
      ),
    );
    const { workerApi } = await import('../../../src/api/worker');

    await workerApi.asset('MintCaseSensitive123');
    await workerApi.assetOnchain('MintCaseSensitive123');
    await workerApi.assetHolders('MintCaseSensitive123', 2);
    await workerApi.assetTransactions('MintCaseSensitive123');
    await workerApi.assetHistory('MintCaseSensitive123', '1d');
    await workerApi.assetCandles('MintCaseSensitive123', '4H');
    await workerApi.assetCandles(
      'MintCaseSensitive123',
      '4H',
      undefined,
      1760000000,
    );
    await workerApi.swaps();
    await workerApi.defillama();
    await workerApi.recentTransactions();
    await workerApi.wallet('WalletCaseSensitive123');
    await workerApi.walletTransactions('WalletCaseSensitive123', {
      cursor: 'next-page',
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/v3/assets/mint/MintCaseSensitive123'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('?includeHistory=false'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/onchain'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/holders?page=2'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('/transactions?limit=50'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining(
        '/v3/assets/mint/MintCaseSensitive123/history?range=1d',
      ),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining(
        '/v3/assets/mint/MintCaseSensitive123/candles?timeframe=4H',
      ),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining('before=1760000000'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      8,
      expect.stringContaining('/v3/swaps'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      9,
      expect.stringContaining('/v3/defillama'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      10,
      expect.stringContaining('/v3/transactions/recent?limit=15'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      11,
      expect.stringContaining('/v3/wallets/WalletCaseSensitive123'),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      12,
      expect.stringContaining(
        '/v3/wallets/WalletCaseSensitive123/transactions?',
      ),
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      12,
      expect.stringContaining('cursor=next-page'),
      expect.any(Object),
    );
  });

  test('encodes opaque identity/cursor values and forwards transport options', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(JSON.stringify({ data: {} })),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { workerApi } = await import('../../../src/api/worker');
    const controller = new AbortController();
    await workerApi.asset('Mint/Case+Sensitive?', {
      signal: controller.signal,
      timeoutMs: 500,
    });
    await workerApi.walletTransactions('Wallet/Case', {
      cursor: 'Opaque+/=?Case',
      limit: 7,
      signal: controller.signal,
    });
    await workerApi.recentTransactions({ limit: 3 });
    await workerApi.assetDistribution('Mint/Case');
    await workerApi.catalogs();
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls[0]?.pathname).toBe(
      '/v3/assets/mint/Mint%2FCase%2BSensitive%3F',
    );
    expect(urls[1]?.pathname).toBe('/v3/wallets/Wallet%2FCase/transactions');
    expect(urls[1]?.searchParams.get('cursor')).toBe('Opaque+/=?Case');
    expect(urls[1]?.searchParams.get('limit')).toBe('7');
    expect(urls[2]?.searchParams.get('limit')).toBe('3');
    expect(urls[3]?.pathname).toBe('/v3/assets/mint/Mint%2FCase/distribution');
    expect(urls[4]?.pathname).toBe('/v3/catalogs');
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(controller.signal.aborted).toBe(false);
  });

  test('emergency fixtures retain failure diagnostics and never price missing values', async () => {
    vi.stubEnv('VITE_ENABLE_FIXTURES', 'true');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Unavailable' },
          }),
          { status: 503 },
        ),
      ),
    );
    const { workerApi } = await import('../../../src/api/worker');
    const result = await workerApi.assets();
    expect(result.error).toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      status: 503,
    });
    expect(result.meta).toMatchObject({
      source: 'fixture',
      stale: true,
      requestId: expect.any(String),
    });
    expect(result.data).toEqual([
      expect.objectContaining({
        priceUsd: null,
        marketCapUsd: null,
        totalSupply: null,
      }),
    ]);
    await expect(workerApi.asset('unknown-mint')).resolves.toMatchObject({
      data: null,
    });
    // Wallet/provider-only routes must not invent an emergency response.
    await expect(workerApi.wallet('WalletCase')).rejects.toMatchObject({
      status: 503,
    });
  });
});
