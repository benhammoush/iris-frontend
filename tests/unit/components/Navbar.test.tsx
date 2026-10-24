/**
 * Regression coverage and controlled fixtures for navbar.
 * @packageDocumentation
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../../../src/components/Navbar';
import { ThemeProvider } from '../../../src/design-system';

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
  ).toHaveTextContent('SOL : /MCAP : /24HVOL :');
  expect(
    screen.getByLabelText('Loading Helius network summary'),
  ).toHaveTextContent('TPS : /TRUE TPS : /AVG FEE :');
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
