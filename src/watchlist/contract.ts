import { ApiError } from '../api/client';
import { isRecord } from '../data/record';
import { isSolanaAddress } from '../data/solana';

export type WatchlistKind = 'asset' | 'wallet';
export interface WatchlistItem {
  address: string;
  savedAt: string;
}
export interface Watchlist {
  assets: WatchlistItem[];
  wallets: WatchlistItem[];
}
export const sectionFor = (kind: WatchlistKind) =>
  kind === 'asset' ? 'assets' : 'wallets';

function invalid(): never {
  throw new ApiError('Invalid watchlist response.', { code: 'CONTRACT_ERROR' });
}
function itemFrom(value: unknown): WatchlistItem {
  if (
    !isRecord(value) ||
    !isSolanaAddress(value.address) ||
    typeof value.savedAt !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.savedAt) ||
    !Number.isFinite(Date.parse(value.savedAt)) ||
    new Date(value.savedAt).toISOString() !== value.savedAt
  )
    invalid();
  return { address: value.address, savedAt: value.savedAt };
}
export function sorted(items: WatchlistItem[]): WatchlistItem[] {
  return [...items].sort((a, b) =>
    a.savedAt === b.savedAt
      ? a.address < b.address
        ? -1
        : a.address > b.address
          ? 1
          : 0
      : a.savedAt > b.savedAt
        ? -1
        : 1,
  );
}
export function watchlistFrom(value: unknown): Watchlist {
  if (!isRecord(value)) invalid();
  const section = (value: unknown) => {
    if (!Array.isArray(value) || value.length > 100) invalid();
    const items = value.map(itemFrom);
    if (new Set(items.map((item) => item.address)).size !== items.length)
      invalid();
    return sorted(items);
  };
  return { assets: section(value.assets), wallets: section(value.wallets) };
}
export function savedItemFrom(
  value: unknown,
  kind: WatchlistKind,
  address: string,
): WatchlistItem {
  if (!isRecord(value) || value.kind !== kind || value.address !== address)
    invalid();
  return itemFrom(value);
}
export function removedFrom(value: unknown): void {
  if (!isRecord(value) || value.removed !== true) invalid();
}
