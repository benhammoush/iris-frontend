/**
 * Regression coverage and controlled fixtures for navbar.
 * @packageDocumentation
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../../../src/components/Navbar';
import { ThemeProvider } from '../../../src/design-system';
import { useAccount } from '../../../src/contexts/AccountContext';
import { AccountSession } from '../../../src/auth/session';
import { alice } from '../auth/testSupport';
import { useCatalog } from '../../../src/contexts/CatalogContext';

vi.mock('../../../src/contexts/CatalogContext', () => ({
  useCatalog: vi.fn(),
}));

vi.mock('../../../src/auth/config', () => ({
  accountsEnabled: true,
  accountsConfigured: true,
}));
vi.mock('../../../src/contexts/AccountContext', () => ({
  useAccount: vi.fn(),
}));
let session: AccountSession;

/** Build a complete account snapshot without invoking a provider SDK.
 * @param overrides - Account state to expose to this navigation test.
 * @returns A typed account view backed by an isolated session.
 */
function accountState(overrides: Partial<ReturnType<typeof useAccount>> = {}) {
  return {
    ...session.snapshot(),
    status: 'ready' as const,
    session,
    ...overrides,
  };
}

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  session = new AccountSession(false);
  vi.mocked(useAccount).mockReturnValue(accountState());
  vi.mocked(useCatalog).mockReturnValue({ assets: [], loading: true });
});

/** Open navigation with controlled account state and theme ownership.
 * @returns User controls for interacting with the disclosure.
 */
function openNavbar() {
  render(
    <BrowserRouter>
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    </BrowserRouter>,
  );
  return userEvent.setup();
}

test('renders loading skeletons for the navbar market summaries', () => {
  render(
    <BrowserRouter>
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    </BrowserRouter>,
  );
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'tabindex',
    '0',
  );

  expect(
    screen.getByLabelText('Loading Jupiter market summary'),
  ).toHaveAttribute('aria-busy', 'true');
  expect(
    screen.getByLabelText('Loading Helius network summary'),
  ).toHaveAttribute('aria-busy', 'true');
  expect(
    screen.getByLabelText('Loading Jupiter market summary'),
  ).toHaveTextContent('SOL MCAP 24HVOL');
  expect(
    screen.getByLabelText('Loading Helius network summary'),
  ).toHaveTextContent('TPS TRUE TPS AVG FEE');
});

test('opens and closes the mobile search control', async () => {
  const user = userEvent.setup();
  render(
    <BrowserRouter>
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    </BrowserRouter>,
  );

  await user.click(screen.getByRole('button', { name: 'Open search' }));
  const input = screen.getByRole('combobox');
  expect(input).toHaveFocus();
  expect(
    screen.getByRole('button', { name: 'Close search' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Close search' }));
  expect(input.closest('.iris-search')).not.toHaveAttribute('data-mobile-open');
  expect(screen.getByRole('button', { name: 'Open search' })).toHaveFocus();
});

test.each([undefined, new Error('Market unavailable')])(
  'keeps Jupiter labels and unavailable values when no market data exists (error: %s)',
  (error) => {
    vi.mocked(useCatalog).mockReturnValue({
      assets: [],
      loading: false,
      error,
    });
    openNavbar();
    const summary = screen.getByRole('region', { name: 'SOL market summary' });
    expect(summary).toBeVisible();
    expect(summary).toHaveTextContent('SOL —MCAP —24HVOL —');
    expect(within(summary).getAllByText('—')).toHaveLength(3);
    expect(summary).not.toHaveAttribute('aria-busy', 'true');
    expect(
      screen.queryByLabelText('Loading Jupiter market summary'),
    ).not.toBeInTheDocument();
  },
);

test('returns focus to the mobile search trigger on Escape', async () => {
  const user = userEvent.setup();
  render(
    <BrowserRouter>
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    </BrowserRouter>,
  );

  const trigger = screen.getByRole('button', { name: 'Open search' });
  await user.click(trigger);
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('offers distinct login and signup destinations only after signed-out state is known', () => {
  vi.mocked(useAccount).mockReturnValue(accountState({ status: 'loading' }));
  const { rerender } = render(
    <BrowserRouter>
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    </BrowserRouter>,
  );
  expect(
    screen
      .getAllByRole('status')
      .some((node) => node.textContent?.includes('Checking account')),
  ).toBe(true);
  expect(
    screen.queryByRole('link', { name: 'Log in' }),
  ).not.toBeInTheDocument();
  vi.mocked(useAccount).mockReturnValue(accountState());
  rerender(
    <BrowserRouter>
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    </BrowserRouter>,
  );
  expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
    'href',
    '/account',
  );
  expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
    'href',
    '/account?mode=signup',
  );
  expect(
    screen.queryByRole('button', { name: 'Account menu' }),
  ).not.toBeInTheDocument();
});

test('signed-in account menu restores focus and signs out through the session guard', async () => {
  vi.mocked(useAccount).mockReturnValue(accountState({ user: alice }));
  const signOut = vi.spyOn(session, 'signOut').mockImplementation(() => {
    vi.mocked(useAccount).mockReturnValue(accountState());
    return Promise.resolve();
  });
  const user = openNavbar();
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  expect(
    screen.queryByRole('link', { name: 'Log in' }),
  ).not.toBeInTheDocument();
  await user.click(trigger);
  const menu = screen.getByRole('navigation', {
    name: 'Account and navigation',
  });
  expect(within(menu).getByRole('link', { name: 'Account' })).toHaveAttribute(
    'href',
    '/account',
  );
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.click(within(menu).getByRole('button', { name: 'Sign out' }));
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(window.location.pathname).toBe('/account');
  expect(await screen.findByRole('link', { name: 'Log in' })).toBeVisible();
});

test('routes failed sign-out to account recovery instead of offering a fresh login', async () => {
  vi.mocked(useAccount).mockReturnValue(accountState({ user: alice }));
  vi.spyOn(session, 'signOut').mockImplementation(() => {
    vi.mocked(useAccount).mockReturnValue(
      accountState({ signOutFailed: true }),
    );
    return Promise.reject(new Error('provider failure'));
  });
  const user = openNavbar();
  await user.click(screen.getByRole('button', { name: 'Account menu' }));
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(window.location.pathname).toBe('/account');
  expect(await screen.findByRole('link', { name: 'Account' })).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Log in' }),
  ).not.toBeInTheDocument();
});

test('retained deletion status remains reachable instead of advertising a new signup', () => {
  vi.mocked(useAccount).mockReturnValue(
    accountState({
      deletion: {
        status: 'deleting',
        receipt: 'synthetic-receipt',
        expiresAt: '2026-11-01T15:00:00.000Z',
      },
    }),
  );
  openNavbar();
  expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute(
    'href',
    '/account',
  );
  expect(
    screen.queryByRole('link', { name: 'Sign up' }),
  ).not.toBeInTheDocument();
});
