/**
 * Handwritten application aliases for the generated API contract.
 * @packageDocumentation
 */

import type { components } from './generated';

/** Asset schema alias from the backend-owned generated API contract. */
export type WireAsset = components['schemas']['Asset'];
/** Response metadata alias from the backend-owned generated API contract. */
export type WireMeta = components['schemas']['Meta'];
/** Supported candle intervals from the backend-owned API contract. */
export type CandleTimeframe = components['parameters']['CandleTimeframe'];
/** Supported legacy history windows from the backend-owned API contract. */
export type HistoryRange = components['parameters']['HistoryRange'];
/** Mint identifier accepted by asset-resource callers. */
export type Mint = components['parameters']['Mint'];
/** Wallet identifier accepted by wallet-resource callers. */
export type WalletAddress = components['parameters']['WalletAddress'];
