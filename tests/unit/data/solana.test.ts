import { expect, test } from 'vitest';
import {
  looksLikeSolanaAddress,
  solanaExplorerUrl,
} from '../../../src/data/solana';

test('builds encoded Solana Explorer URLs only for supported resource kinds', () => {
  expect(solanaExplorerUrl('address', 'Mint/with space')).toBe(
    'https://explorer.solana.com/address/Mint%2Fwith%20space',
  );
  expect(solanaExplorerUrl('tx', 'SignatureABC')).toBe(
    'https://explorer.solana.com/tx/SignatureABC',
  );
  expect(solanaExplorerUrl('unknown', 'value')).toBeNull();
  expect(
    looksLikeSolanaAddress('So11111111111111111111111111111111111111112'),
  ).toBe(true);
  expect(looksLikeSolanaAddress('not-a-wallet')).toBe(false);
});

test.each([null, undefined, 42, {}, [], '', '   '])(
  'rejects missing or non-string explorer identifiers: %j',
  (value) => {
    expect(solanaExplorerUrl('address', value)).toBeNull();
    expect(looksLikeSolanaAddress(value)).toBe(false);
  },
);
