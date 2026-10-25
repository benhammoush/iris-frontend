/**
 * Virtualized data rows with filtering, sorting and optional client-side pagination.
 * @packageDocumentation
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

/** Stable column identity with independent sorting value and rendered cell contracts. */
export interface VirtualTableColumn<T> {
  id: string;
  label: string;
  width: number;
  /** Extract the row value used for sorting and filtering.
   * @param row - Row backing this column's cell.
   * @returns The column's sortable and filterable scalar value.
   */
  value: (row: T) => string | number;
  /** Render the table cell while preserving the row value used by actions and links.
   * @param row - Row backing this column's cell.
   * @returns Rendered cell content, independently of its sorting/filtering value.
   */
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  grow?: number;
}

/** Inputs and owner callbacks accepted by VirtualTable. */
interface Props<T> {
  columns: VirtualTableColumn<T>[];
  data: T[];
  emptyLabel: string;
  filterPlaceholder: string;
  /** Notify the owner that the identified table row was activated.
   * @param row - Exact row activated by the user.
   */
  onRowClick?: (row: T) => void;
  rowHeight?: number;
  pageSize?: number;
  loading?: boolean;
}

/** Render a bounded visible row window with controlled sorting, filtering and optional pagination.
 * @param props - Column contracts, source rows, accessible labels and optional row/pagination controls.
 * @returns A virtualized table retaining controlled filter, sort and optional page state.
 */
