/**
 * Handwritten application aliases for the generated API contract.
 * @packageDocumentation
 */

import type { components } from './generated';

/** Parameter values without the generator's optional-query-property marker. */
type ParameterValues = Required<components['parameters']>;

/** Asset schema alias from the backend-owned generated API contract. */
export type WireAsset = components['schemas']['Asset'];
/** Response metadata alias from the backend-owned generated API contract. */
export type WireMeta = components['schemas']['Meta'];
/** Supported candle intervals from the backend-owned API contract. */
export type CandleTimeframe = ParameterValues['CandleTimeframe'];
/** Supported legacy history windows from the backend-owned API contract. */
export type HistoryRange = ParameterValues['HistoryRange'];
/** Mint identifier accepted by asset-resource callers. */
export type Mint = ParameterValues['Mint'];
/** Wallet identifier accepted by wallet-resource callers. */
export type WalletAddress = ParameterValues['WalletAddress'];
