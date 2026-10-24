/**
 * Typed Worker resource requests and explicit fixture selection.
 * @packageDocumentation
 */

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

/** Recent-transaction request limit plus transport cancellation and deadline controls. */
export interface RecentTransactionOptions extends ApiGetOptions {
  limit?: number;
}

/** Wallet transaction cursor and limit plus transport controls. */
export interface WalletTransactionOptions extends RecentTransactionOptions {
  cursor?: string | null;
}

// Endpoint JSON remains unknown until the endpoint normalizer validates it.
/** Worker resource result retaining its data and freshness metadata. */
export type WorkerResult = ResourceResult<unknown, Record<string, unknown>>;

const fixturesEnabled = import.meta.env.VITE_ENABLE_FIXTURES === 'true';

/** Use the explicitly configured fixture path without treating live-provider failure as fixture success. */
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
  /** Request the asset collection using the configured live or explicit fixture path. */
  assets: (options?: ApiGetOptions) =>
    withFixture('/v3/assets', fixtures.assets, options),
  /** Request discovery catalogs using the configured live or explicit fixture path. */
  catalogs: (options?: ApiGetOptions) =>
    withFixture(
      '/v3/catalogs',
      { topTraded: fixtures.assets, trending: [], recent: [] },
      options,
    ),
  /** Request asset details without history using the configured live or explicit fixture path. */
  asset: (mint: Mint, options?: ApiGetOptions) =>
    withFixture(
      `/v3/assets/mint/${encodeURIComponent(mint)}?includeHistory=false`,
      fixtures.assets.find((asset) => asset.mint === mint) || null,
      options,
    ),
  /** Request on-chain details for the encoded mint identity. */
  assetOnchain: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(`/v3/assets/mint/${encodeURIComponent(mint)}/onchain`, options),
  /** Request the specified holder page for the encoded mint identity. */
  assetHolders: (mint: Mint, page = 1, options?: ApiGetOptions) =>
    apiGet(
      `/v3/assets/mint/${encodeURIComponent(mint)}/holders?page=${page}`,
      options,
    ),
  /** Request the largest-account distribution for the encoded mint identity. */
  assetDistribution: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(`/v3/assets/mint/${encodeURIComponent(mint)}/distribution`, options),
  /** Request the bounded transaction list for the encoded mint identity. */
  assetTransactions: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(
      `/v3/assets/mint/${encodeURIComponent(mint)}/transactions?limit=50`,
      options,
    ),
  /** Request asset history for the selected legacy range. */
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
  /** Request asset candles for the selected timeframe and optional preceding-window boundary. */
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
  /** Request supported swaps using the configured live or explicit fixture path. */
  swaps: (options?: ApiGetOptions) =>
    withFixture('/v3/swaps', fixtures.swaps, options),
  /** Request network metrics using the configured live or explicit fixture path. */
  network: (options?: ApiGetOptions) =>
    withFixture('/v3/network', null, options),
  /** Request the normalized external dashboard from the Worker. */
  defillama: (options?: ApiGetOptions) => apiGet('/v3/defillama', options),
  /** Request the bounded recent-transaction sample with the supplied cancellation options. */
  recentTransactions: (options: RecentTransactionOptions = {}) => {
    const { limit = 15, ...requestOptions } = options;
    return apiGet(`/v3/transactions/recent?limit=${limit}`, requestOptions);
  },
  /** Request the wallet resource for the encoded address. */
  wallet: (address: WalletAddress, options?: ApiGetOptions) =>
    apiGet(`/v3/wallets/${encodeURIComponent(address)}`, options),
  /** Request one bounded wallet transaction page with its optional continuation cursor. */
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
