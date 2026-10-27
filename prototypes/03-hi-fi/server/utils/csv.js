import { AppError } from './errors.js';

const REQUIRED_COLUMNS = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];

export function parseCsvMetadata(text) {
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    throw new AppError('The CSV is empty.', 422, 'INVALID_CSV');
  }

  const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new AppError(`CSV is missing required columns: ${missing.join(', ')}.`, 422, 'INVALID_CSV');
  }

  const seen = new Set();
  for (let index = 1; index < lines.length; index += 1) {
    const timestamp = lines[index].split(',')[0]?.trim();
    if (!timestamp) continue;
    if (seen.has(timestamp)) {
      throw new AppError(`Duplicate timestamp on row ${index + 1}: ${timestamp}.`, 422, 'DUPLICATE_TIMESTAMP');
    }
    seen.add(timestamp);
  }

  const firstTimestamp = lines[1]?.split(',')[0]?.trim();
  const lastTimestamp = lines[lines.length - 1]?.split(',')[0]?.trim();
  const firstDate = firstTimestamp ? new Date(firstTimestamp) : null;
  const lastDate = lastTimestamp ? new Date(lastTimestamp) : null;
  const validDates = firstDate && lastDate
    && !Number.isNaN(firstDate.valueOf())
    && !Number.isNaN(lastDate.valueOf());

  return {
    rows: lines.length - 1,
    dateRange: validDates
      ? `${firstDate.toISOString().slice(0, 10)} to ${lastDate.toISOString().slice(0, 10)}`
      : '—',
    firstDate: validDates ? firstDate : null,
    lastDate: validDates ? lastDate : null,
  };
}
