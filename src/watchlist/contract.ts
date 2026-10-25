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
/** Resolve the watchlist collection corresponding to the supported resource kind.
 * @param kind - Saved asset or wallet resource kind.
 * @returns The corresponding watchlist collection name.
 */
export const sectionFor = (kind: WatchlistKind) =>
  kind === 'asset' ? 'assets' : 'wallets';

/** Construct the fixed error for an invalid boundary value. */
function invalid(): never {
  throw new ApiError('Invalid watchlist response.', { code: 'CONTRACT_ERROR' });
}
/** Validate one saved item before accepting it into account-scoped state.
 * @param value - Unknown saved-item response.
 * @returns A validated saved item, rejecting malformed identities or timestamps.
 */
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
/** Return watchlist items in deterministic display order.
 * @param items - Validated saved items; the original array is not mutated.
 * @returns A sorted copy using save time and stable identity ordering.
 */
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
/** Validate the complete private watchlist response before publishing it.
 * @param value - Unknown private watchlist response payload.
 * @returns A validated bounded watchlist with deterministic item ordering.
 */
export function watchlistFrom(value: unknown): Watchlist {
  if (!isRecord(value)) invalid();
  /** Resolve the supported watchlist section and reject malformed section data.
   * @param value - Unknown asset or wallet section.
   * @returns Its validated, bounded and sorted saved items.
   */
  const section = (value: unknown) => {
    if (!Array.isArray(value) || value.length > 100) invalid();
    const items = value.map(itemFrom);
    if (new Set(items.map((item) => item.address)).size !== items.length)
      invalid();
    return sorted(items);
  };
  return { assets: section(value.assets), wallets: section(value.wallets) };
}
/** Validate a save response against the requested kind and address.
 * @param value - Unknown save-response payload.
 * @param kind - Resource kind requested by the mutation.
 * @param address - Exact resource identity requested by the mutation.
 * @returns The validated saved item matching the request.
 */
export function savedItemFrom(
  value: unknown,
  kind: WatchlistKind,
  address: string,
): WatchlistItem {
  if (!isRecord(value) || value.kind !== kind || value.address !== address)
    invalid();
  return itemFrom(value);
}
/** Validate the private removal response before accepting mutation success.
 * @param value - Unknown removal-response payload.
 */
export function removedFrom(value: unknown): void {
  if (!isRecord(value) || value.removed !== true) invalid();
}
