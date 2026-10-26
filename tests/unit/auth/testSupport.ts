/**
 * Regression coverage and controlled fixtures for test support.
 * @packageDocumentation
 */

import { vi } from 'vitest';
import type { AccountDriver, AccountUser } from '../../../src/auth/session';

export const alice: AccountUser = {
  uid: 'alice',
  email: 'alice@example.test',
  verified: true,
  providers: ['password'],
};
/** Provide a controlled authentication driver without contacting a live identity service.
 * @param initial - Initial fixture identity, or null when signed out.
 * @returns The typed driver and a synchronous identity-transition control.
 */
export function fakeDriver(initial: AccountUser | null = null) {
  let current = initial;
  /** Record the controlled subscription notification used by the test. */
  let listener: (user: AccountUser | null) => void = () => {};
  /** Publish a controlled authentication state transition to fixture subscribers.
   * @param user - Next controlled account identity, or null after sign-out.
   */
  const emit = (user: AccountUser | null) => {
    current = user;
    listener(user);
  };
  const driver = {
    /** Read the current controlled identity.
     * @returns The fixture's latest identity, or null after sign-out.
     */
    current: () => current,
    subscribe: vi.fn((next: (user: AccountUser | null) => void) => {
      listener = next;
      next(current);
      return () => {
        listener = () => {};
      };
    }),
    token: vi.fn(() => Promise.resolve('firebase-id-token')),
    signIn: vi.fn(() => {
      emit(alice);
      return Promise.resolve();
    }),
    signUp: vi.fn(() => {
      const created = { ...alice, verified: false };
      emit(created);
      return Promise.resolve(created);
    }),
    google: vi.fn(() => {
      emit({ ...alice, providers: ['google.com'] });
      return Promise.resolve();
    }),
    reset: vi.fn(async () => {}),
    verify: vi.fn(async () => {}),
    refresh: vi.fn(() => Promise.resolve(current)),
    reauthenticate: vi.fn(
      async (_method: 'password' | 'google.com', _password: string) => {},
    ),
    linkGoogle: vi.fn(() => {
      if (current) emit({ ...current, providers: ['password', 'google.com'] });
      return Promise.resolve();
    }),
    linkPassword: vi.fn(() => {
      if (current) emit({ ...current, providers: ['password', 'google.com'] });
      return Promise.resolve();
    }),
    signOut: vi.fn(() => {
      emit(null);
      return Promise.resolve();
    }),
  } satisfies AccountDriver;
  return { driver, emit };
}
