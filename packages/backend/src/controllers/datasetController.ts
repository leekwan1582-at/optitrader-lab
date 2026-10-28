import type { Request, Response } from 'express';
import { currentUser } from '../utils/authContext.js';
import { createDataset, deleteDataset, listDatasets, type CreateDatasetInput } from '../services/datasetService.js';

export async function index(request: Request, response: Response): Promise<void> {
  const datasets = await listDatasets(currentUser(request).id);
  response.json(datasets);
}

export async function create(request: Request, response: Response): Promise<void> {
  const dataset = await createDataset(currentUser(request).id, request.body as CreateDatasetInput);
  response.status(201).json(dataset);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteDataset(currentUser(request).id, request.params.id as string);
  response.status(204).end();
}
