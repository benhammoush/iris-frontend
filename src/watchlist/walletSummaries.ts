import { workerApi } from '../api/worker';
import type { AccountSession } from '../auth/session';
import { walletFrom } from '../data/normalizers';
import { isRecord } from '../data/record';
import { isSolanaAddress } from '../data/solana';

export interface WalletSummary {
  wallet: NonNullable<ReturnType<typeof walletFrom>>;
  asOf: string | null;
  stale: boolean;
}
export type WalletSummaryResult =
  { data: WalletSummary; error?: string } | { error: string; data?: never };

/** Public wallet reads stay anonymous, but their scheduling/results belong to this identity. */
export async function loadWalletSummaries(
  session: AccountSession,
  addresses: string[],
  signal: AbortSignal,
  publish: (address: string, result: WalletSummaryResult) => void,
) {
  const identity = session.capture();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  identity.signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted || identity.signal.aborted) abort();
  const current = () => !controller.signal.aborted && identity.isCurrent();
  const queue = [...new Set(addresses)].filter(isSolanaAddress).slice(0, 100);
  let index = 0;
  let unavailable = false;
  async function next() {
    while (index < queue.length && current()) {
      const address = queue[index++];
      if (unavailable) {
        publish(address, {
          error: 'Wallet summaries are temporarily unavailable. Retry later.',
        });
        continue;
      }
      try {
        const result = await workerApi.wallet(address, {
          signal: controller.signal,
        });
        const raw = isRecord(result.data)
          ? (result.data.wallet ?? result.data)
          : null;
        if (
          !isRecord(raw) ||
          raw.address !== address ||
          !Array.isArray(raw.balances) ||
          raw.balances.length > 100 ||
          !raw.balances.every(isRecord) ||
          !isRecord(raw.valuation)
        )
          throw new Error('Invalid wallet response');
        const wallet = walletFrom(result.data);
        if (!wallet || wallet.address !== address)
          throw new Error('Invalid wallet response');
        const freshness = isRecord(result.meta?.wallet)
          ? result.meta.wallet
          : {};
        const asOf =
          typeof freshness.asOf === 'string' &&
          Number.isFinite(Date.parse(freshness.asOf))
            ? freshness.asOf
            : null;
        if (current())
          publish(address, {
            data: {
              wallet,
              asOf,
              stale: freshness.stale === true || result.meta?.stale === true,
            },
          });
      } catch (cause) {
        if (
          isRecord(cause) &&
          (cause.status === 429 ||
            (typeof cause.status === 'number' && cause.status >= 500) ||
            ['RATE_LIMITED', 'TIMEOUT', 'NETWORK_ERROR'].includes(
              String(cause.code),
            ))
        )
          unavailable = true;
        if (current())
          publish(address, {
            error: unavailable
              ? 'Wallet summaries are temporarily unavailable. Retry later.'
              : 'Wallet summary could not be loaded. The saved reference is unchanged.',
          });
      }
    }
  }
  try {
    await Promise.all(
      Array.from({ length: Math.min(4, queue.length) }, () => next()),
    );
  } finally {
    signal.removeEventListener('abort', abort);
    identity.signal.removeEventListener('abort', abort);
  }
}
