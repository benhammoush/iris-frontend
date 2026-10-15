import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import VirtualTable, { type VirtualTableColumn } from './VirtualTable';

const data = [{ name: 'Row one' }];
const columns: VirtualTableColumn<(typeof data)[number]>[] = [
  {
    id: 'name',
    label: 'Name',
    width: 150,
    value: (row) => row.name,
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
    const row = screen.getByRole(clickable ? 'button' : 'row', {
      name: 'Row one',
    });
    expect(row).toHaveClass('iris-table-row');
    if (clickable) expect(row).toHaveClass('iris-table-row--clickable');
    else expect(row).not.toHaveClass('iris-table-row--clickable');
  },
);
