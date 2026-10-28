import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Dataset, { type DatasetDocument } from '../models/Dataset.js';
import type { CsvMetadata, DatasetData } from '../types/domain.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { createId } from '../utils/ids.js';
import { parseCsvMetadata } from '../utils/csv.js';
import { checksumBuffer } from '../utils/runHash.js';

const UPLOAD_DIR = fileURLToPath(new URL('../uploads/', import.meta.url));

export interface CreateDatasetInput {
  name: string;
  symbol: string;
  timeframe: string;
  dateRange?: string;
  date_range?: string;
  rows?: number;
  csvText?: string;
  status?: 'validated' | 'pending' | 'invalid';
}

export interface DatasetFile {
  path: string;
  checksum: string;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return function random(): number {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(value: string): number {
  return Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16);
}

function startDateFor(dataset: DatasetData): Date {
  const first = String(dataset.date_range || '').split(' to ')[0];
  const parsed = new Date(first ?? '');
  if (!Number.isNaN(parsed.valueOf())) return parsed;
  return new Date(Date.now() - (dataset.rows || 500) * 24 * 60 * 60 * 1000);
}

function buildSyntheticCsv(dataset: DatasetData): string {
  const rows = Math.min(Math.max(Number(dataset.rows) || 500, 260), 5000);
  const random = mulberry32(seedFromString(dataset._id));
  const start = startDateFor(dataset);
  const lines = ['timestamp,open,high,low,close,volume'];
  let price = 1.05 + random() * 0.4;

  for (let index = 0; index < rows; index += 1) {
    const timestamp = new Date(start.getTime() + index * 60 * 60 * 1000).toISOString();
    const drift = (random() - 0.48) * 0.004;
    const open = price;
    const close = Math.max(0.0001, open * (1 + drift));
    const high = Math.max(open, close) * (1 + random() * 0.0025);
    const low = Math.min(open, close) * (1 - random() * 0.0025);
    const volume = Math.round(800 + random() * 9000);
    lines.push(`${timestamp},${open.toFixed(5)},${high.toFixed(5)},${low.toFixed(5)},${close.toFixed(5)},${volume}`);
    price = close;
  }

  return lines.join('\n');
}

export function resolveDatasetPath(dataset: DatasetData): string | null {
  if (!dataset.file_ref) return null;
  return fileURLToPath(new URL(`../${dataset.file_ref}`, import.meta.url));
}

export async function createDataset(owner: string, input: CreateDatasetInput): Promise<DatasetDocument> {
  if (!input.csvText && !input.rows) {
    throw new AppError('Provide CSV content or a row count.', 422, 'DATASET_METADATA_REQUIRED');
  }

  const datasetId = createId('ds');
  let parsed: CsvMetadata | null = null;
  let fileRef: string | null = null;
  let originalFilename: string | null = null;

  if (input.csvText) {
    parsed = parseCsvMetadata(input.csvText);
    await mkdir(UPLOAD_DIR, { recursive: true });
    fileRef = `uploads/${datasetId}.csv`;
    originalFilename = `${input.name}.csv`;
    await writeFile(fileURLToPath(new URL(`../${fileRef}`, import.meta.url)), input.csvText, 'utf8');
  }

  return Dataset.create({
    _id: datasetId,
    owner,
    name: input.name,
    symbol: input.symbol,
    timeframe: input.timeframe,
    date_range: input.dateRange || input.date_range || parsed?.dateRange || '—',
    rows: parsed?.rows ?? input.rows ?? 0,
    status: input.status || 'validated',
    file_ref: fileRef,
    original_filename: originalFilename,
  });
}

export async function listDatasets(owner: string): Promise<DatasetDocument[]> {
  return Dataset.find({ owner }).sort({ createdAt: -1 });
}

export async function getDataset(owner: string, datasetId: string): Promise<DatasetDocument> {
  const dataset = await Dataset.findOne({ _id: datasetId, owner });
  if (!dataset) throw new NotFoundError('Dataset not found.');
  return dataset;
}

export async function deleteDataset(owner: string, datasetId: string): Promise<void> {
  const dataset = await getDataset(owner, datasetId);
  const path = resolveDatasetPath(dataset.toObject());
  if (path && existsSync(path)) {
    await unlink(path).catch(() => undefined);
  }
  await Dataset.deleteOne({ _id: dataset._id, owner });
}

export async function ensureDatasetFile(dataset: DatasetData): Promise<DatasetFile> {
  const existing = resolveDatasetPath(dataset);
  if (existing && existsSync(existing)) {
    const buffer = await readFile(existing);
    return { path: existing, checksum: checksumBuffer(buffer) };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileRef = `uploads/${dataset._id}.csv`;
  const path = fileURLToPath(new URL(`../${fileRef}`, import.meta.url));
  const csv = buildSyntheticCsv(dataset);
  await writeFile(path, csv, 'utf8');
  await Dataset.updateOne({ _id: dataset._id }, { file_ref: fileRef });

  return { path, checksum: checksumBuffer(Buffer.from(csv)) };
}
