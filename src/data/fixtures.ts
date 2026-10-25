/**
 * Explicit deterministic fixture data, not evidence of live-provider availability.
 * @packageDocumentation
 */

/** Deterministic asset record used only by explicitly selected fixture mode. */
interface FixtureAsset {
  mint: string;
  symbol: string;
  name: string;
  iconUrl: null;
  priceUsd: null;
  totalSupply: null;
  decimals: number;
  marketCapUsd: null;
  change24hPct: null;
}

export const fixtures: { assets: FixtureAsset[]; swaps: never[] } = {
  assets: [
    {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      iconUrl: null,
      priceUsd: null,
      totalSupply: null,
      decimals: 9,
      marketCapUsd: null,
      change24hPct: null,
    },
  ],
  swaps: [],
};
