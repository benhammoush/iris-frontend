import { expect, test } from 'vitest';
import {
  assetCandlesFrom,
  assetDistributionFrom,
  assetHoldersFrom,
  assetHistoryFrom,
  assetOnchainFrom,
  assetTransactionsFrom,
  assetsFrom,
  defillamaFrom,
  recentTransactionsFrom,
  transactionsFrom,
  walletFrom,
} from './normalizers';

test('normalizers reject malformed containers and retain exact legacy wallet amount strings', () => {
  for (const value of [null, undefined, 42, 'invalid', []]) {
    expect(assetsFrom(value)).toEqual([]);
    expect(transactionsFrom(value)).toEqual([]);
    expect(walletFrom(value)).toBeNull();
    expect(assetTransactionsFrom(value)).toEqual([]);
  }
  const wallet = walletFrom({
    address: 'wallet',
    balances: [
      null,
      42,
      {
        mint: 'mint',
        rawBalance: '9007199254740993123',
        balance: '9007199254740.993123',
        atomicAmount: '9007199254740993123',
        priceUsd: null,
        valueUsd: null,
      },
    ],
  });
  expect(wallet?.assets).toHaveLength(1);
  expect(wallet?.assets[0]).toMatchObject({
    rawBalance: '9007199254740993123',
    balance: '9007199254740.993123',
    atomicAmount: '9007199254740993123',
    price: null,
    value: null,
  });
});

test('DefiLlama normalization retains null after a nonnumeric value fails conversion', () => {
  expect(
    defillamaFrom({
      dexes: { items: [{ name: 'DEX', slug: 'dex', change1dPct: 'invalid' }] },
    }).dexes.items[0]?.change1dPct,
  ).toBeNull();
});

test('normalizes canonical v3 assets and atomic transaction events', () => {
  const [asset] = assetsFrom({
    assets: [
      {
        mint: 'MintCaseSensitiveABC',
        symbol: 'TEST',
        iconUrl: '/test.png',
        priceUsd: 2,
        quality: { organicScore: 84 },
      },
    ],
  });
  const [event] = transactionsFrom({
    events: [
      {
        id: 'solana-event',
        timestamp: '2026-10-02T12:00:00Z',
        type: 'Swap',
        source: 'Helius',
        status: 'Confirmed',
        description: 'Swap event',
        transfers: {
          native: [{ amount: '1000000', decimals: 9 }],
          tokens: [
            {
              mint: 'MintCaseSensitiveABC',
              symbol: 'TEST',
              amount: '2500000',
              decimals: 6,
            },
          ],
        },
      },
    ],
  });
  expect(asset).toMatchObject({
    mint: 'MintCaseSensitiveABC',
    imageUrl: '/test.png',
    priceUsd: 2,
    quality: { organicScore: 84 },
  });
  expect(event).toMatchObject({
    id: 'solana-event',
    timestamp: '2026-10-02T12:00:00Z',
    type: 'Swap',
    source: 'Helius',
    status: 'Confirmed',
    transfers: [
      { symbol: 'SOL', amount: '1000000', decimals: 9, kind: 'native' },
      {
        mint: 'MintCaseSensitiveABC',
        symbol: 'TEST',
        amount: '2500000',
        decimals: 6,
        kind: 'token',
      },
    ],
  });
  const [flatEvent] = transactionsFrom({
    events: [
      {
        id: 'flat-event',
        transfers: [{ mint: 'MintCaseSensitiveABC', amount: '1', decimals: 6 }],
      },
    ],
  });
  expect(flatEvent.transfers).toEqual([
    { mint: 'MintCaseSensitiveABC', amount: '1', decimals: 6, kind: 'token' },
  ]);
});

test('keeps nullable Worker market fields and ignores unavailable history', () => {
  const [asset] = assetsFrom([
    {
      mint: 'MintCaseSensitiveABC',
      symbol: 'TEST',
      priceUsd: null,
      marketCapUsd: null,
    },
  ]);

  expect(asset.priceUsd).toBeNull();
  expect(asset.marketCapUsd).toBeNull();
  expect(assetHistoryFrom({ history: null })).toEqual([]);
  expect(
    assetHistoryFrom({
      history: [{ timestamp: '2026-10-01T00:00:00Z', priceUsd: 2 }],
    }),
  ).toEqual([['2026-10-01T00:00:00Z', 2]]);
  expect(
    assetCandlesFrom({
      candles: [
        {
          timestamp: '2026-10-01T00:00:00Z',
          openUsd: 1,
          highUsd: 3,
          lowUsd: 0.5,
          closeUsd: 2,
          volumeUsd: 100,
        },
        {
          timestamp: 'invalid',
          openUsd: 1,
          highUsd: 1,
          lowUsd: 1,
          closeUsd: 1,
          volumeUsd: 1,
        },
      ],
    }),
  ).toEqual([
    {
      timestamp: '2026-10-01T00:00:00Z',
      openUsd: 1,
      highUsd: 3,
      lowUsd: 0.5,
      closeUsd: 2,
      volumeUsd: 100,
    },
  ]);
});

