import { vi } from 'vitest';
import type { AccountDriver, AccountUser } from './session';

export const alice: AccountUser = {
  uid: 'alice',
  email: 'alice@example.test',
  verified: true,
  providers: ['password'],
};
export function fakeDriver(initial: AccountUser | null = null) {
  let current = initial;
  let listener: (user: AccountUser | null) => void = () => {};
  const emit = (user: AccountUser | null) => {
    current = user;
    listener(user);
  };
  const driver = {
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
