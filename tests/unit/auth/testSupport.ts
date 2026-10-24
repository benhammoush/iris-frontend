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
/** Provide a controlled authentication driver without contacting a live identity service. */
export function fakeDriver(initial: AccountUser | null = null) {
  let current = initial;
  /** Record the controlled subscription notification used by the test. */
  let listener: (user: AccountUser | null) => void = () => {};
  /** Publish a controlled authentication state transition to fixture subscribers. */
  const emit = (user: AccountUser | null) => {
    current = user;
    listener(user);
  };
  const driver = {
    /** Check that delayed work still belongs to the captured account generation. */
    current: () => current,
    subscribe: vi.fn((next: (user: AccountUser | null) => void) => {
      listener = next;
      next(current);
      return () => {
        listener = () => {};
      };
    }),
    token: vi.fn(async () => 'firebase-id-token'),
    signIn: vi.fn(async () => {
      emit(alice);
    }),
    signUp: vi.fn(async () => {
      const created = { ...alice, verified: false };
      emit(created);
      return created;
    }),
    google: vi.fn(async () => {
      emit({ ...alice, providers: ['google.com'] });
    }),
    reset: vi.fn(async () => {}),
    verify: vi.fn(async () => {}),
    refresh: vi.fn(async () => current),
    linkGoogle: vi.fn(async () => {
      if (current) emit({ ...current, providers: ['password', 'google.com'] });
    }),
    linkPassword: vi.fn(async () => {
      if (current) emit({ ...current, providers: ['password', 'google.com'] });
    }),
    signOut: vi.fn(async () => {
      emit(null);
    }),
  } satisfies AccountDriver;
  return { driver, emit };
}
