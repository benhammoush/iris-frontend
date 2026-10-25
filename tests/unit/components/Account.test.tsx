/**
 * Regression coverage and controlled fixtures for account.
 * @packageDocumentation
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AccountProvider } from '../../../src/contexts/AccountContext';
import { createFirebaseDriver } from '../../../src/auth/firebaseDriver';
import { alice, fakeDriver } from '../auth/testSupport';
import Account from '../../../src/components/Account';

vi.mock('../../../src/auth/config', () => ({
  accountsEnabled: true,
  accountsConfigured: true,
}));
vi.mock('../../../src/auth/firebaseDriver', () => ({
  createFirebaseDriver: vi.fn(),
}));
vi.mock('../../../src/components/Navbar', () => ({
  /** Render the minimal navigation substitute used to isolate this component test.
   * @returns A public navigation landmark.
   */
  default: () => <nav>Public navigation</nav>,
}));
let fake = fakeDriver();
beforeEach(() => {
  fake = fakeDriver();
  vi.mocked(createFirebaseDriver).mockImplementation(() =>
    Promise.resolve(fake.driver),
  );
});
/** Open the controlled account or watchlist view for the UI test.
 * @returns User-event controls after the sign-in view is ready.
 */
async function open() {
  render(
    <MemoryRouter>
      <AccountProvider>
        <Account />
      </AccountProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Sign in' });
  return userEvent.setup();
}

test('email sign-in never saves automatically and sign-out clears the account', async () => {
  const user = await open();
  await user.type(screen.getByLabelText('Email address'), 'alice@example.test');
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'password123',
  );
  await user.click(screen.getByRole('button', { name: 'Sign in with email' }));
  expect(fake.driver.signIn).toHaveBeenCalledWith(
    'alice@example.test',
    'password123',
  );
  expect(await screen.findByText('alice@example.test')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Signed in' })).toHaveFocus();
  expect(screen.getByText(/Nothing is saved automatically/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Sign in' })).toHaveFocus();
  expect(screen.queryByText('alice@example.test')).not.toBeInTheDocument();
});

test('signup exposes verification and refresh, not private data', async () => {
  const user = await open();
  await user.click(screen.getByRole('button', { name: 'Create an account' }));
  await user.type(screen.getByLabelText('Email address'), 'alice@example.test');
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'password123',
  );
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(
    await screen.findByText(
      'Verify your email before using private watchlists.',
    ),
  ).toBeVisible();
  await user.click(
    screen.getByRole('button', { name: 'Resend verification email' }),
  );
  expect(fake.driver.verify).toHaveBeenCalledTimes(2);
  fake.driver.refresh.mockResolvedValueOnce(alice);
  await user.click(
    screen.getByRole('button', { name: 'I have verified my email' }),
  );
  expect(await screen.findByText('Email verified.')).toBeVisible();
});

test('verification failure survives the signup remount without retaining a password', async () => {
  const user = await open();
  fake.driver.verify.mockRejectedValueOnce(new Error('raw verification error'));
  await user.click(screen.getByRole('button', { name: 'Create an account' }));
  await user.type(screen.getByLabelText('Email address'), 'alice@example.test');
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'password123',
  );
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'verification email could not be requested',
  );
  expect(screen.getByLabelText('Current password')).toHaveValue('');
  await user.click(
    screen.getByRole('button', { name: 'Resend verification email' }),
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(
    screen.getByText(/Check your inbox; delivery may take a moment/),
  ).toBeVisible();
});

test('reset response never enumerates known or unknown accounts or raw errors', async () => {
  const user = await open();
  fake.driver.reset.mockRejectedValue({
    code: 'auth/user-not-found',
    message: 'raw email/token diagnostics',
  });
  await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
  await user.type(
    screen.getByLabelText('Email address'),
    'unknown@example.test',
  );
  await user.click(
    screen.getByRole('button', { name: 'Send reset instructions' }),
  );
  expect(
    await screen.findByText(
      /If this email can receive password-reset instructions/,
    ),
  ).toBeVisible();
  expect(screen.queryByText(/raw email/)).not.toBeInTheDocument();
});

test('explicit linking reports credential conflicts without merging accounts', async () => {
  const user = await open();
  act(() => fake.emit(alice));
  fake.driver.linkGoogle.mockRejectedValue({
    code: 'auth/credential-already-in-use',
  });
  await user.type(screen.getByLabelText('Current password'), 'password123');
  await user.click(
    screen.getByRole('button', { name: 'Link Google to this account' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'accounts and lists will not be merged',
  );
  expect(fake.driver.signIn).not.toHaveBeenCalled();
  expect(screen.getByText('alice@example.test')).toBeVisible();
  expect(screen.getByLabelText('Current password')).toHaveValue('');
});

test('failed sign-out keeps its retry control after a later null identity event', async () => {
  const user = await open();
  act(() => fake.emit(alice));
  fake.driver.signOut.mockRejectedValueOnce(new Error('cleanup failed'));
  await user.click(screen.getByRole('button', { name: /^Sign out$/ }));
  expect(
    await screen.findByRole('button', { name: 'Retry sign out' }),
  ).toBeVisible();
  act(() => fake.emit(null));
  await user.click(screen.getByRole('button', { name: 'Retry sign out' }));
  expect(fake.driver.signOut).toHaveBeenCalledTimes(2);
  expect(
    screen.queryByRole('button', { name: 'Retry sign out' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Sign in with email' }),
  ).toBeEnabled();
});

test('Google and password linking are separate explicit actions', async () => {
  const user = await open();
  await user.click(
    screen.getByRole('button', { name: 'Continue with Google' }),
  );
  expect(fake.driver.google).toHaveBeenCalledTimes(1);
  await user.type(screen.getByLabelText('New password'), 'password123');
  await user.click(
    screen.getByRole('button', { name: 'Add email and password' }),
  );
  expect(fake.driver.linkPassword).toHaveBeenCalledWith('password123');
  expect(await screen.findByText('Email and password · Google')).toBeVisible();
});
