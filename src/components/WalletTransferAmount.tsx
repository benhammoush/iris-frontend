/**
 * Exact wallet transfer quantities with source details outside the table layout.
 * @packageDocumentation
 */

import { useId, useRef } from 'react';

/** Convert unsigned atomic units by moving the decimal point, never through a float.
 * @param atomicAmount - Exact source integer text.
 * @param decimals - Known Solana token decimal count.
 * @returns Exact readable quantity, or null when conversion cannot be trusted.
 */
export function transferQuantity(atomicAmount: string, decimals?: number) {
  if (
    !/^\d+$/.test(atomicAmount) ||
    decimals === undefined ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 255
  )
    return null;
  const digits = atomicAmount.replace(/^0+(?=\d)/, '');
  if (decimals === 0) return digits;
  const padded = digits.padStart(decimals + 1, '0');
  const fraction = padded.slice(-decimals).replace(/0+$/, '');
  return `${padded.slice(0, -decimals)}${fraction ? `.${fraction}` : ''}`;
}

/** Source amount and optional decimal context for one transfer. */
interface WalletTransferAmountProps {
  amount?: string | null;
  decimals?: number;
}

/** Keep table rows compact while making full quantities keyboard/touch accessible.
 * @param props - Unchanged source amount and decimals.
 * @returns A quantity button and native modal details, or an unavailable marker.
 */
export default function WalletTransferAmount(props: WalletTransferAmountProps) {
  const { amount, decimals } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  if (amount == null) return <>—</>;
  const quantity = transferQuantity(amount, decimals);
  const label = quantity ?? `${amount} atomic units`;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="iris-wallet-amount-button"
        aria-haspopup="dialog"
        aria-label={`Show exact transfer amount: ${label}`}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        className="iris-wallet-amount-details"
        aria-labelledby={headingId}
        onClose={() => trigger.current?.focus()}
      >
        <h2 id={headingId}>Exact transfer amount</h2>
        <dl>
          <dt>Quantity</dt>
          <dd>{quantity ?? 'Unavailable without valid decimal context'}</dd>
          <dt>Atomic units</dt>
          <dd>{amount}</dd>
          <dt>Decimals</dt>
          <dd>{decimals ?? 'Unknown'}</dd>
        </dl>
        <button type="button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </dialog>
    </>
  );
}
