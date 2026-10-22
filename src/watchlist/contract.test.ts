import { expect, test } from 'vitest';
import { isSolanaAddress } from '../data/solana';
import { removedFrom, savedItemFrom, watchlistFrom } from './contract';

const address = 'So11111111111111111111111111111111111111112';
const other = '11111111111111111111111111111111';
const savedAt = '2026-10-22T08:00:00.000Z';
test('references decode to 32 bytes and retain case', () => {
  expect(isSolanaAddress(address)).toBe(true);
  expect(isSolanaAddress(other)).toBe(true);
  for (const bad of [
    '1'.repeat(33),
    'z'.repeat(44),
    '0'.repeat(32),
    'not-an-address',
    null,
  ])
    expect(isSolanaAddress(bad)).toBe(false);
});
test('sections sort newest first then by binary address, without merging kinds', () => {
  const result = watchlistFrom({
    assets: [
      { address, savedAt },
      { address: other, savedAt },
    ],
    wallets: [{ address, savedAt }],
  });
  expect(result.assets.map((item) => item.address)).toEqual([other, address]);
  expect(result.wallets).toHaveLength(1);
  expect(
    watchlistFrom({
      assets: [
        { address, savedAt },
        { address: other, savedAt: '2026-10-23T08:00:00.000Z' },
      ],
      wallets: [],
    }).assets[0].address,
  ).toBe(other);
});
test('malformed, duplicate, oversized lists fail instead of masquerading as empty', () => {
  for (const value of [
    null,
    {},
    { assets: [], wallets: null },
    { assets: [{ address: '1'.repeat(33), savedAt }], wallets: [] },
    { assets: [{ address, savedAt: '2026-02-31T08:00:00.000Z' }], wallets: [] },
    {
      assets: [
        { address, savedAt },
        { address, savedAt },
      ],
      wallets: [],
    },
    {
      assets: Array.from({ length: 101 }, () => ({ address, savedAt })),
      wallets: [],
    },
  ])
    expect(() => watchlistFrom(value)).toThrow('Invalid watchlist response');
});

test('accepts 100 distinct references in each section without truncation', () => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const items = Array.from({ length: 100 }, (_, index) => {
    const n = index + 1;
    return {
      address:
        '1'.repeat(31) +
        (n < 58
          ? alphabet[n]
          : alphabet[Math.floor(n / 58)] + alphabet[n % 58]),
      savedAt,
    };
  });
  expect(watchlistFrom({ assets: items, wallets: items }).assets).toHaveLength(
    100,
  );
  expect(watchlistFrom({ assets: items, wallets: items }).wallets).toHaveLength(
    100,
  );
});
test('save and remove acknowledgements must match the requested identity and operation', () => {
  expect(
    savedItemFrom({ kind: 'asset', address, savedAt }, 'asset', address),
  ).toEqual({ address, savedAt });
  for (const value of [
    { kind: 'wallet', address, savedAt },
    { kind: 'asset', address: other, savedAt },
    { kind: 'asset', address, savedAt: 'oops' },
  ])
    expect(() => savedItemFrom(value, 'asset', address)).toThrow();
  expect(() => removedFrom({ removed: true })).not.toThrow();
  expect(() => removedFrom({ removed: false })).toThrow();
});
