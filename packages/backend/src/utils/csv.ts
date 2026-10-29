import type { CsvMetadata } from '../types/domain.js';
import type { DatasetRow } from '@optitrader/shared';
import { AppError } from './errors.js';

const REQUIRED_COLUMNS = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];

export interface ValidatedCsvResult {
  metadata: CsvMetadata;
  previewRows: DatasetRow[];
}

export function validateAndParseCsv(text: string): ValidatedCsvResult {
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    throw new AppError('The CSV file is empty.', 422, 'INVALID_CSV');
  }

  const headerLine = lines[0];
  if (!headerLine) {
    throw new AppError('The CSV file is empty.', 422, 'INVALID_CSV');
  }

  const headers = headerLine.split(',').map((header) => header.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new AppError(
      `CSV is missing required OHLCV columns: ${missing.join(', ')}.`,
      422,
      'INVALID_CSV_HEADERS'
    );
  }

  const colIdx = {
    timestamp: headers.indexOf('timestamp'),
    open: headers.indexOf('open'),
    high: headers.indexOf('high'),
    low: headers.indexOf('low'),
    close: headers.indexOf('close'),
    volume: headers.indexOf('volume'),
  };

  const seenTimestamps = new Set<string>();
  const previewRows: DatasetRow[] = [];
  let previousTime = -Infinity;

  for (let index = 1; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!rawLine) continue;
    const parts = rawLine.split(',').map((p) => p.trim());

    const timestampStr = parts[colIdx.timestamp];
    if (!timestampStr) {
      throw new AppError(`Missing timestamp on row ${index + 1}.`, 422, 'INVALID_CSV');
    }

    if (seenTimestamps.has(timestampStr)) {
      throw new AppError(
        `Duplicate timestamp on row ${index + 1}: ${timestampStr}.`,
        422,
        'DUPLICATE_TIMESTAMP'
      );
    }
    seenTimestamps.add(timestampStr);

    const dateVal = new Date(timestampStr).getTime();
    if (Number.isNaN(dateVal)) {
      throw new AppError(`Invalid date format on row ${index + 1}: ${timestampStr}.`, 422, 'INVALID_CSV');
    }

    if (dateVal < previousTime) {
      throw new AppError(
        `Row ${index + 1}: Timestamps must be in chronological ascending order.`,
        422,
        'TIMESTAMPS_NOT_ORDERED'
      );
    }
    previousTime = dateVal;

    const open = Number(parts[colIdx.open]);
    const high = Number(parts[colIdx.high]);
    const low = Number(parts[colIdx.low]);
    const close = Number(parts[colIdx.close]);
    const volume = Number(parts[colIdx.volume]);

    if (!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close) || !Number.isFinite(volume)) {
      throw new AppError(`Row ${index + 1}: Non-numeric price or volume values detected.`, 422, 'INVALID_PRICE_VALUES');
    }

    if (open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0) {
      throw new AppError(`Row ${index + 1}: Price must be positive and volume non-negative.`, 422, 'INVALID_PRICE_VALUES');
    }

    if (high < low || high < open || high < close) {
      throw new AppError(`Row ${index + 1}: High price must be >= low, open, and close.`, 422, 'INVALID_PRICE_VALUES');
    }

    if (previewRows.length < 10) {
      previewRows.push({
        timestamp: timestampStr,
        open,
        high,
        low,
        close,
        volume,
      });
    }
  }

  const firstTimestamp = lines[1]?.split(',')[colIdx.timestamp]?.trim();
  const lastTimestamp = lines[lines.length - 1]?.split(',')[colIdx.timestamp]?.trim();
  const firstDate = firstTimestamp ? new Date(firstTimestamp) : null;
  const lastDate = lastTimestamp ? new Date(lastTimestamp) : null;
  const validDates = firstDate && lastDate
    && !Number.isNaN(firstDate.valueOf())
    && !Number.isNaN(lastDate.valueOf());

  return {
    metadata: {
      rows: lines.length - 1,
      dateRange: validDates
        ? `${firstDate.toISOString().slice(0, 10)} to ${lastDate.toISOString().slice(0, 10)}`
        : '—',
      firstDate: validDates ? firstDate : null,
      lastDate: validDates ? lastDate : null,
      columns: REQUIRED_COLUMNS,
    },
    previewRows,
  };
}

export function parseCsvMetadata(text: string): CsvMetadata {
  return validateAndParseCsv(text).metadata;
}
