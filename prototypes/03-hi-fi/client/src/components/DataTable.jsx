import { Table } from 'react-bootstrap';

function resolveKey(row, rowKey, index) {
  if (typeof rowKey === 'function') return rowKey(row);
  if (typeof rowKey === 'string') return row[rowKey] ?? index;
  return index;
}

export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  emptyMessage = 'No records yet.',
  onRowClick,
  selectedKeys = [],
  onToggleRow,
  compact = false,
}) {
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
                      onChange={() => onToggleRow(key)}
                      aria-label={`Select row ${key}`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.align ? `text-${column.align}` : undefined}
                  >
                    {column.render ? column.render(row) : row[column.key] ?? '—'}
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
