/**
 * Runtime response normalization with explicit unavailable-value semantics.
 * @packageDocumentation
 */

import { isRecord } from './record';
import type { WireAsset } from '../api/contracts';

/** UI-safe normalized asset fields with nullable unavailable metrics. */
export type AssetView = Pick<
  WireAsset,
  | 'priceUsd'
  | 'marketCapUsd'
  | 'change24hPct'
  | 'circulatingSupply'
  | 'totalSupply'
  | 'fullyDilutedValuationUsd'
  | 'liquidityUsd'
  | 'holderCount'
> & {
  [key: string]: unknown;
  mint: string;
  symbol: WireAsset['symbol'] | undefined;
  name: WireAsset['name'] | undefined;
  imageUrl: WireAsset['iconUrl'] | undefined;
  decimals: WireAsset['decimals'] | undefined;
  activity: WireAsset['activity'];
  quality: {
    organicScore: WireAsset['quality']['organicScore'];
    organicScoreLabel: WireAsset['quality']['organicScoreLabel'] | undefined;
    audit: Record<string, unknown>;
  };
  verification: Partial<WireAsset['verification']> & { tags: string[] };
};

/** Narrow an unknown boundary value to a record, using an empty record when it is not an object.
 * @param value - Unknown response value.
 * @returns A non-array object record, or an empty record.
 */
function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/** Normalize an unknown collection to an array before iterating it.
 * @param value - Unknown collection field.
 * @returns The array with unknown elements, or an empty collection.
 */
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Normalize a supported text field from untrusted response data.
 * @param value - Unknown response field.
 * @returns String text without coercion, or undefined for other types.
 */
function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Accept numeric primitives without coercion; other input types remain undefined.
 * @param value - Unknown response field.
 * @returns The numeric primitive, or undefined without accepting numeric strings.
 */
