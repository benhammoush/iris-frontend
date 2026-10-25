/**
 * Account lifecycle, captured-session guards and authentication operations.
 * @packageDocumentation
 */

import { ApiError } from '../api/client';

/** Application-safe authenticated identity independent of provider SDK objects. */
export interface AccountUser {
  uid: string;
  email: string | null;
  verified: boolean;
  providers: string[];
}

/** Authentication adapter consumed by the account-session lifecycle. */
export interface AccountDriver {
  /** Read the driver's current authenticated identity, or null when signed out.
   * @returns The application-safe current identity, or null.
   */
  current(): AccountUser | null;
  /** Register a state listener and return cleanup for that subscription.
   * @param next - Listener receiving application-safe identity transitions.
   * @param error - Listener notified when the provider subscription becomes unavailable.
   * @returns Cleanup for this provider subscription.
   */
  subscribe(
    next: (user: AccountUser | null) => void,
    error: () => void,
  ): () => void;
  /** Issue an identity token only for the requested currently authenticated account.
   * @param uid - Captured provider identity that must still match.
   * @returns Its ID token, rejecting identity changes during resolution.
   */
  token(uid: string): Promise<string>;
  /** Authenticate the email account using the provided credentials.
   * @param email - User-supplied account email.
   * @param password - Password sent only to the authentication provider.
   * @returns Completion of provider sign-in.
   */
  signIn(email: string, password: string): Promise<void>;
  /** Create the email account through the configured authentication driver.
   * @param email - User-supplied account email.
   * @param password - Password sent only to the authentication provider.
   * @returns The newly created application-safe identity.
   */
  signUp(email: string, password: string): Promise<AccountUser>;
  /** Authenticate through the configured Google account flow.
   * @returns Completion of provider sign-in.
   */
  google(): Promise<void>;
  /** Request password recovery for the supplied email address.
   * @param email - Account email receiving provider-managed recovery instructions.
   * @returns Completion of the recovery request.
   */
  reset(email: string): Promise<void>;
  /** Request verification for the current authenticated email account.
   * @returns Completion of the provider-managed verification request.
   */
  verify(): Promise<void>;
  /** Refresh the currently scoped resource without accepting results from a superseded identity.
   * @returns The refreshed application-safe identity, or null after sign-out.
   */
  refresh(): Promise<AccountUser | null>;
  /** Link Google credentials to the current account with the required reauthentication.
   * @param password - Current password used for provider reauthentication.
   * @returns Completion without merging or switching accounts.
   */
  linkGoogle(password: string): Promise<void>;
  /** Link password credentials to the current account without switching its identity.
   * @param password - New password for the current account.
   * @returns Completion without merging or switching accounts.
   */
  linkPassword(password: string): Promise<void>;
  /** End the current authentication session and invalidate identity-bound work.
   * @returns Completion of provider sign-out.
   */
  signOut(): Promise<void>;
}

/** Observable authentication state including initialization and failure transitions. */
interface AccountState {
  status: 'disabled' | 'loading' | 'ready' | 'unavailable';
  user: AccountUser | null;
  signOutFailed: boolean;
  verificationNotice?: 'requested' | 'failed';
}

/** Owns only in-memory identity and cancellation; Firebase owns credentials. */
export class AccountSession {
  private state: AccountState;
  private driver?: AccountDriver;
  private controller = new AbortController();
  private listeners = new Set<() => void>();
  private locked = false;
  private authentication?: Promise<void>;
  private signingOut?: Promise<void>;

  /** Initialize account state without enabling an unavailable authentication feature.
   * @param enabled - Whether account support is explicitly configured.
   */
  constructor(enabled: boolean) {
    this.state = {
      status: enabled ? 'loading' : 'disabled',
      user: null,
      signOutFailed: false,
    };
  }

