/**
 * Account- and feature-gated watchlist save controls.
 * @packageDocumentation
 */

import { Link } from 'react-router-dom';
import { accountsEnabled } from '../auth/config';
import { useAccount } from '../contexts/AccountContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import { isSolanaAddress } from '../data/solana';
import { sectionFor, type WatchlistKind } from '../watchlist/contract';
import { itemKey } from '../watchlist/store';
import WatchlistFeedback from './WatchlistFeedback';
import './Watchlist.css';

/** Gate the watchlist action on account readiness and feature availability. */
export default function SaveControl({
  kind,
  address,
}: {
  kind: WatchlistKind;
  address: string;
}) {
  const { status, user } = useAccount();
  if (!accountsEnabled || !isSolanaAddress(address)) return null;
  if (status === 'loading')
    return (
      <p className="iris-save-control" role="status">
        Loading account…
      </p>
    );
  if (status !== 'ready')
    return (
      <p className="iris-save-control">
        Accounts are unavailable. Public browsing is unaffected.
      </p>
    );
  if (!user)
    return (
      <p className="iris-save-control">
        <Link to="/account">Sign in to save to watchlist</Link>. Return here and
        click Save after signing in; nothing is saved automatically.
      </p>
    );
  if (!user.verified)
    return (
      <p className="iris-save-control">
        <Link to="/account">Verify your email</Link> to save to watchlist.
      </p>
    );
  return (
    <ReadySaveControl
      key={`${user.uid}:${kind}:${address}`}
      kind={kind}
      address={address}
    />
  );
}
/** Render the account-scoped save action once the watchlist session is ready. */
function ReadySaveControl({
  kind,
  address,
}: {
  kind: WatchlistKind;
  address: string;
}) {
  const list = useWatchlist();
  const saved =
    list.data?.[sectionFor(kind)].some((item) => item.address === address) ??
    false;
  const pending = list.pending === itemKey(kind, address);
  return (
    <div className="iris-save-control">
      <button
        type="button"
        disabled={!list.data || Boolean(list.pending) || list.loading}
        onClick={() => void list.mutate(kind, address, saved)}
      >
        {pending
          ? saved
            ? 'Removing…'
            : 'Saving…'
          : !list.data && list.loading
            ? 'Loading watchlist…'
            : saved
              ? 'Remove from watchlist'
              : 'Save to watchlist'}
      </button>
      <Link to="/watchlist">View watchlist</Link>
      <WatchlistFeedback {...list} />
    </div>
  );
}
