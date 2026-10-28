import type { ReactNode } from 'react';
import Table from 'react-bootstrap/Table';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: 'start' | 'center' | 'end';
  width?: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: keyof T | ((row: T) => string | number);
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedKeys?: Array<string | number>;
  onToggleRow?: (key: string | number) => void;
  compact?: boolean;
}

function resolveKey<T>(row: T, rowKey: keyof T | ((row: T) => string | number), index: number): string | number {
  if (typeof rowKey === 'function') return rowKey(row);
  const value = row[rowKey];
  if (typeof value === 'string' || typeof value === 'number') return value;
  return index;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records yet.',
  onRowClick,
  selectedKeys = [],
  onToggleRow,
  compact = false,
}: DataTableProps<T>) {
  const selectionEnabled = Boolean(onToggleRow);

  if (!rows?.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-responsive">
      <Table className={`custom-table ${compact ? 'table-compact' : ''}`} hover={Boolean(onRowClick)}>
        <thead>
          <tr>
            {selectionEnabled && <th className="selection-cell" aria-label="Select" />}
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.align ? `text-${column.align}` : undefined}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = resolveKey(row, rowKey, index);
            const isSelected = selectedKeys.includes(key);

            return (
              <tr
                key={key}
                className={isSelected ? 'row-selected' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                role={onRowClick ? 'button' : undefined}
              >
                {selectionEnabled && (
                  <td
                    className="selection-cell"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleRow?.(key)}
                      aria-label={`Select row ${key}`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.align ? `text-${column.align}` : undefined}
                  >
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
