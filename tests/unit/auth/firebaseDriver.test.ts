/**
 * Regression coverage and controlled fixtures for firebase driver.
 * @packageDocumentation
 */

import { beforeEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => {
  const user = {
    uid: 'alice',
    email: 'alice@example.test',
    emailVerified: true,
    providerData: [{ providerId: 'password' }],
    getIdToken: vi.fn(() => Promise.resolve('firebase-id-token')),
  };
  const auth: { currentUser: typeof user | null } = { currentUser: user };
  return {
    user,
    auth,
    initializeApp: vi.fn(() => ({ name: 'iris-accounts' })),
    persistence: vi.fn(async () => {}),
    signIn: vi.fn(() => Promise.resolve({ user })),
    signUp: vi.fn(() => Promise.resolve({ user })),
    google: vi.fn(() => Promise.resolve({ user })),
    reset: vi.fn(async () => {}),
    verify: vi.fn(async () => {}),
    reload: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    reauthPassword: vi.fn(async () => {}),
    reauthGoogle: vi.fn(async () => {}),
    linkGoogle: vi.fn(async () => {}),
    linkPassword: vi.fn(async () => {}),
    observer: vi.fn(() => () => {}),
    credential: vi.fn((email: string, password: string) => ({
      email,
      password,
    })),
  };
});
vi.mock('firebase/app', () => ({
  /** Return the controlled Firebase app inventory for the adapter test.
   * @returns An empty inventory so initialization is exercised.
   */
  getApps: () => [],
  initializeApp: mocks.initializeApp,
}));
vi.mock('firebase/auth', () => ({
  /** Return the controlled Firebase authentication instance for the adapter test.
   * @returns The isolated authentication fixture.
   */
  getAuth: () => mocks.auth,
  /** Return the controlled authentication instance without contacting Firebase.
   * @returns The isolated authentication fixture.
   */
  initializeAuth: () => mocks.auth,
  browserPopupRedirectResolver: 'popup',
  setPersistence: mocks.persistence,
  browserLocalPersistence: 'local',
  onIdTokenChanged: mocks.observer,
  signInWithEmailAndPassword: mocks.signIn,
  createUserWithEmailAndPassword: mocks.signUp,
  signInWithPopup: mocks.google,
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  sendPasswordResetEmail: mocks.reset,
  sendEmailVerification: mocks.verify,
  reload: mocks.reload,
  signOut: mocks.signOut,
  linkWithPopup: mocks.linkGoogle,
  linkWithCredential: mocks.linkPassword,
  EmailAuthProvider: { credential: mocks.credential },
  reauthenticateWithCredential: mocks.reauthPassword,
  reauthenticateWithPopup: mocks.reauthGoogle,
}));
import { createFirebaseDriver } from '../../../src/auth/firebaseDriver';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = mocks.user;
  mocks.user.getIdToken.mockResolvedValue('firebase-id-token');
});
test('deletion reauthenticates only a linked provider and force-refreshes its token', async () => {
  const driver = await createFirebaseDriver();
  await driver.reauthenticate('password', 'current-password');
  expect(mocks.reauthPassword).toHaveBeenCalledWith(mocks.user, {
    email: mocks.user.email,
    password: 'current-password',
  });
  expect(mocks.user.getIdToken).toHaveBeenCalledWith(true);
  await expect(driver.reauthenticate('google.com', '')).rejects.toThrow(
    'AUTH_CHANGED',
  );
  expect(mocks.reauthGoogle).not.toHaveBeenCalled();
});
test('uses SDK persistence and password/email flows without Worker credential handling', async () => {
  const driver = await createFirebaseDriver();
  expect(mocks.persistence).toHaveBeenCalledWith(mocks.auth, 'local');
  await driver.signUp('alice@example.test', 'new-password');
  expect(mocks.signUp).toHaveBeenCalledWith(
    mocks.auth,
    'alice@example.test',
    'new-password',
  );
  expect(mocks.verify).not.toHaveBeenCalled();
  await driver.verify();
  expect(mocks.verify).toHaveBeenCalledWith(mocks.user);
  await driver.signIn('alice@example.test', 'password');
  await driver.reset('alice@example.test');
  expect(mocks.reset).toHaveBeenCalledWith(mocks.auth, 'alice@example.test');
  await driver.refresh();
  expect(mocks.reload).toHaveBeenCalledWith(mocks.user);
  expect(mocks.user.getIdToken).toHaveBeenCalledWith(true);
});
test('links providers on the current UID only after reauthentication', async () => {
  const driver = await createFirebaseDriver();
  await driver.linkGoogle('current-password');
  expect(mocks.reauthPassword).toHaveBeenCalledWith(mocks.user, {
    email: 'alice@example.test',
    password: 'current-password',
  });
  expect(mocks.linkGoogle).toHaveBeenCalledWith(
    mocks.user,
    expect.anything(),
    'popup',
  );
  await driver.linkPassword('new-password');
  expect(mocks.reauthGoogle).toHaveBeenCalledWith(
    mocks.user,
    expect.anything(),
    'popup',
  );
  expect(mocks.linkPassword).toHaveBeenCalledWith(mocks.user, {
    email: 'alice@example.test',
    password: 'new-password',
  });
  expect(mocks.signIn).not.toHaveBeenCalled();
  expect(mocks.signUp).not.toHaveBeenCalled();
});
test('refuses a token from an account that changes during SDK token retrieval', async () => {
  const driver = await createFirebaseDriver();
  mocks.user.getIdToken.mockImplementationOnce(() => {
    mocks.auth.currentUser = null;
    return Promise.resolve('old-token');
  });
  await expect(driver.token('alice')).rejects.toThrow('AUTH_CHANGED');
  await expect(driver.token('bob')).rejects.toThrow('AUTH_CHANGED');
});
test('credential conflicts propagate without merging or switching accounts', async () => {
  const driver = await createFirebaseDriver();
  mocks.linkGoogle.mockRejectedValueOnce({
    code: 'auth/credential-already-in-use',
  });
  await expect(driver.linkGoogle('password')).rejects.toMatchObject({
    code: 'auth/credential-already-in-use',
  });
  expect(mocks.auth.currentUser?.uid).toBe('alice');
  expect(mocks.signIn).not.toHaveBeenCalled();
});
