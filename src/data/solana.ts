/**
 * Allowlisted explorer links, address syntax checks and decoded public-key length validation.
 * @packageDocumentation
 */

/** Build an allowlisted Solana explorer link for the supported resource kind.
 * @param kind - Requested explorer resource kind.
 * @param value - Unknown account or transaction identifier.
 * @returns A supported explorer URL, or null when the kind or identity is invalid.
 */
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

/** Check address syntax for search routing; this is not proof of an existing on-chain account.
 * @param value - Unknown search input.
 * @returns Whether its type, alphabet and length resemble a Solana address.
 */
export function looksLikeSolanaAddress(value: unknown): value is string {
  return (
    typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
  );
}

/** References must decode to exactly 32 bytes, not just resemble Base58.
 * @param value - Unknown address reference.
 * @returns Whether it decodes to exactly 32 bytes; existence is not established.
 */
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