test('normalizes Helius on-chain profiles and token account records without number conversion', () => {
  expect(
    assetOnchainFrom({
      mint: 'MintCaseSensitiveABC',
      interface: 'FungibleToken',
      tokenProgram: 'Tokenkeg',
      metadata: { description: 'Example token' },
      mintState: {
        supplyAtomic: '9007199254740993123',
        supply: '9007199254740.993123',
        mintAuthority: null,
        freezeAuthority: 'authority',
        isMutable: false,
        extensions: ['transferFeeConfig'],
      },
    }),
  ).toMatchObject({
    mint: 'MintCaseSensitiveABC',
    interface: 'FungibleToken',
    mintState: {
      supplyAtomic: '9007199254740993123',
      supply: '9007199254740.993123',
      extensions: ['transferFeeConfig'],
    },
  });
  expect(
    assetHoldersFrom({
      total: 1,
      holders: [
        {
          tokenAccount: 'account',
          owner: 'owner',
          amount: '2.5',
          atomicAmount: '2500000',
          frozen: false,
        },
      ],
    }),
  ).toEqual({
    total: 1,
    holders: [
      { tokenAccount: 'account', owner: 'owner', amount: '2.5', frozen: false },
    ],
  });
  expect(
    assetDistributionFrom({
      accounts: [
        {
          rank: 1,
          tokenAccount: 'account',
          owner: 'owner',
          amount: '2.5',
          supplyPercent: '25.00',
          frozen: false,
        },
      ],
    }),
  ).toEqual([
    {
      rank: 1,
      tokenAccount: 'account',
      owner: 'owner',
      amount: '2.5',
      supplyPercent: '25.00',
      frozen: false,
    },
  ]);
  expect(
    assetTransactionsFrom({
      transactions: [
        {
          signature: 'signature',
          status: 'success',
          action: 'mint',
          transfers: [{ amount: '2.5', from: null, to: 'wallet' }],
        },
      ],
    }),
  ).toEqual([
    {
      signature: 'signature',
      timestamp: null,
      action: 'mint',
      protocol: null,
      summary: null,
      transferIndex: 0,
      sender: null,
      recipient: 'wallet',
      amount: '2.5',
    },
  ]);
});

test('unavailable metadata remains null instead of inventing display identifiers', () => {
  expect(
    assetsFrom([
      { mint: 'MintCase', symbol: null, name: null, iconUrl: null },
    ])[0],
  ).toMatchObject({
    mint: 'MintCase',
    symbol: null,
    name: null,
    imageUrl: null,
  });
  expect(assetsFrom([{ symbol: 'NO_MINT' }])).toEqual([]);
});

test('keeps canonical wallet identifiers and holdings truncation', () => {
  const [asset] = assetsFrom({
    assets: [{ mint: 'MintCaseSensitiveABC', symbol: 'TEST' }],
  });
  const wallet = walletFrom({
    address: 'WalletCaseSensitiveABC',
    holdingsTruncated: true,
    balances: [],
    events: [{ id: 'SignatureABC', type: 'swap' }],
  });

  expect(asset.mint).toBe('MintCaseSensitiveABC');
  if (!wallet) throw new Error('Expected normalized wallet');
  expect(wallet.address).toBe('WalletCaseSensitiveABC');
  expect(wallet.truncated).toBe(true);
  expect(wallet.transactions[0]).toMatchObject({
    id: 'SignatureABC',
    type: 'swap',
  });
});

test('recent transaction samples retain only provider-proven signature fields', () => {
  expect(
    recentTransactionsFrom({
      transactions: [
        {
          signature: 'signature',
          slot: 12,
          blockTime: '2026-10-06T00:00:00.000Z',
          status: 'confirmed',
          action: 'add_liquidity',
        },
        { signature: '', slot: 13 },
      ],
    }),
  ).toEqual([
    {
      signature: 'signature',
      slot: 12,
      blockTime: '2026-10-06T00:00:00.000Z',
      status: 'confirmed',
      action: 'add_liquidity',
    },
  ]);
});

test('normalizes the DefiLlama dashboard payload', () => {
  const dashboard = defillamaFrom({
    dexes: {
      total24hUsd: '1234',
      total7dUsd: 5678,
      items: [
        {
          name: 'Jupiter',
          slug: 'jupiter',
          logo: ' https://example.com/jupiter.png ',
          total24hUsd: '500',
          total7dUsd: 3500,
          change1dPct: '2.5',
        },
      ],
    },
    protocols: {
      total: 42,
      items: [
        {
          name: 'Kamino',
          slug: 'kamino-finance',
          logo: ' ',
          category: 'Lending',
          solanaTvlUsd: 999,
          change1dPct: -1,
          change7dPct: '3.25',
        },
      ],
    },
  });

  expect(dashboard).toEqual({
    dexes: {
      total24hUsd: 1234,
      total7dUsd: 5678,
      items: [
        {
          name: 'Jupiter',
          slug: 'jupiter',
          logo: 'https://example.com/jupiter.png',
          total24hUsd: 500,
          total7dUsd: 3500,
          change1dPct: 2.5,
        },
      ],
    },
    protocols: {
      total: 42,
      items: [
        {
          name: 'Kamino',
          slug: 'kamino-finance',
          logo: null,
          category: 'Lending',
          solanaTvlUsd: 999,
          change1dPct: -1,
          change7dPct: 3.25,
        },
      ],
    },
  });
});
