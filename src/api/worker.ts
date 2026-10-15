import { apiGet, type ApiGetOptions } from './client';
import { fixtures } from '../data/fixtures';
import { isRecord } from '../data/record';
import type { ResourceResult } from '../hooks/useWorkerResource';
import type {
  CandleTimeframe,
  HistoryRange,
  Mint,
  WalletAddress,
} from './contracts';

export interface RecentTransactionOptions extends ApiGetOptions {
  limit?: number;
}

export interface WalletTransactionOptions extends RecentTransactionOptions {
  cursor?: string | null;
}

// Endpoint JSON remains unknown until the endpoint normalizer validates it.
export type WorkerResult = ResourceResult<unknown, Record<string, unknown>>;

const fixturesEnabled = import.meta.env.VITE_ENABLE_FIXTURES === 'true';

async function withFixture(
  path: string,
  fixture: unknown,
  options?: ApiGetOptions,
): Promise<WorkerResult> {
  try {
    return await apiGet(path, options);
  } catch (error: unknown) {
    if (!fixturesEnabled) throw error;
    return {
      data: fixture,
      error,
      meta: {
        source: 'fixture',
        stale: true,
        requestId: isRecord(error) ? error.requestId : undefined,
      },
    };
  }
}

export const workerApi = {
  assets: (options?: ApiGetOptions) =>
    withFixture('/v3/assets', fixtures.assets, options),
  catalogs: (options?: ApiGetOptions) =>
    withFixture(
      '/v3/catalogs',
      { topTraded: fixtures.assets, trending: [], recent: [] },
      options,
    ),
  asset: (mint: Mint, options?: ApiGetOptions) =>
    withFixture(
      `/v3/assets/mint/${encodeURIComponent(mint)}?includeHistory=false`,
      fixtures.assets.find((asset) => asset.mint === mint) || null,
      options,
    ),
  assetOnchain: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(`/v3/assets/mint/${encodeURIComponent(mint)}/onchain`, options),
  assetHolders: (mint: Mint, page = 1, options?: ApiGetOptions) =>
    apiGet(
      `/v3/assets/mint/${encodeURIComponent(mint)}/holders?page=${page}`,
      options,
    ),
  assetDistribution: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(`/v3/assets/mint/${encodeURIComponent(mint)}/distribution`, options),
  assetTransactions: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(
      `/v3/assets/mint/${encodeURIComponent(mint)}/transactions?limit=50`,
      options,
    ),
  assetHistory: (
    mint: Mint,
    range: HistoryRange = '7d',
    options?: ApiGetOptions,
  ) =>
    withFixture(
      `/v3/assets/mint/${encodeURIComponent(mint)}/history?range=${range}`,
      [],
      options,
    ),
  assetCandles: (
    mint: Mint,
    timeframe: CandleTimeframe = '1H',
    options?: ApiGetOptions,
    before: number | null = null,
  ) =>
    withFixture(
      `/v3/assets/mint/${encodeURIComponent(mint)}/candles?${new URLSearchParams({ timeframe, ...(before === null ? {} : { before: String(before) }) })}`,
      { candles: [] },
      options,
    ),
  swaps: (options?: ApiGetOptions) =>
    withFixture('/v3/swaps', fixtures.swaps, options),
  network: (options?: ApiGetOptions) =>
    withFixture('/v3/network', null, options),
  defillama: (options?: ApiGetOptions) => apiGet('/v3/defillama', options),
  recentTransactions: (options: RecentTransactionOptions = {}) => {
    const { limit = 15, ...requestOptions } = options;
    return apiGet(`/v3/transactions/recent?limit=${limit}`, requestOptions);
  },
  wallet: (address: WalletAddress, options?: ApiGetOptions) =>
    apiGet(`/v3/wallets/${encodeURIComponent(address)}`, options),
  walletTransactions: (
    address: WalletAddress,
    options: WalletTransactionOptions = {},
  ) => {
    const { cursor, limit = 25, ...requestOptions } = options;
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set('cursor', cursor);
    return apiGet(
      `/v3/wallets/${encodeURIComponent(address)}/transactions?${query}`,
      requestOptions,
    );
  },
};
