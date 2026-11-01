/**
 * Account authentication, linking and recovery forms with action-specific feedback.
 * @packageDocumentation
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAccount } from '../contexts/AccountContext';
import { isRecord } from '../data/record';
import Navbar from './Navbar';
import './Account.css';

/** Map supported account failures to actionable UI text without exposing raw provider errors.
 * @param cause - Unknown account-operation failure.
 * @returns A controlled, actionable public explanation.
 */
function friendlyError(cause: unknown): string {
  const code = isRecord(cause) ? cause.code : undefined;
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  )
    return 'Google sign-in was cancelled. You can try again.';
  if (code === 'auth/popup-blocked')
    return 'Allow pop-ups for Iris, then try Google sign-in again.';
  if (
    code === 'auth/credential-already-in-use' ||
    code === 'auth/account-exists-with-different-credential' ||
    code === 'auth/provider-already-linked'
  )
    return 'That sign-in method is already linked or belongs to another account. Sign in with your existing method; accounts and lists will not be merged.';
  if (
    code === 'auth/weak-password' ||
    code === 'auth/password-does-not-meet-requirements'
  )
    return 'Choose a stronger password that meets the account password policy.';
  if (code === 'auth/too-many-requests')
    return 'Too many attempts. Please wait before trying again.';
  if (code === 'SIGN_OUT_FAILED')
    return 'Sign-out could not complete. Your private view is cleared; retry sign-out before leaving a shared device.';
  if (code === 'AUTH_BUSY')
    return 'Another account action is still pending. Finish or close its sign-in window before trying again.';
  if (code === 'REAUTHENTICATION_REQUIRED')
    return 'Please confirm your identity again; deletion requires authentication within five minutes.';
  if (
    ['CONTRACT_ERROR', 'PRIVATE_REQUEST_FAILED', 'REQUEST_CANCELLED'].includes(
      String(code),
    )
  )
    return 'Deletion could not be confirmed. The request may have been accepted and cleanup may still be running. Do not assume the account is unchanged or that deletion is complete.';
  if (code === 'DELETION_RECEIPT_INVALID')
    return 'This deletion receipt has expired or is invalid. Cleanup continues independently; this page can no longer confirm completion.';
  return 'Could not complete this action. Check your details and connection, then try again.';
}

/** Render the account route within its authentication state boundary.
 * @returns Account actions or the current authentication availability notice.
 */
export default function Account() {
  const { status, user, deletion } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const mode =
    !user && (requestedMode === 'signup' || requestedMode === 'reset')
      ? requestedMode
      : 'signin';
  useEffect(() => {
    const main = document.getElementById('iris-main');
    if (!main?.contains(document.activeElement))
      main?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!user || !searchParams.has('mode')) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('mode');
        return next;
      },
      { replace: true },
    );
  }, [user, searchParams, setSearchParams]);
  return (
    <div className="iris-shell">
      <Navbar />
      <main
        id="iris-main"
        tabIndex={-1}
        className="iris-page iris-account-page"
      >
        <section className="iris-page-heading">
          <div>
            <p className="iris-eyebrow">Your Iris account</p>
            <h1>Account</h1>
            <p>
              Public browsing never requires an account or a wallet connection.
            </p>
          </div>
        </section>
        {deletion ? (
          <DeletionStatus />
        ) : status === 'disabled' ? (
          <p className="iris-account-card">
            Accounts are not enabled in this environment.{' '}
            <Link to="/">Continue browsing Iris</Link>.
          </p>
        ) : status === 'unavailable' ? (
          <p className="iris-account-card" role="alert">
            Accounts are unavailable. You can keep browsing publicly. Reload
            this page to retry.
          </p>
        ) : status === 'loading' ? (
          <p role="status">Loading account...</p>
        ) : (
          <AccountPanel
            key={`${user?.uid ?? 'signed-out'}:${mode}`}
            mode={mode}
          />
        )}
      </main>
    </div>
  );
}

/** URL-selected account access form. */
interface AccountPanelProps {
  mode: 'signin' | 'signup' | 'reset';
}

/** Render account actions and their pending, successful and failed states.
 * @param props - URL-selected access mode; mode changes remount sensitive form state.
 * @returns Forms and account controls with operation-scoped feedback.
 */
