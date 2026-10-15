import { isRecord } from './record';
import type { WireAsset } from '../api/contracts';

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

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function nullableNumber(value: unknown): number | null {
  return number(value) ?? null;
}

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

export function transactionsFrom(data: unknown) {
  const page = record(data).transactions || record(data).events || data;
  return array(page).filter(isRecord).map(transactionFrom);
}

export function swapsFrom(data: unknown) {
  const events = Array.isArray(data)
    ? data
    : record(data).swaps || record(data).events;
  return array(events)
    .filter(isRecord)
    .map((event) => ({
      id: text(event.id) || text(event.signature),
      timestamp: text(event.timestamp),
      type: text(event.type) || text(event.side) || 'Swap',
      maker: text(event.maker) || text(event.wallet),
    }));
}

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

export function assetHistoryFrom(
  asset: unknown,
): [string, number | string | null | undefined][] {
  const history = Array.isArray(asset)
    ? asset
    : record(asset).history ||
      record(asset).points ||
      record(asset).priceHistory;
  if (!Array.isArray(history)) return [];
  return array(history)
    .filter(isRecord)
    .map((point): [string, number | string | null | undefined] => [
      text(point.date) || text(point.timestamp) || '',
      (point.priceUsd ?? point.price) === null
        ? null
        : typeof (point.priceUsd ?? point.price) === 'number'
          ? number(point.priceUsd ?? point.price)
          : text(point.priceUsd ?? point.price),
    ])
    .filter(([date, price]) => date && Number.isFinite(Number(price)));
}

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

export function assetOnchainFrom(data: unknown) {
  if (!isRecord(data)) return null;
  const mintState = record(data.mintState);
  const metadata = record(data.metadata);
  return {
    mint: typeof data.mint === 'string' ? data.mint : null,
    interface: typeof data.interface === 'string' ? data.interface : null,
    tokenProgram:
      typeof data.tokenProgram === 'string' ? data.tokenProgram : null,
    metadata: {
      description:
        typeof metadata.description === 'string' ? metadata.description : null,
    },
    mintState: {
      supplyAtomic:
        typeof mintState.supplyAtomic === 'string'
          ? mintState.supplyAtomic
          : null,
      supply: typeof mintState.supply === 'string' ? mintState.supply : null,
      mintAuthority:
        typeof mintState.mintAuthority === 'string'
          ? mintState.mintAuthority
          : null,
      freezeAuthority:
        typeof mintState.freezeAuthority === 'string'
          ? mintState.freezeAuthority
          : null,
      isMutable:
        typeof mintState.isMutable === 'boolean' ? mintState.isMutable : null,
      extensions: Array.isArray(mintState.extensions)
        ? array(mintState.extensions).filter(
            (extension) => typeof extension === 'string',
          )
        : [],
    },
  };
}

export function assetHoldersFrom(data: unknown) {
  const holders = array(record(data).holders);
  return {
    holders: holders.flatMap((holder) =>
      isRecord(holder) &&
      typeof holder.owner === 'string' &&
      typeof holder.amount === 'string'
        ? [
            {
              tokenAccount:
                typeof holder.tokenAccount === 'string'
                  ? holder.tokenAccount
                  : null,
              owner: holder.owner,
              amount: holder.amount,
              frozen: typeof holder.frozen === 'boolean' ? holder.frozen : null,
            },
          ]
        : [],
    ),
    total:
      typeof record(data).total === 'number' &&
      Number.isInteger(record(data).total)
        ? (number(record(data).total) ?? null)
        : null,
  };
}

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

export function defillamaFrom(data: unknown) {
  const dashboard = record(data);
  const numberOrNull = (value: unknown) =>
    Number.isFinite(Number(value)) ? Number(value) : null;
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
