import {
  compareRuns,
  deleteRun,
  getRun,
  launchRun,
  listRuns,
} from '../services/runService.js';

export async function index(request, response) {
  const runs = await listRuns(request.user.id);
  response.json(runs);
}

export async function show(request, response) {
  const run = await getRun(request.user.id, request.params.id);
  response.json(run);
}

export async function create(request, response) {
  const run = await launchRun(request.user.id, request.body);
  response.status(201).json(run);
}

export async function compare(request, response) {
  const ids = request.validatedQuery.ids.split(',').map((id) => id.trim()).filter(Boolean);
  const runs = await compareRuns(request.user.id, ids);
  response.json(runs);
}

export async function remove(request, response) {
  await deleteRun(request.user.id, request.params.id);
  response.status(204).end();
}