function AccountPanel(props: AccountPanelProps) {
  const { mode } = props;
  const { user, session, signOutFailed, verificationNotice } = useAccount();
  const [, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [mode]);
  /** Run an account action and publish its user-visible outcome.
   * @param action - Guarded account operation to await.
   * @param success - Controlled message shown only after successful completion.
   */
  async function act(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage('');
    setFailure('');
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setFailure(friendlyError(cause));
    } finally {
      setPassword('');
      setBusy(false);
    }
  }
  /** Handle form submission without allowing the browser default navigation.
   * @param event - Form submission to route into the selected account action.
   */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'reset') {
      void act(async () => {
        // Do not disclose whether Firebase knows this email address.
        try {
          await session.reset(email.trim());
        } catch {
          /* Same response for unknown addresses and failures. */
        }
      }, 'If this email can receive password-reset instructions, check its inbox. If nothing arrives, wait and try again.');
    } else {
      void act(
        () =>
          mode === 'signup'
            ? session.signUp(email.trim(), password)
            : session.signIn(email.trim(), password),
        mode === 'signup'
          ? 'Check your inbox to verify your email.'
          : 'Signed in. Nothing has been saved automatically.',
      );
    }
  }
  /** Switch the account form mode and clear feedback tied to the previous action.
   * @param next - Sign-in, sign-up or password-reset form mode.
   */
  function changeMode(next: typeof mode) {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (next === 'signin') params.delete('mode');
      else params.set('mode', next);
      return params;
    });
  }
  return (
    <section
      className="iris-account-card"
      aria-label={user ? 'Signed-in account' : 'Account access'}
      aria-busy={busy || undefined}
    >
      <div className="iris-account-feedback">
        <p role="status" aria-live="polite">
          {message}
        </p>
        {failure && <p role="alert">{failure}</p>}
      </div>
      {user ? (
        <>
          <h2 id="iris-account-heading" ref={heading} tabIndex={-1}>
            Signed in
          </h2>
          {verificationNotice === 'failed' && !user.verified && (
            <p role="alert">
              Your account was created, but the verification email could not be
              requested. Use Resend verification email to try again.
            </p>
          )}
          {verificationNotice === 'requested' && !user.verified && (
            <p role="status">
              Verification requested. Check your inbox; delivery may take a
              moment.
            </p>
          )}
          <p className="iris-account-email">{user.email ?? 'Iris account'}</p>
          <p>
            {user.verified
              ? 'Email verified.'
              : 'Verify your email before using private watchlists.'}
          </p>
          {!user.verified && (
            <div className="iris-account-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => session.verify(),
                    'Verification requested. Check your inbox; if nothing arrives, wait and try again.',
                  )
                }
              >
                Resend verification email
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(() => session.refresh(), 'Account status refreshed.')
                }
              >
                I have verified my email
              </button>
            </div>
          )}
          <p>
            Nothing is saved automatically. Manage saved references on your{' '}
            <Link to="/watchlist">Watchlist</Link>.
          </p>
          {user.providers.includes('google.com') &&
          !user.providers.includes('password') ? (
            <p>Signed in with Google.</p>
          ) : (
            <>
              <h3>Sign-in methods</h3>
              <p>
                {user.providers
                  .map((provider) =>
                    provider === 'google.com'
                      ? 'Google'
                      : provider === 'password'
                        ? 'Email and password'
                        : provider,
                  )
                  .join(' · ')}
              </p>
            </>
          )}
          {user.email &&
            user.providers.includes('password') &&
            !user.providers.includes('google.com') && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void act(async () => {
                    await session.linkGoogle(password);
                    await session.refresh();
                  }, 'Google linked to this account.');
                }}
              >
                <label>
                  Current password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={busy}
                  />
                </label>
                <button type="submit" disabled={busy}>
                  Link Google to this account
                </button>
              </form>
            )}
          <button
            type="button"
            className="iris-account-secondary"
            disabled={busy}
            onClick={() => void act(() => session.signOut(), 'Signed out.')}
          >
            Sign out
          </button>
          <DeleteAccount busy={busy} run={act} />
        </>
      ) : (
        <>
          {signOutFailed && (
            <p role="alert">
              Sign-out has not completed.{' '}
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(() => session.signOut(), 'Signed out.')}
              >
                Retry sign out
              </button>
            </p>
          )}
          <h2 id="iris-account-heading" ref={heading} tabIndex={-1}>
            {mode === 'signin'
              ? 'Sign in'
              : mode === 'signup'
                ? 'Create an account'
                : 'Reset password'}
          </h2>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
            </label>
            {mode !== 'reset' && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={
                    mode === 'signup' ? 'new-password' : 'current-password'
                  }
                  minLength={mode === 'signup' ? 6 : undefined}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                />
              </label>
            )}
            <button type="submit" disabled={busy}>
              {mode === 'signin'
                ? 'Sign in with email'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Send reset instructions'}
            </button>
          </form>
          {mode !== 'reset' && (
            <button
              type="button"
              className="iris-account-secondary"
              disabled={busy}
              onClick={() =>
                void act(
                  () => session.google(),
                  'Signed in. Nothing has been saved automatically.',
                )
              }
            >
              Continue with Google
            </button>
          )}
          <div className="iris-account-actions">
            {mode !== 'signin' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => changeMode('signin')}
              >
                Back to sign in
              </button>
            )}
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeMode('signup')}
                >
                  Create an account
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeMode('reset')}
                >
                  Forgot password?
                </button>
              </>
            )}
          </div>
          <p>
            Sign-in stays active on this browser until you sign out. Do not stay
            signed in on a shared device.
          </p>
        </>
      )}
    </section>
  );
}