  /** Expose current account state for external-store subscribers.
   * @returns The current immutable state snapshot.
   */
  snapshot = () => this.state;
  /** Register a state listener and return cleanup for that subscription.
   * @param listener - Callback notified after a state transition.
   * @returns Cleanup removing only this subscription.
   */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Publish the new scoped state to subscribers without mutating unrelated state.
   * @param state - Next account state; publishing also invalidates captured prior work.
   */
  private publish(state: AccountState) {
    this.controller.abort();
    this.controller = new AbortController();
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  /** Subscribe to the underlying session source and own the corresponding cleanup.
   * @param driver - Authentication provider adapter for this account owner.
   * @returns Cleanup for the provider's account subscription.
   */
  connect(driver: AccountDriver) {
    this.driver = driver;
    return driver.subscribe(
      (user) => {
        if (!this.locked || !user)
          this.publish({
            status: 'ready',
            user,
            signOutFailed: this.locked && this.state.signOutFailed,
            verificationNotice:
              user?.uid === this.state.user?.uid
                ? this.state.verificationNotice
                : undefined,
          });
      },
      () =>
        this.publish({
          status: 'unavailable',
          user: null,
          signOutFailed: false,
        }),
    );
  }

  /** Represent unavailable data or configuration without treating it as an empty successful result. */
  unavailable() {
    this.publish({ status: 'unavailable', user: null, signOutFailed: false });
  }

  /** Release the owned subscription and invalidate work tied to the disconnected session. */
  disconnect() {
    this.driver = undefined;
    this.controller.abort();
  }

  /** Require a ready authentication driver or raise the public unavailable error.
   * @returns The configured driver only while account support is ready.
   */
  private ready() {
    if (!this.driver || this.state.status !== 'ready')
      throw new ApiError('Accounts are unavailable.', {
        code: 'AUTH_UNAVAILABLE',
      });
    return this.driver;
  }

  /** Run an authentication operation while preserving account transition and failure state.
   * @param operation - Provider operation to run under session-transition guards.
   */
  private async authenticate(operation: () => Promise<void>) {
    if (this.locked)
      throw new ApiError('Retry sign-out first.', { code: 'SIGN_OUT_FAILED' });
    if (this.authentication)
      throw new ApiError('Another account action is still pending.', {
        code: 'AUTH_BUSY',
      });
    const pending = Promise.resolve().then(operation);
    this.authentication = pending;
    try {
      await pending;
    } finally {
      this.authentication = undefined;
    }
  }
  /** Authenticate the email account using the provided credentials.
   * @param email - User-supplied account email.
   * @param password - Password passed only to the configured authentication driver.
   * @returns Completion of the guarded sign-in operation.
   */
  signIn(email: string, password: string) {
    return this.authenticate(() => this.ready().signIn(email, password));
  }
  /** Create the email account through the configured authentication driver.
   * @param email - User-supplied account email.
   * @param password - Password passed only to the configured authentication driver.
   * @returns Completion of guarded account creation.
   */
  signUp(email: string, password: string) {
    return this.authenticate(() => this.createAccount(email, password));
  }
  /** Create the email account and establish its application session.
   * @param email - User-supplied account email.
   * @param password - Password passed only to the configured authentication driver.
   */
  private async createAccount(email: string, password: string) {
    const driver = this.ready();
    const created = await driver.signUp(email, password);
    if (this.locked || driver.current()?.uid !== created.uid) return;
    this.publish({ status: 'ready', user: created, signOutFailed: false });
    // Signup remounts the form to clear credentials; delivery feedback belongs to the new UID.
    let notice: 'requested' | 'failed' = 'requested';
    try {
      await driver.verify();
    } catch {
      notice = 'failed';
    }
    if (
      this.state.user?.uid === created.uid &&
      driver.current()?.uid === created.uid &&
      !this.locked
    )
      this.publish({ ...this.state, verificationNotice: notice });
  }
  /** Authenticate through the configured Google account flow.
   * @returns Completion of the guarded Google sign-in operation.
   */
  google() {
    return this.authenticate(() => this.ready().google());
  }
  /** Request password recovery for the supplied email address.
   * @param email - Account email receiving provider-managed recovery instructions.
   * @returns Completion of the provider recovery request.
   */
  reset(email: string) {
    return this.ready().reset(email);
  }
  /** Require an authenticated account before running a protected session operation.
   * @returns The driver only while a current authenticated account is available.
   */
  private signedIn() {
    const driver = this.ready();
    if (
      this.locked ||
      !this.state.user ||
      driver.current()?.uid !== this.state.user.uid
    )
      throw new ApiError('Sign in to continue.', { code: 'AUTH_REQUIRED' });
    return driver;
  }
  /** Request verification for the current authenticated email account. */
  async verify() {
    const driver = this.signedIn();
    const uid = this.state.user?.uid;
    await driver.verify();
    if (
      !this.locked &&
      uid &&
      this.state.user?.uid === uid &&
      driver.current()?.uid === uid
    )
      this.publish({ ...this.state, verificationNotice: 'requested' });
  }
  /** Link Google credentials to the current account with the required reauthentication.
   * @param password - Current password used only for provider reauthentication.
   * @returns Completion without switching the protected account identity.
   */
  linkGoogle(password: string) {
    return this.authenticate(() => this.signedIn().linkGoogle(password));
  }
  /** Link password credentials to the current account without switching its identity.
   * @param password - New password for the current account.
   * @returns Completion of the guarded credential-linking operation.
   */
  linkPassword(password: string) {
    return this.authenticate(() => this.signedIn().linkPassword(password));
  }
  /** Refresh the currently scoped resource without accepting results from a superseded identity. */
  async refresh() {
    const driver = this.signedIn();
    const signal = this.controller.signal;
    const user = await driver.refresh();
    // Token refresh may already have published a newer auth event.
    if (!signal.aborted && !this.locked)
      this.publish({ status: 'ready', user, signOutFailed: false });
  }
  /** End the current authentication session and invalidate identity-bound work.
   * @returns Completion of sign-out, sharing any already-pending sign-out attempt.
   */
  async signOut() {
    if (this.signingOut) return this.signingOut;
    const driver = this.ready();
    this.locked = true;
    const pending = this.authentication;
    const cleanup = Promise.resolve().then(async () => {
      // SDK authentication cannot be aborted; drain it before clearing persistence.
      await pending?.catch(() => {});
      try {
        await driver.signOut();
        this.locked = false;
      } catch {
        this.publish({ status: 'ready', user: null, signOutFailed: true });
        throw new ApiError('Sign-out could not complete. Please retry.', {
          code: 'SIGN_OUT_FAILED',
        });
      }
    });
    this.signingOut = cleanup;
    this.publish({ status: 'ready', user: null, signOutFailed: false });
    try {
      await cleanup;
    } finally {
      this.signingOut = undefined;
    }
  }

  /** Capture account identity and generation so delayed work can reject a superseded session.
   * @returns Identity-bound cancellation, currency checks and token access.
   */
  capture() {
    const driver = this.ready();
    const user = this.state.user;
    if (!user || this.locked || driver.current()?.uid !== user.uid)
      throw new ApiError('Sign in to continue.', { code: 'AUTH_REQUIRED' });
    if (!user.verified)
      throw new ApiError('Verify your email to continue.', {
        code: 'EMAIL_VERIFICATION_REQUIRED',
      });
    const signal = this.controller.signal;
    return {
      signal,
      /** Reject delayed work after cancellation, account lock or a captured-identity change.
       * @returns Whether the captured session remains eligible for publication.
       */
      isCurrent: () =>
        !signal.aborted &&
        !this.locked &&
        this.state.user?.uid === user.uid &&
        driver.current()?.uid === user.uid,
      /** Issue an identity token only for the requested currently authenticated account.
       * @returns A token bound to the captured provider identity.
       */
      token: () => driver.token(user.uid),
    };
  }
}
