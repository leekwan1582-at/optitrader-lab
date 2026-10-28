import type { Request, Response } from 'express';
import { currentUser } from '../utils/authContext.js';
import type { RunConfig } from '../types/domain.js';
import {
  compareRuns,
  deleteRun,
  getRun,
  launchRun,
  listRuns,
} from '../services/runService.js';

export async function index(request: Request, response: Response): Promise<void> {
  const runs = await listRuns(currentUser(request).id);
  response.json(runs);
}

export async function show(request: Request, response: Response): Promise<void> {
  const run = await getRun(currentUser(request).id, request.params.id as string);
  response.json(run);
}

export async function create(request: Request, response: Response): Promise<void> {
  const run = await launchRun(currentUser(request).id, request.body as RunConfig);
  response.status(201).json(run);
}

export async function compare(request: Request, response: Response): Promise<void> {
  const query = request.validatedQuery as { ids?: string };
  const ids = (query.ids ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const runs = await compareRuns(currentUser(request).id, ids);
  response.json(runs);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteRun(currentUser(request).id, request.params.id as string);
  response.status(204).end();
}