/** Account action serialization shared by deletion and the other account forms. */
interface DeleteAccountProps {
  busy: boolean;
  /** Run an account action with shared pending/error feedback.
   * @param action - Account operation to await.
   * @param success - Controlled success explanation.
   * @returns Completion of the action and its feedback.
   */
  run(this: void, action: () => Promise<void>, success: string): Promise<void>;
}

/** Confirm irreversible deletion and choose an already linked reauthentication method.
 * @param props - Shared account action lock and controlled feedback runner.
 * @returns The explicit, keyboard-accessible deletion form; never saves a password outside component memory.
 */
function DeleteAccount(props: DeleteAccountProps) {
  const { busy, run } = props;
  const { user, session } = useAccount();
  const [expanded, setExpanded] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState<'password' | 'google.com'>(
    user?.providers.includes('password') ? 'password' : 'google.com',
  );
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (expanded) input.current?.focus();
  }, [expanded]);
  return (
    <section
      className="iris-account-deletion"
      aria-label="Permanent account deletion"
    >
      <h3>Delete account permanently</h3>
      <p>
        Delete your Iris account and all saved assets and wallets. There is no
        undo. Public blockchain data is unaffected.
      </p>
      <p>
        Live saved references are removed when accepted. Firebase cleanup can
        take longer. Deletion-status metadata stays for 31 days after
        completion. Provider backups may retain deleted data temporarily; this
        is not immediate erasure from backups.
      </p>
      {!expanded ? (
        <button type="button" disabled={busy} onClick={() => setExpanded(true)}>
          Delete my account
        </button>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (confirmation !== 'DELETE') return;
            void run(async () => {
              const credential = password;
              setPassword('');
              await session.deleteAccount(method, credential);
            }, 'Deletion accepted.');
          }}
        >
          <label>
            Type DELETE to confirm
            <input
              ref={input}
              required
              value={confirmation}
              autoComplete="off"
              disabled={busy}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          {user?.providers.includes('password') &&
          user.providers.includes('google.com') ? (
            <label>
              Confirm identity with
              <select
                disabled={busy}
                value={method}
                onChange={(event) => {
                  setMethod(
                    event.target.value === 'password'
                      ? 'password'
                      : 'google.com',
                  );
                  setPassword('');
                }}
              >
                <option value="password">Email and password</option>
                <option value="google.com">Google</option>
              </select>
            </label>
          ) : null}
          {method === 'password' ? (
            <label>
              Password for account deletion
              <input
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          ) : (
            <p>Google will ask you to confirm this account's identity.</p>
          )}
          <button type="submit" disabled={busy || confirmation !== 'DELETE'}>
            {busy ? 'Confirming deletion…' : 'Confirm permanent deletion'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setExpanded(false);
              setPassword('');
              setConfirmation('');
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}

/** Show receipt-only status after clearing authentication, without depending on an open browser for cleanup.
 * @returns A bounded manual status check and honest pending/completed feedback.
 */
function DeletionStatus() {
  const { deletion, session, signOutFailed, user } = useAccount();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  if (!deletion) return null;
  const expired = Date.parse(deletion.expiresAt) <= Date.now();
  return (
    <section className="iris-account-card" aria-busy={busy || undefined}>
      <h2 ref={heading} tabIndex={-1}>
        {deletion.status === 'deleted'
          ? 'Account deletion confirmed'
          : 'Account deletion underway'}
      </h2>
      <p role="status">
        {deletion.status === 'deleted'
          ? 'Your Firebase account is deleted and live saved references are removed.'
          : 'Your live saved references are removed. Firebase cleanup is pending; this is not yet confirmation of full account deletion.'}
      </p>
      <p>
        Cleanup continues if you close this page. The status receipt stays only
        in memory and expires at{' '}
        {new Date(deletion.expiresAt).toLocaleTimeString()}. Reloading loses
        this page's ability to confirm completion, not the cleanup job.
      </p>
      {failure && <p role="alert">{failure}</p>}
      {signOutFailed && (
        <p role="alert">
          Browser sign-out has not completed. Retry before leaving a shared
          device.{' '}
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void session
                .signOut()
                .catch((cause: unknown) => setFailure(friendlyError(cause)))
                .finally(() => setBusy(false));
            }}
          >
            Retry sign out
          </button>
        </p>
      )}
      {deletion.status === 'deleting' &&
        (expired ? (
          <p>
            This receipt has expired. Cleanup continues, but completion cannot
            be confirmed here.
          </p>
        ) : (
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setFailure('');
              void session
                .checkDeletion()
                .catch((cause: unknown) => setFailure(friendlyError(cause)))
                .finally(() => setBusy(false));
            }}
          >
            Check deletion status
          </button>
        ))}
      {!signOutFailed && !user && (
        <>
          <p>
            Returning to account access discards this page's status receipt.
            Cleanup continues; this cannot undo deletion.
          </p>
          <button disabled={busy} onClick={() => session.dismissDeletion()}>
            Return to sign in or create an account
          </button>
        </>
      )}
      <p>
        <Link to="/">Continue public browsing</Link>
      </p>
    </section>
  );
}
