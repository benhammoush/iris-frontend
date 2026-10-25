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

/** Use the explicitly configured fixture path without treating live-provider failure as fixture success.
 * @param path - Public Worker resource path.
 * @param fixture - Fallback data allowed only when fixture mode was explicitly enabled.
 * @param options - Caller cancellation signal and deadline.
 * @returns Live resource data, or clearly marked stale fixture data in explicit fixture mode.
 */
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
  /** Request the asset collection using the configured live or explicit fixture path.
   * @param options - Caller cancellation signal and deadline.
   * @returns The asset collection with resource metadata.
   */
  assets: (options?: ApiGetOptions) =>
    withFixture('/v3/assets', fixtures.assets, options),
  /** Request discovery catalogs using the configured live or explicit fixture path.
   * @param options - Caller cancellation signal and deadline.
   * @returns Discovery collections with resource metadata.
   */
  catalogs: (options?: ApiGetOptions) =>
    withFixture(
      '/v3/catalogs',
      { topTraded: fixtures.assets, trending: [], recent: [] },
      options,
    ),
  /** Request asset details without history using the configured live or explicit fixture path.
   * @param mint - Solana mint identity to encode in the route.
   * @param options - Caller cancellation signal and deadline.
   * @returns Asset details with resource metadata, without historical candles.
   */
  asset: (mint: Mint, options?: ApiGetOptions) =>
    withFixture(
      `/v3/assets/mint/${encodeURIComponent(mint)}?includeHistory=false`,
      fixtures.assets.find((asset) => asset.mint === mint) || null,
      options,
    ),
  /** Request on-chain details for the encoded mint identity.
   * @param mint - Solana mint identity.
   * @param options - Caller cancellation signal and deadline.
   * @returns On-chain asset details with response metadata.
   */
  assetOnchain: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(`/v3/assets/mint/${encodeURIComponent(mint)}/onchain`, options),
  /** Request the specified holder page for the encoded mint identity.
   * @param mint - Solana mint identity.
   * @param page - One-based holder page.
   * @param options - Caller cancellation signal and deadline.
   * @returns The requested holder page with response metadata.
   */
  assetHolders: (mint: Mint, page = 1, options?: ApiGetOptions) =>
    apiGet(
      `/v3/assets/mint/${encodeURIComponent(mint)}/holders?page=${page}`,
      options,
    ),
  /** Request the largest-account distribution for the encoded mint identity.
   * @param mint - Solana mint identity.
   * @param options - Caller cancellation signal and deadline.
   * @returns Largest-account distribution with response metadata.
   */
  assetDistribution: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(`/v3/assets/mint/${encodeURIComponent(mint)}/distribution`, options),
  /** Request the bounded transaction list for the encoded mint identity.
   * @param mint - Solana mint identity.
   * @param options - Caller cancellation signal and deadline.
   * @returns At most fifty asset transactions with response metadata.
   */
  assetTransactions: (mint: Mint, options?: ApiGetOptions) =>
    apiGet(
      `/v3/assets/mint/${encodeURIComponent(mint)}/transactions?limit=50`,
      options,
    ),
  /** Request asset history for the selected legacy range.
   * @param mint - Solana mint identity.
   * @param range - Supported legacy history range.
   * @param options - Caller cancellation signal and deadline.
   * @returns Historical asset points with response metadata.
   */
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
  /** Request asset candles for the selected timeframe and optional preceding-window boundary.
   * @param mint - Solana mint identity.
   * @param timeframe - Supported candle interval.
   * @param options - Caller cancellation signal and deadline.
   * @param before - Optional exclusive earlier-history boundary in Unix seconds.
   * @returns A candle window with freshness and pagination metadata.
   */
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
  /** Request supported swaps using the configured live or explicit fixture path.
   * @param options - Caller cancellation signal and deadline.
   * @returns Supported swap records with resource metadata.
   */
  swaps: (options?: ApiGetOptions) =>
    withFixture('/v3/swaps', fixtures.swaps, options),
  /** Request network metrics using the configured live or explicit fixture path.
   * @param options - Caller cancellation signal and deadline.
   * @returns Available network metrics with resource metadata.
   */
  network: (options?: ApiGetOptions) =>
    withFixture('/v3/network', null, options),
  /** Request the normalized external dashboard from the Worker.
   * @param options - Caller cancellation signal and deadline.
   * @returns Supported dashboard collections and response metadata.
   */
  defillama: (options?: ApiGetOptions) => apiGet('/v3/defillama', options),
  /** Request the bounded recent-transaction sample with the supplied cancellation options.
   * @param options - Sample limit plus cancellation signal and deadline.
   * @returns A recent-transaction sample, not a complete network transaction history.
   */
  recentTransactions: (options: RecentTransactionOptions = {}) => {
    const { limit = 15, ...requestOptions } = options;
    return apiGet(`/v3/transactions/recent?limit=${limit}`, requestOptions);
  },
  /** Request the wallet resource for the encoded address.
   * @param address - Solana wallet identity.
   * @param options - Caller cancellation signal and deadline.
   * @returns Wallet holdings and available valuation with response metadata.
   */
  wallet: (address: WalletAddress, options?: ApiGetOptions) =>
    apiGet(`/v3/wallets/${encodeURIComponent(address)}`, options),
  /** Request one bounded wallet transaction page with its optional continuation cursor.
   * @param address - Solana wallet identity.
   * @param options - Cursor, page limit, cancellation signal and deadline.
   * @returns One transaction page and its continuation metadata.
   */
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