function number(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/** Map nonnumeric input types to null without coercing numeric strings.
 * @param value - Unknown response metric.
 * @returns Its numeric primitive or the explicit unavailable marker.
 */
function nullableNumber(value: unknown): number | null {
  return number(value) ?? null;
}

/** Normalize the response asset collection into UI-safe asset records.
 * @param data - Unknown asset collection or response containing an assets field.
 * @returns Mint-identified assets with unsupported metrics marked unavailable.
 */
export function assetsFrom(data: unknown): AssetView[] {
  const items = Array.isArray(data) ? array(data) : array(record(data).assets);
  return items
    .filter(
      (asset): asset is Record<string, unknown> & { mint: string } =>
        isRecord(asset) && typeof asset.mint === 'string',
    )
    .map((asset) => ({
      ...asset,
      mint: asset.mint,
      symbol: asset.symbol === null ? null : text(asset.symbol),
      name:
        text(asset.name) || (asset.symbol === null ? null : text(asset.symbol)),
      imageUrl: asset.iconUrl === null ? null : text(asset.iconUrl),
      priceUsd: nullableNumber(asset.priceUsd),
      marketCapUsd: nullableNumber(asset.marketCapUsd),
      change24hPct: nullableNumber(asset.change24hPct),
      circulatingSupply: nullableNumber(asset.circulatingSupply),
      totalSupply: nullableNumber(asset.totalSupply),
      fullyDilutedValuationUsd: nullableNumber(asset.fullyDilutedValuationUsd),
      liquidityUsd: nullableNumber(asset.liquidityUsd),
      holderCount: nullableNumber(asset.holderCount),
      decimals: number(asset.decimals),
      activity: {
        ...record(asset.activity),
        buyVolume24hUsd: nullableNumber(record(asset.activity).buyVolume24hUsd),
        sellVolume24hUsd: nullableNumber(
          record(asset.activity).sellVolume24hUsd,
        ),
        volume24hUsd: nullableNumber(record(asset.activity).volume24hUsd),
      },
      quality: {
        ...record(asset.quality),
        organicScore: nullableNumber(record(asset.quality).organicScore),
        organicScoreLabel: text(record(asset.quality).organicScoreLabel),
        audit: record(record(asset.quality).audit),
      },
      verification: {
        ...record(asset.verification),
        isVerified:
          typeof record(asset.verification).isVerified === 'boolean'
            ? record(asset.verification).isVerified === true
            : undefined,
        tags: array(record(asset.verification).tags).filter(
          (tag): tag is string => typeof tag === 'string',
        ),
      },
    }));
}

/** Normalize wallet response data while preserving unavailable balances and valuation.
 * @param data - Unknown wallet payload or wallet envelope.
 * @returns Normalized wallet fields, or null when no wallet record is present.
 */
export function walletFrom(data: unknown) {
  const wallet = record(data).wallet || data;
  if (!isRecord(wallet)) return null;
  const valuation = record(wallet.valuation);
  return {
    ...wallet,
    address: text(wallet.address),
    label: text(wallet.label) || text(wallet.address),
    description: text(wallet.description) || '',
    totalValue: nullableNumber(valuation.pricedSubtotalUsd),
    valuation: {
      ...valuation,
      pricedSubtotalUsd: nullableNumber(valuation.pricedSubtotalUsd),
      holdingCount: number(valuation.holdingCount),
      pricedHoldingCount: number(valuation.pricedHoldingCount),
      unpricedHoldingCount: number(valuation.unpricedHoldingCount),
      complete: valuation.complete === true,
    },
    truncated: Boolean(wallet.holdingsTruncated),
    assets: array(wallet.balances)
      .filter(isRecord)
      .map((asset) => ({
        ...asset,
        symbol: asset.symbol === null ? null : text(asset.symbol),
        name:
          text(asset.name) ||
          (asset.symbol === null ? null : text(asset.symbol)),
        mint: text(asset.mint),
        imageUrl: asset.iconUrl === null ? null : text(asset.iconUrl),
        atomicAmount: text(asset.atomicAmount),
        rawBalance:
          typeof asset.rawBalance === 'string'
            ? asset.rawBalance
            : number(asset.rawBalance),
        balance:
          typeof asset.balance === 'string'
            ? asset.balance
            : number(asset.balance),
        amount: text(asset.amount),
        decimals: number(asset.decimals),
        displayBalance: text(asset.displayBalance),
        price: nullableNumber(asset.priceUsd),
        value: nullableNumber(asset.valueUsd),
      })),
    transactions: array(wallet.transactions || wallet.events)
      .filter(isRecord)
      .map(transactionFrom),
  };
}

/** Normalize the response transaction collection for UI consumers.
 * @param data - Unknown transaction collection, events envelope or transaction page.
 * @returns Supported transaction records, discarding non-object entries.
 */
export function transactionsFrom(data: unknown) {
  const page = record(data).transactions || record(data).events || data;
  return array(page).filter(isRecord).map(transactionFrom);
}

/** Normalize recent transaction samples and their supported display fields.
 * @param data - Unknown recent-transaction sample envelope.
 * @returns Displayable sample records without inventing a complete transaction history.
 */
export function recentTransactionsFrom(data: unknown) {
  const transactions = array(record(data).transactions);
  return transactions.flatMap((transaction) => {
    if (
      !isRecord(transaction) ||
      typeof transaction.signature !== 'string' ||
      !transaction.signature
    )
      return [];
    return [
      {
        signature: transaction.signature,
        slot:
          typeof transaction.slot === 'number' &&
          Number.isInteger(transaction.slot) &&
          transaction.slot >= 0
            ? transaction.slot
            : null,
        blockTime:
          typeof transaction.blockTime === 'string' &&
          Number.isFinite(Date.parse(transaction.blockTime))
            ? transaction.blockTime
            : null,
        status: transaction.status === 'confirmed' ? 'confirmed' : null,
        action:
          typeof transaction.action === 'string' && transaction.action
            ? transaction.action
            : null,
      },
    ];
  });
}

/** Normalize one transaction record from an unknown response value.
 * @param transaction - Object-shaped transaction whose individual fields remain unknown.
 * @returns Supported transaction fields and normalized transfers.
 */
function transactionFrom(transaction: Record<string, unknown>) {
  return {
    ...transaction,
    timestamp: text(transaction.timestamp),
    id: text(transaction.id),
    type: text(transaction.type) || 'Activity',
    source: text(transaction.source),
    status: text(transaction.status),
    description: text(transaction.description),
    transfers: transfersFrom(transaction.transfers),
  };
}

/** Normalize one supported transfer and its direction.
 * @param transfer - Object-shaped transfer whose individual fields remain unknown.
 * @param kind - Native-SOL or token transfer classification.
 * @returns Supported transfer fields, preserving source quantities for display.
 */
function transferFrom(
  transfer: Record<string, unknown>,
  kind: 'native' | 'token',
) {
  return {
    ...transfer,
    symbol:
      kind === 'native'
        ? text(transfer.symbol) || 'SOL'
        : text(transfer.symbol),
    mint: text(transfer.mint),
    amount:
      typeof transfer.amount === 'number'
        ? transfer.amount
        : text(transfer.amount),
    atomicAmount: text(transfer.atomicAmount),
    decimals: number(transfer.decimals),
    from: transfer.from === null ? null : text(transfer.from),
    to: transfer.to === null ? null : text(transfer.to),
    kind,
  };
}

/** Normalize supported transfers without accepting malformed entries.
 * @param transfers - Unknown transfer list or grouped transfer collection.
 * @returns Supported native and token transfer records.
 */
function transfersFrom(transfers: unknown) {
  if (Array.isArray(transfers))
    return array(transfers)
      .filter(isRecord)
      .map((transfer) =>
        transferFrom(
          transfer,
          transfer.kind === 'native' ||
            (!transfer.kind && !transfer.mint && transfer.symbol === 'SOL')
            ? 'native'
            : 'token',
        ),
      );
  if (!isRecord(transfers)) return [];
  const native = array(transfers.native)
    .filter(isRecord)
    .map((transfer) => transferFrom({ ...transfer, symbol: 'SOL' }, 'native'));
  const tokens = array(transfers.tokens)
    .filter(isRecord)
    .map((transfer) => transferFrom(transfer, 'token'));
  return [...native, ...tokens];
}

/** Normalize asset candle data into the chart contract.
 * @param data - Unknown candle response envelope.
 * @returns Candle records with supported timestamps and OHLC fields.
 */
export function assetCandlesFrom(data: unknown) {
  const candles = array(record(data).candles);
  return candles.flatMap((candle) => {
    if (!isRecord(candle)) return [];
    const timestamp =
      typeof candle?.timestamp === 'string' &&
      Number.isFinite(Date.parse(candle.timestamp))
        ? candle.timestamp
        : null;
    const values = [
      'openUsd',
      'highUsd',
      'lowUsd',
      'closeUsd',
      'volumeUsd',
    ].map((field) => Number(candle?.[field]));
    const [openUsd, highUsd, lowUsd, closeUsd, volumeUsd] = values;
    return timestamp &&
      values.every(Number.isFinite) &&
      highUsd >= openUsd &&
      highUsd >= closeUsd &&
      lowUsd <= openUsd &&
      lowUsd <= closeUsd
      ? [{ timestamp, openUsd, highUsd, lowUsd, closeUsd, volumeUsd }]
      : [];
  });
}

/** Normalize account distribution data into table records.
 * @param data - Unknown distribution response envelope.
 * @returns Object-shaped account records accepted for the distribution table.
 */
export function assetDistributionFrom(data: unknown) {
  const accounts = array(record(data).accounts);
  return accounts.flatMap((account) =>
    isRecord(account) &&
    typeof account.rank === 'number' &&
    Number.isInteger(account.rank) &&
    typeof account?.tokenAccount === 'string' &&
    typeof account?.amount === 'string'
      ? [
          {
            rank: account.rank,
            tokenAccount: account.tokenAccount,
            owner: typeof account.owner === 'string' ? account.owner : null,
            amount: account.amount,
            supplyPercent:
              typeof account.supplyPercent === 'string'
                ? account.supplyPercent
                : null,
            frozen: typeof account.frozen === 'boolean' ? account.frozen : null,
          },
        ]
      : [],
  );
}

/** Normalized asset transaction identity and display fields. */
export interface MintTransaction {
  signature: string;
  timestamp: string | null;
  action: string | null;
  protocol: string | null;
  summary: string | null;
  transferIndex: number;
  sender: string | null;
  recipient: string | null;
  amount: string | null;
}

/** Normalize asset transaction data into supported transaction rows.
 * @param data - Unknown asset transaction response envelope.
 * @returns Transactions satisfying the supported mint-transaction display contract.
 */
export function assetTransactionsFrom(data: unknown): MintTransaction[] {
  const transactions = array(record(data).transactions);
  return transactions.flatMap<MintTransaction>((transaction) => {
    if (!isRecord(transaction) || typeof transaction.signature !== 'string')
      return [];
    const base = {
      signature: transaction.signature,
      timestamp:
        typeof transaction.timestamp === 'string'
          ? transaction.timestamp
          : null,
      action:
        typeof transaction.action === 'string' ? transaction.action : null,
      protocol:
        typeof transaction.protocol === 'string' ? transaction.protocol : null,
      summary:
        typeof transaction.summary === 'string' ? transaction.summary : null,
    };
    const transfers = Array.isArray(transaction.transfers)
      ? array(transaction.transfers).flatMap((transfer) =>
          isRecord(transfer) && typeof transfer.amount === 'string'
            ? [
                {
                  amount: transfer.amount,
                  from:
                    typeof transfer.from === 'string' ? transfer.from : null,
                  to: typeof transfer.to === 'string' ? transfer.to : null,
                },
              ]
            : [],
        )
      : [];
    return transfers.length
      ? transfers.map((transfer, index) => ({
          ...base,
          transferIndex: index,
          sender: transfer.from,
          recipient: transfer.to,
          amount: transfer.amount,
        }))
      : [
          {
            ...base,
            transferIndex: 0,
            sender: null,
            recipient: null,
            amount: null,
          },
        ];
  });
}

/** Normalize available network metrics without manufacturing missing measurements.
 * @param data - Unknown network response payload.
 * @returns Supported network fields with explicit unavailable metrics.
 */
export function networkFrom(data: unknown) {
  return isRecord(data)
    ? {
        ...data,
        fetchedAt: text(data.fetchedAt),
        chain: record(data.chain),
        performance: record(data.performance),
        fees: record(data.fees),
      }
    : null;
}

/** Normalize supported external dashboard collections and metrics.
 * @param data - Unknown external-dashboard response payload.
 * @returns Supported collections and normalized dashboard metrics.
 */
export function defillamaFrom(data: unknown) {
  const dashboard = record(data);
  /** Coerce with Number and return null only for non-finite results; null and empty text coerce to zero.
   * @param value - Unknown dashboard metric using the existing coercion contract.
   * @returns Its finite numeric coercion, or null for non-finite results.
   */
  const numberOrNull = (value: unknown) =>
    Number.isFinite(Number(value)) ? Number(value) : null;
  /** Normalize collection items using the supported field allowlist.
   * @param items - Unknown dashboard collection.
   * @param fields - Supported metric field names to normalize.
   * @returns Object-shaped collection items with those normalized metric fields.
   */
  const itemsFrom = (items: unknown, fields: string[]) =>
    array(items)
      .filter(isRecord)
      .map((item) => {
        const slug =
          typeof item.slug === 'string' && item.slug.trim()
            ? item.slug.trim()
            : null;
        return {
          name:
            typeof item.name === 'string' && item.name.trim()
              ? item.name.trim()
              : slug || 'Unknown',
          slug,
          logo:
            typeof item.logo === 'string' && item.logo.trim()
              ? item.logo.trim()
              : null,
          ...fields.reduce<Record<string, number | null>>((metrics, field) => {
            metrics[field] = numberOrNull(item[field]);
            return metrics;
          }, {}),
          ...(fields.includes('category')
            ? {
                category:
                  typeof item.category === 'string' && item.category.trim()
                    ? item.category.trim()
                    : null,
              }
            : {}),
        };
      });
  const dexes = record(dashboard.dexes);
  const protocols = record(dashboard.protocols);
  return {
    dexes: {
      total24hUsd: numberOrNull(dexes.total24hUsd),
      total7dUsd: numberOrNull(dexes.total7dUsd),
      items: itemsFrom(dexes.items, [
        'total24hUsd',
        'total7dUsd',
        'change1dPct',
      ]).map((item) => ({
        ...item,
        total24hUsd: nullableNumber(record(item).total24hUsd),
        total7dUsd: nullableNumber(record(item).total7dUsd),
        change1dPct: nullableNumber(record(item).change1dPct),
      })),
    },
    protocols: {
      total: numberOrNull(protocols.total),
      items: itemsFrom(protocols.items, [
        'category',
        'solanaTvlUsd',
        'change1dPct',
        'change7dPct',
      ]).map((item) => ({
        ...item,
        category: text(record(item).category) ?? null,
        solanaTvlUsd: nullableNumber(record(item).solanaTvlUsd),
        change1dPct: nullableNumber(record(item).change1dPct),
        change7dPct: nullableNumber(record(item).change7dPct),
      })),
    },
  };
}
