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
