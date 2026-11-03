/**
 * Regression coverage and controlled fixtures for session.
 * @packageDocumentation
 */

import { expect, test } from 'vitest';
import { AccountSession } from '../../../src/auth/session';
import { alice, fakeDriver } from './testSupport';

/** Expose a promise and its controls so tests can order asynchronous completion explicitly.
 * @returns A pending operation with explicit completion and rejection controls.
 */
function deferred() {
  /** Complete the controlled deferred operation with the supplied result. */
  let resolve = () => {};
  /** Reject the controlled deferred operation with the supplied test failure.
   * @param _cause - Controlled failure supplied by the test.
   */
  let reject = (_cause: Error) => {};
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

test.each([
  'signIn',
  'signUp',
  'google',
  'linkGoogle',
  'linkPassword',
] as const)(
  'sign-out drains late %s before clearing browser persistence',
  async (method) => {
    const fake = fakeDriver(alice);
    const session = new AccountSession(true);
    session.connect(fake.driver);
    const completion = deferred();
    /** Resolve the delayed account identity used to test superseded-session protection. */
    const lateIdentity = async () => {
      await completion.promise;
      fake.emit(alice);
    };
    if (method === 'signUp') {
      fake.driver.signUp.mockImplementation(async () => {
        await lateIdentity();
        return alice;
      });
    } else fake.driver[method].mockImplementation(lateIdentity);
    const pending =
      method === 'signIn' || method === 'signUp'
        ? session[method]('alice@example.test', 'password')
        : method === 'google'
          ? session.google()
          : session[method]('password');
    await Promise.resolve();
    // Route consumers can remount, but cannot start overlapping SDK authentication.
    const unsubscribe = session.subscribe(() => {});
    unsubscribe();
    session.subscribe(() => {});
    await expect(session.google()).rejects.toMatchObject({ code: 'AUTH_BUSY' });
    const captured = session.capture();
    const signedOut = session.signOut();
    const repeated = session.signOut();
    expect(captured.signal.aborted).toBe(true);
    expect(session.snapshot().user).toBeNull();
    expect(session.snapshot().signingOut).toBe(true);
    expect(fake.driver.signOut).not.toHaveBeenCalled();
    await expect(
      session.signIn('alice@example.test', 'password'),
    ).rejects.toMatchObject({ code: 'SIGN_OUT_FAILED' });
    completion.resolve();
    await Promise.all([pending, signedOut, repeated]);
    expect(fake.driver.signOut).toHaveBeenCalledTimes(1);
    expect(fake.driver.current()).toBeNull();
    expect(session.snapshot()).toMatchObject({
      user: null,
      signOutFailed: false,
      signingOut: false,
    });
    if (method === 'signUp') expect(fake.driver.verify).not.toHaveBeenCalled();
    await session.signIn('alice@example.test', 'password');
    expect(session.snapshot().user).toEqual(alice);
  },
);

test('failed late authentication still drains; failed persistence cleanup stays locked until retry', async () => {
  const fake = fakeDriver(alice);
  const session = new AccountSession(true);
  session.connect(fake.driver);
  const completion = deferred();
  fake.driver.google.mockImplementation(() => completion.promise);
  fake.driver.signOut.mockRejectedValueOnce(
    new Error('persistence unavailable'),
  );
  const pending = session.google();
  const authenticationFailed = expect(pending).rejects.toThrow('popup failed');
  await Promise.resolve();
  const cleanupFailed = expect(session.signOut()).rejects.toMatchObject({
    code: 'SIGN_OUT_FAILED',
  });
  completion.reject(new Error('popup failed'));
  await Promise.all([authenticationFailed, cleanupFailed]);
  fake.emit(alice);
  expect(session.snapshot()).toMatchObject({ user: null, signOutFailed: true });
  fake.emit(null);
  expect(session.snapshot()).toMatchObject({ user: null, signOutFailed: true });
  await expect(session.google()).rejects.toMatchObject({
    code: 'SIGN_OUT_FAILED',
  });
  await session.signOut();
  expect(fake.driver.current()).toBeNull();
  await session.signIn('alice@example.test', 'password');
  expect(session.snapshot().user).toEqual(alice);
});

test.each([false, true])(
  'pending sign-out stays observable through SDK callbacks until completion (failure: %s)',
  async (fails) => {
    const fake = fakeDriver(alice);
    const session = new AccountSession(true);
    session.connect(fake.driver);
    const cleanup = deferred();
    fake.driver.signOut.mockImplementation(() => cleanup.promise);
    const pending = session.signOut();
    const settled = fails
      ? expect(pending).rejects.toMatchObject({ code: 'SIGN_OUT_FAILED' })
      : pending;
    fake.emit(null);
    expect(session.snapshot()).toMatchObject({ user: null, signingOut: true });
    if (fails) cleanup.reject(new Error('cleanup failed'));
    else cleanup.resolve();
    await settled;
    expect(session.snapshot()).toMatchObject({
      user: null,
      signingOut: false,
      signOutFailed: fails,
    });
  },
);
