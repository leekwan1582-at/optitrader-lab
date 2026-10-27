import type { Request, Response } from 'express';
import { createDataset, deleteDataset, listDatasets, type CreateDatasetInput } from '../services/datasetService.js';

export async function index(request: Request, response: Response): Promise<void> {
  const datasets = await listDatasets(request.user!.id);
  response.json(datasets);
}

export async function create(request: Request, response: Response): Promise<void> {
  const dataset = await createDataset(request.user!.id, request.body as CreateDatasetInput);
  response.status(201).json(dataset);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteDataset(request.user!.id, request.params.id as string);
  response.status(204).end();
}
