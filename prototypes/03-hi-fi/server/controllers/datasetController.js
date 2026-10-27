import { createDataset, deleteDataset, listDatasets } from '../services/datasetService.js';

export async function index(request, response) {
  const datasets = await listDatasets(request.user.id);
  response.json(datasets);
}

export async function create(request, response) {
  const dataset = await createDataset(request.user.id, request.body);
  response.status(201).json(dataset);
}

export async function remove(request, response) {
  await deleteDataset(request.user.id, request.params.id);
  response.status(204).end();
}
