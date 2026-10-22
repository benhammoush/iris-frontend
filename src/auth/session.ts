import { ApiError } from '../api/client';

export interface AccountUser {
  uid: string;
  email: string | null;
  verified: boolean;
  providers: string[];
}

export interface AccountDriver {
  current(): AccountUser | null;
  subscribe(
    next: (user: AccountUser | null) => void,
    error: () => void,
  ): () => void;
  token(uid: string): Promise<string>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<AccountUser>;
  google(): Promise<void>;
  reset(email: string): Promise<void>;
  verify(): Promise<void>;
  refresh(): Promise<AccountUser | null>;
  linkGoogle(password: string): Promise<void>;
  linkPassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

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

  constructor(enabled: boolean) {
    this.state = {
      status: enabled ? 'loading' : 'disabled',
      user: null,
      signOutFailed: false,
    };
  }

  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(state: AccountState) {
    this.controller.abort();
    this.controller = new AbortController();
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  connect(driver: AccountDriver) {
    this.driver = driver;
    return driver.subscribe(
      (user) => {
        if (!this.locked || !user)
          this.publish({
            status: 'ready',
            user,
            signOutFailed: false,
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

  unavailable() {
    this.publish({ status: 'unavailable', user: null, signOutFailed: false });
  }

  disconnect() {
    this.driver = undefined;
    this.controller.abort();
  }

  private ready() {
    if (!this.driver || this.state.status !== 'ready')
      throw new ApiError('Accounts are unavailable.', {
        code: 'AUTH_UNAVAILABLE',
      });
    return this.driver;
  }

  async signIn(email: string, password: string) {
    if (this.locked)
      throw new ApiError('Retry sign-out first.', { code: 'SIGN_OUT_FAILED' });
    await this.ready().signIn(email, password);
  }
  async signUp(email: string, password: string) {
    if (this.locked)
      throw new ApiError('Retry sign-out first.', { code: 'SIGN_OUT_FAILED' });
    const driver = this.ready();
    const created = await driver.signUp(email, password);
    if (driver.current()?.uid !== created.uid) return;
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
  async google() {
    if (this.locked)
      throw new ApiError('Retry sign-out first.', { code: 'SIGN_OUT_FAILED' });
    await this.ready().google();
  }
  reset(email: string) {
    return this.ready().reset(email);
  }
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
  linkGoogle(password: string) {
    return this.signedIn().linkGoogle(password);
  }
  linkPassword(password: string) {
    return this.signedIn().linkPassword(password);
  }
  async refresh() {
    const driver = this.signedIn();
    const signal = this.controller.signal;
    const user = await driver.refresh();
    // Token refresh may already have published a newer auth event.
    if (!signal.aborted && !this.locked)
      this.publish({ status: 'ready', user, signOutFailed: false });
  }
  async signOut() {
    const driver = this.ready();
    this.locked = true;
    this.publish({ status: 'ready', user: null, signOutFailed: false });
    try {
      await driver.signOut();
      this.locked = false;
    } catch {
      this.publish({ status: 'ready', user: null, signOutFailed: true });
      throw new ApiError('Sign-out could not complete. Please retry.', {
        code: 'SIGN_OUT_FAILED',
      });
    }
  }

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
      isCurrent: () =>
        !signal.aborted &&
        !this.locked &&
        this.state.user?.uid === user.uid &&
        driver.current()?.uid === user.uid,
      token: () => driver.token(user.uid),
    };
  }
}
