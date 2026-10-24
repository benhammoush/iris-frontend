/**
 * Runtime validation of private watchlist responses and item identity.
 * @packageDocumentation
 */

import { ApiError } from '../api/client';
import { isRecord } from '../data/record';
import { isSolanaAddress } from '../data/solana';

/** Supported saved-resource kinds; part of each item identity. */
export type WatchlistKind = 'asset' | 'wallet';
/** Validated saved resource with its stable address identity. */
export interface WatchlistItem {
  address: string;
  savedAt: string;
}
/** Validated private collections of saved assets and wallets. */
export interface Watchlist {
  assets: WatchlistItem[];
  wallets: WatchlistItem[];
}
/** Resolve the watchlist collection corresponding to the supported resource kind. */
export const sectionFor = (kind: WatchlistKind) =>
  kind === 'asset' ? 'assets' : 'wallets';

/** Construct the fixed error for an invalid boundary value. */
function invalid(): never {
  throw new ApiError('Invalid watchlist response.', { code: 'CONTRACT_ERROR' });
}
/** Validate one saved item before accepting it into account-scoped state. */
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
/** Return watchlist items in deterministic display order. */
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
/** Validate the complete private watchlist response before publishing it. */
export function watchlistFrom(value: unknown): Watchlist {
  if (!isRecord(value)) invalid();
  /** Resolve the supported watchlist section and reject malformed section data. */
  const section = (value: unknown) => {
    if (!Array.isArray(value) || value.length > 100) invalid();
    const items = value.map(itemFrom);
    if (new Set(items.map((item) => item.address)).size !== items.length)
      invalid();
    return sorted(items);
  };
  return { assets: section(value.assets), wallets: section(value.wallets) };
}
/** Validate a save response against the requested kind and address. */
export function savedItemFrom(
  value: unknown,
  kind: WatchlistKind,
  address: string,
): WatchlistItem {
  if (!isRecord(value) || value.kind !== kind || value.address !== address)
    invalid();
  return itemFrom(value);
}
/** Validate the private removal response before accepting mutation success. */
export function removedFrom(value: unknown): void {
  if (!isRecord(value) || value.removed !== true) invalid();
}
