import { readFile } from 'node:fs/promises';
import Dataset, { type DatasetDocument } from '../models/Dataset.js';
import Run from '../models/Run.js';
import type { DatasetData } from '../types/domain.js';
import type { DatasetPreviewResponse } from '@optitrader/shared';
import { AppError, NotFoundError } from '../utils/errors.js';
import { createId } from '../utils/ids.js';
import { validateAndParseCsv } from '../utils/csv.js';
import { defaultStorage, type DatasetStorageAdapter } from './storageAdapter.js';

export interface CreateDatasetInput {
  name: string;
  symbol: string;
  timeframe: string;
  dateRange?: string;
  date_range?: string;
  rows?: number;
  csvText?: string;
  csvBuffer?: Buffer;
  originalFilename?: string;
  status?: 'validated' | 'pending' | 'invalid';
}

export interface DatasetFile {
  path: string;
  checksum: string;
}

/**
 * Creates and stores a new dataset from CSV text or buffer.
 */
export async function createDataset(
  owner: string,
  input: CreateDatasetInput,
  storage: DatasetStorageAdapter = defaultStorage
): Promise<DatasetDocument> {
  let content = input.csvBuffer;
  if (!content && input.csvText) {
    content = Buffer.from(input.csvText, 'utf8');
  }

  if (!content) {
    throw new AppError('A valid CSV file or content is required.', 422, 'DATASET_METADATA_REQUIRED');
  }

  const csvString = content.toString('utf8');
  const validated = validateAndParseCsv(csvString);

  const datasetId = createId('ds');
  const saveResult = await storage.save(owner, datasetId, content);

  return Dataset.create({
    _id: datasetId,
    owner,
    name: input.name,
    symbol: input.symbol,
    timeframe: input.timeframe,
    date_range: validated.metadata.dateRange,
    rows: validated.metadata.rows,
    status: input.status || 'validated',
    file_ref: saveResult.fileRef,
    original_filename: input.originalFilename || `${input.name}.csv`,
  });
}

/**
 * Lists all datasets belonging to an owner.
 */
export async function listDatasets(owner: string): Promise<DatasetDocument[]> {
  return Dataset.find({ owner }).sort({ createdAt: -1 });
}

/**
 * Gets a specific dataset by ID and owner.
 */
export async function getDataset(owner: string, datasetId: string): Promise<DatasetDocument> {
  const dataset = await Dataset.findOne({ _id: datasetId, owner });
  if (!dataset) throw new NotFoundError('Dataset not found.');
  return dataset;
}

/**
 * Deletes a dataset if it is not referenced by any active or completed runs.
 */
export async function deleteDataset(
  owner: string,
  datasetId: string,
  storage: DatasetStorageAdapter = defaultStorage
): Promise<void> {
  const dataset = await getDataset(owner, datasetId);

  // Check referential integrity: reject if used in runs
  const runInUse = await Run.exists({ dataset_id: datasetId, owner });
  if (runInUse) {
    throw new AppError(
      'Cannot delete dataset because it is referenced by existing runs. Archive or remove associated runs first.',
      409,
      'DATASET_IN_USE'
    );
  }

  if (dataset.file_ref) {
    await storage.delete(dataset.file_ref);
  }

  await Dataset.deleteOne({ _id: dataset._id, owner });
}

/**
 * Retrieves the first preview rows for a dataset.
 */
export async function getDatasetPreview(
  owner: string,
  datasetId: string,
  storage: DatasetStorageAdapter = defaultStorage
): Promise<DatasetPreviewResponse> {
  const dataset = await getDataset(owner, datasetId);

  if (!dataset.file_ref) {
    throw new NotFoundError('Dataset file is missing.');
  }

  const localPath = await storage.getLocalPath(dataset.file_ref);
  const exists = await storage.exists(dataset.file_ref);
  if (!exists) {
    throw new NotFoundError('Dataset file not found on disk.');
  }

  const content = await readFile(localPath, 'utf8');
  const validated = validateAndParseCsv(content);

  return {
    dataset_id: dataset._id,
    name: dataset.name,
    symbol: dataset.symbol,
    timeframe: dataset.timeframe,
    total_rows: validated.metadata.rows,
    columns: validated.metadata.columns ?? ['timestamp', 'open', 'high', 'low', 'close', 'volume'],
    preview_rows: validated.previewRows,
  };
}

/**
 * Resolves the absolute local filesystem path for a dataset's stored CSV file.
 */
export async function resolveDatasetPath(
  dataset: DatasetData,
  storage: DatasetStorageAdapter = defaultStorage
): Promise<string | null> {
  if (!dataset.file_ref) return null;
  return storage.getLocalPath(dataset.file_ref);
}

/**
 * Ensures the physical CSV file exists on disk and returns its path and sha256 checksum.
 */
export async function ensureDatasetFile(
  dataset: DatasetData,
  storage: DatasetStorageAdapter = defaultStorage
): Promise<DatasetFile> {
  if (!dataset.file_ref) {
    throw new NotFoundError(`Dataset ${dataset._id} has no file reference associated.`);
  }

  const exists = await storage.exists(dataset.file_ref);
  if (!exists) {
    throw new NotFoundError(`Dataset file not found for ${dataset._id}.`);
  }

  const localPath = await storage.getLocalPath(dataset.file_ref);
  const buffer = await readFile(localPath);
  const { checksumBuffer } = await import('../utils/runHash.js');

  return {
    path: localPath,
    checksum: checksumBuffer(buffer),
  };
}
