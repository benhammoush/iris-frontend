/**
 * Shared sign-out visibility across Account actions and navigation remounts.
 * @packageDocumentation
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import Account from '../../../src/components/Account';
import Navbar from '../../../src/components/Navbar';
import { AccountProvider } from '../../../src/contexts/AccountContext';
import { ThemeProvider } from '../../../src/design-system';
import { createFirebaseDriver } from '../../../src/auth/firebaseDriver';
import { alice, fakeDriver } from '../auth/testSupport';

vi.mock('../../../src/auth/config', () => ({
  accountsEnabled: true,
  accountsConfigured: true,
}));
vi.mock('../../../src/auth/firebaseDriver', () => ({
  createFirebaseDriver: vi.fn(),
}));

test.each([false, true])(
  'Account sign-out remains pending after Navbar remount (failure: %s)',
  async (fails) => {
    const fake = fakeDriver(alice);
    /** Complete the deferred persistence cleanup. */
    let finish = () => {};
    /** Reject the deferred persistence cleanup.
     * @param _cause - Controlled cleanup failure.
     */
    let fail = (_cause: Error) => {};
    const cleanup = new Promise<void>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    });
    fake.driver.signOut.mockImplementation(() => cleanup);
    vi.mocked(createFirebaseDriver).mockResolvedValue(fake.driver);
    render(
      <MemoryRouter initialEntries={['/account']}>
        <ThemeProvider>
          <AccountProvider>
            <Link to="/other">Leave account</Link>
            <Routes>
              <Route path="/account" element={<Account />} />
              <Route path="/other" element={<Navbar />} />
            </Routes>
          </AccountProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(screen.getAllByText('Signing out…')[0]).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Log in' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Leave account' }));
    expect(screen.getAllByText('Signing out…')[0]).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Sign up' }),
    ).not.toBeInTheDocument();
    await act(async () => {
      if (fails) fail(new Error('cleanup failed'));
      else {
        fake.emit(null);
        finish();
      }
      await cleanup.catch(() => {});
    });
    expect(screen.queryByText('Signing out…')).not.toBeInTheDocument();
    if (fails) {
      expect(screen.getByRole('link', { name: 'Account' })).toBeVisible();
      expect(
        screen.queryByRole('link', { name: 'Log in' }),
      ).not.toBeInTheDocument();
    } else expect(screen.getByRole('link', { name: 'Log in' })).toBeVisible();
  },
);
