export function solanaExplorerUrl(
  kind: unknown,
  value: unknown,
): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const path = kind === 'tx' ? 'tx' : kind === 'address' ? 'address' : null;
  return path
    ? `https://explorer.solana.com/${path}/${encodeURIComponent(value)}`
    : null;
}

export function looksLikeSolanaAddress(value: unknown): value is string {
  return (
    typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
  );
}

/** References must decode to exactly 32 bytes, not just resemble Base58. */
export function isSolanaAddress(value: unknown): value is string {
  if (!looksLikeSolanaAddress(value)) return false;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let decoded = 0n;
  for (const character of value)
    decoded = decoded * 58n + BigInt(alphabet.indexOf(character));
  const leadingZeros = value.match(/^1*/)?.[0].length ?? 0;
  const bytes = decoded === 0n ? 0 : Math.ceil(decoded.toString(16).length / 2);
  return leadingZeros + bytes === 32;
}
