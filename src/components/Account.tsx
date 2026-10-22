import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '../contexts/AccountContext';
import { isRecord } from '../data/record';
import Navbar from './Navbar';
import './Account.css';

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
  return 'Could not complete this action. Check your details and connection, then try again.';
}

export default function Account() {
  const { status, user } = useAccount();
  useEffect(() => {
    document.getElementById('iris-main')?.focus({ preventScroll: true });
  }, []);
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
        {status === 'disabled' ? (
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
          <AccountPanel key={user?.uid ?? 'signed-out'} />
        )}
      </main>
    </div>
  );
}

function AccountPanel() {
  const { user, session, signOutFailed, verificationNotice } = useAccount();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [mode]);
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
  function changeMode(next: typeof mode) {
    setMode(next);
    setPassword('');
    setMessage('');
    setFailure('');
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
            Nothing is saved automatically. Watchlist controls will be available
            in a later update.
          </p>
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
          {user.email &&
            (user.providers.includes('password') &&
            !user.providers.includes('google.com') ? (
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
            ) : user.providers.includes('google.com') &&
              !user.providers.includes('password') ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void act(async () => {
                    await session.linkPassword(password);
                    await session.refresh();
                  }, 'Email and password linked to this account.');
                }}
              >
                <p>
                  Add a password for {user.email}. Google will ask you to
                  confirm your identity.
                </p>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={busy}
                  />
                </label>
                <button type="submit" disabled={busy}>
                  Add email and password
                </button>
              </form>
            ) : null)}
          <button
            type="button"
            className="iris-account-secondary"
            disabled={busy}
            onClick={() => void act(() => session.signOut(), 'Signed out.')}
          >
            Sign out
          </button>
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