export default function VirtualTable<T>(props: Props<T>) {
  const {
    columns,
    data,
    emptyLabel,
    filterPlaceholder,
    onRowClick,
    rowHeight = 42,
    pageSize,
    loading = false,
  } = props;
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{
    id: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const rows = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const filtered = query
      ? data.filter((row) =>
          columns.some((column) =>
            String(column.value(row)).toLowerCase().includes(query),
          ),
        )
      : [...data];
    if (!sort) return filtered;
    const column = columns.find(({ id }) => id === sort.id);
    if (!column) return filtered;
    return filtered.sort(
      (left, right) =>
        String(column.value(left)).localeCompare(
          String(column.value(right)),
          undefined,
          { numeric: true },
        ) * (sort.direction === 'asc' ? 1 : -1),
    );
  }, [columns, data, filter, sort]);
  const totalPages = pageSize
    ? Math.max(1, Math.ceil(rows.length / pageSize))
    : 1;
  const currentPage = Math.min(page, totalPages);
  const displayedRows = pageSize
    ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : rows;
  useEffect(() => {
    setPage(1);
  }, [filter, sort]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const virtualizer = useVirtualizer({
    count: displayedRows.length,
    /** Resolve the owned scrolling element used by row virtualization.
     * @returns The scrolling element, or null before its ref is attached.
     */
    getScrollElement: () => scrollRef.current,
    /** Return the configured row-height estimate used by virtualization.
     * @returns The row-height estimate in CSS pixels.
     */
    estimateSize: () => rowHeight,
    overscan: 12,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const renderedRows = virtualRows.length
    ? virtualRows
    : displayedRows.map((_, index) => ({
        index,
        key: index,
        start: index * rowHeight,
      }));

  /** Toggle the selected column sort direction while preserving column identity.
   * @param id - Stable identity of the activated column.
   */
  function toggleSort(id: string) {
    setSort((current) =>
      current?.id === id
        ? { id, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { id, direction: 'asc' },
    );
  }

  const placeholderRows = Array.from({ length: 7 }, (_, index) => index);
  return (
    <section className="iris-table-card" aria-busy={loading || undefined}>
      <div className="iris-table-toolbar">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={filterPlaceholder}
          aria-label={filterPlaceholder}
        />
        <span role="status">
          {filter ? `${rows.length} / ${data.length}` : data.length} rows
        </span>
      </div>
      {loading ? (
        <div
          className="iris-table-scroll"
          role="table"
          aria-label={filterPlaceholder.replace(/^Filter /i, '')}
          aria-busy="true"
          aria-colcount={columns.length}
          style={{
            height: Math.min(
              Math.max(
                placeholderRows.length * rowHeight + rowHeight,
                rowHeight * 2,
              ),
              360,
            ),
          }}
        >
          <div className="iris-table-head" role="row">
            {columns.map((column) => (
              <div
                role="columnheader"
                key={column.id}
                style={{
                  width: column.width,
                  ...(column.grow
                    ? { flex: `${column.grow} 1 ${column.width}px` }
                    : {}),
                }}
              >
                <button
                  className={`iris-table-cell iris-table-cell--${column.align || 'left'}`}
                  style={{ width: '100%' }}
                  disabled
                >
                  {column.label}
                </button>
              </div>
            ))}
          </div>
          <div
            aria-hidden="true"
            style={{
              height: placeholderRows.length * rowHeight,
              position: 'relative',
              minWidth: columns.reduce(
                (width, column) => width + column.width,
                0,
              ),
              width: '100%',
            }}
          >
            {placeholderRows.map((row) => (
              <div
                key={row}
                className="iris-table-row"
                style={{
                  height: rowHeight,
                  transform: `translateY(${row * rowHeight}px)`,
                }}
              >
                {columns.map((column, index) => (
                  <div
                    key={column.id}
                    style={{
                      width: column.width,
                      ...(column.grow
                        ? { flex: `${column.grow} 1 ${column.width}px` }
                        : {}),
                    }}
                    className={`iris-table-cell iris-table-cell--${column.align || 'left'}`}
                  >
                    <span
                      className="iris-value-skeleton"
                      style={{ width: `${Math.max(38, 76 - index * 7)}%` }}
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : !rows.length ? (
        <p className="iris-empty" role="status">
          {filter ? 'No rows match this search.' : emptyLabel}
        </p>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="iris-table-scroll"
            role="table"
            aria-label={filterPlaceholder.replace(/^Filter /i, '')}
            aria-rowcount={displayedRows.length + 1}
            aria-colcount={columns.length}
            style={{
              height: Math.min(
                Math.max(
                  displayedRows.length * rowHeight + rowHeight,
                  rowHeight * 2,
                ),
                360,
              ),
            }}
          >
            <div className="iris-table-head" role="row" aria-rowindex={1}>
              {columns.map((column) => (
                <div
                  role="columnheader"
                  aria-sort={
                    sort?.id !== column.id
                      ? 'none'
                      : sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                  }
                  key={column.id}
                  style={{
                    width: column.width,
                    ...(column.grow
                      ? { flex: `${column.grow} 1 ${column.width}px` }
                      : {}),
                  }}
                >
                  <button
                    type="button"
                    className={`iris-table-cell iris-table-cell--${column.align || 'left'}`}
                    style={{ width: '100%' }}
                    onClick={() => toggleSort(column.id)}
                  >
                    {column.label}{' '}
                    {sort?.id === column.id
                      ? sort.direction === 'asc'
                        ? '▲'
                        : '▼'
                      : '⇅'}
                  </button>
                </div>
              ))}
            </div>
            <div
              role="rowgroup"
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
                minWidth: columns.reduce(
                  (width, column) => width + column.width,
                  0,
                ),
                width: '100%',
              }}
            >
              {renderedRows.map((virtualRow) => {
                const row = displayedRows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    className={
                      onRowClick
                        ? 'iris-table-row iris-table-row--clickable'
                        : 'iris-table-row'
                    }
                    style={{
                      height: rowHeight,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => onRowClick?.(row)}
                    role="row"
                    aria-rowindex={virtualRow.index + 2}
                  >
                    {columns.map((column, columnIndex) => (
                      <div
                        role="cell"
                        key={column.id}
                        style={{
                          width: column.width,
                          ...(column.grow
                            ? { flex: `${column.grow} 1 ${column.width}px` }
                            : {}),
                        }}
                        className={`iris-table-cell iris-table-cell--${column.align || 'left'}`}
                      >
                        {onRowClick && columnIndex === 0 ? (
                          <button
                            type="button"
                            className="iris-table-row-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRowClick(row);
                            }}
                          >
                            {column.cell(row)}
                          </button>
                        ) : (
                          column.cell(row)
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          {pageSize && totalPages > 1 && (
            <div className="iris-pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
