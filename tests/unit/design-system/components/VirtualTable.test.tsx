/**
 * Regression coverage and controlled fixtures for virtual table.
 * @packageDocumentation
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import VirtualTable, {
  type VirtualTableColumn,
} from '../../../../src/design-system/components/VirtualTable';

const data = [{ name: 'Row one' }];
const columns: VirtualTableColumn<(typeof data)[number]>[] = [
  {
    id: 'name',
    label: 'Name',
    width: 150,
    /** Extract the row value used for sorting and filtering.
     * @param row - Controlled table row.
     * @returns The row name used as the column's scalar value.
     */
    value: (row) => row.name,
    /** Render the table cell while preserving the row value used by actions and links.
     * @param row - Controlled table row.
     * @returns Its visible name.
     */
    cell: (row) => row.name,
  },
];

test.each([false, true])(
  'preserves row class tokens when clickable=%s',
  (clickable) => {
    render(
      <VirtualTable
        columns={columns}
        data={data}
        emptyLabel="No rows"
        filterPlaceholder="Filter rows"
        onRowClick={clickable ? vi.fn() : undefined}
      />,
    );
    const row = screen.getByRole('row', {
      name: 'Row one',
    });
    expect(row).toHaveClass('iris-table-row');
    if (clickable) expect(row).toHaveClass('iris-table-row--clickable');
    else expect(row).not.toHaveClass('iris-table-row--clickable');
  },
);

test('exposes sortable headers and indexed data rows inside a named table', async () => {
  render(
    <VirtualTable
      columns={columns}
      data={data}
      emptyLabel="No rows"
      filterPlaceholder="Filter rows"
    />,
  );
  const table = screen.getByRole('table', { name: 'rows' });
  expect(table).toHaveAttribute('aria-rowcount', '2');
  expect(table).toHaveAttribute('aria-colcount', '1');
  expect(screen.getByRole('row', { name: 'Row one' })).toHaveAttribute(
    'aria-rowindex',
    '2',
  );
  const header = within(table).getByRole('columnheader');
  expect(header).toHaveAttribute('aria-sort', 'none');
  const sort = within(header).getByRole('button');
  sort.focus();
  await userEvent.keyboard('{Enter}');
  expect(header).toHaveAttribute('aria-sort', 'ascending');
  await userEvent.keyboard(' ');
  expect(header).toHaveAttribute('aria-sort', 'descending');
});

test('provides a native keyboard action without replacing the row semantics', async () => {
  const onRowClick = vi.fn();
  render(
    <VirtualTable
      columns={columns}
      data={data}
      emptyLabel="No rows"
      filterPlaceholder="Filter rows"
      onRowClick={onRowClick}
    />,
  );
  const row = screen.getByRole('row', { name: 'Row one' });
  const action = within(row).getByRole('button', { name: 'Row one' });
  expect(within(row).getByRole('cell')).toContainElement(action);
  action.focus();
  await userEvent.keyboard('{Enter}');
  expect(onRowClick).toHaveBeenCalledTimes(1);
  await userEvent.keyboard(' ');
  expect(onRowClick).toHaveBeenCalledTimes(2);
  await userEvent.click(action);
  expect(onRowClick).toHaveBeenCalledTimes(3);
});
