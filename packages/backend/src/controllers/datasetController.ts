import type { Request, Response } from 'express';
import { currentUser } from '../utils/authContext.js';
import {
  createDataset,
  deleteDataset,
  getDatasetPreview,
  listDatasets,
  type CreateDatasetInput,
} from '../services/datasetService.js';
import { toDatasetDTO } from '../serializers/index.js';

export async function index(request: Request, response: Response): Promise<void> {
  const datasets = await listDatasets(currentUser(request).id);
  response.json(datasets.map(toDatasetDTO));
}

export async function create(request: Request, response: Response): Promise<void> {
  const file = request.file;
  const body = request.body as CreateDatasetInput;

  const dataset = await createDataset(currentUser(request).id, {
    name: body.name,
    symbol: body.symbol,
    timeframe: body.timeframe,
    dateRange: body.dateRange || body.date_range,
    date_range: body.date_range || body.dateRange,
    rows: body.rows,
    csvText: body.csvText,
    csvBuffer: file?.buffer,
    originalFilename: file?.originalname,
    status: body.status,
  });

  response.status(201).json(toDatasetDTO(dataset));
}

export async function preview(request: Request, response: Response): Promise<void> {
  const previewData = await getDatasetPreview(currentUser(request).id, request.params.id as string);
  response.json(previewData);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteDataset(currentUser(request).id, request.params.id as string);
  response.status(204).end();
}
