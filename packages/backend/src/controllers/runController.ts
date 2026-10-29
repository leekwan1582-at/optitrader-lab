import type { Request, Response } from 'express';
import { currentUser } from '../utils/authContext.js';
import type { RunConfig } from '../types/domain.js';
import type { RunFilterQuery } from '@optitrader/shared';
import {
  cancelRun,
  compareRuns,
  deleteRun,
  getRun,
  getRunLogs,
  launchRun,
  listRunsPaginated,
  retryRun,
} from '../services/runService.js';
import { toRunDTO } from '../serializers/index.js';
import { processRegistry } from '../workers/processRegistry.js';

export async function index(request: Request, response: Response): Promise<void> {
  const query = (request.validatedQuery || request.query) as unknown as RunFilterQuery;
  const result = await listRunsPaginated(currentUser(request).id, query);
  response.json({
    ...result,
    items: result.items.map(toRunDTO),
  });
}

export async function show(request: Request, response: Response): Promise<void> {
  const run = await getRun(currentUser(request).id, request.params.id as string);
  response.json(toRunDTO(run));
}

export async function create(request: Request, response: Response): Promise<void> {
  const user = currentUser(request);
  const input = request.body as RunConfig;

  let activeRunId: string | null = null;

  // Client abort handling
  const onClose = () => {
    if (activeRunId && processRegistry.has(activeRunId)) {
      void processRegistry.cancel(activeRunId, 'Client connection closed');
    }
  };
  request.on('close', onClose);

  try {
    const run = await launchRun(user.id, input);
    activeRunId = run.run_id || run._id;
    response.status(201).json(toRunDTO(run));
  } finally {
    request.off('close', onClose);
  }
}

export async function cancel(request: Request, response: Response): Promise<void> {
  const run = await cancelRun(currentUser(request).id, request.params.id as string);
  response.json(toRunDTO(run));
}

export async function retry(request: Request, response: Response): Promise<void> {
  const run = await retryRun(currentUser(request).id, request.params.id as string);
  response.status(201).json(toRunDTO(run));
}

export async function logs(request: Request, response: Response): Promise<void> {
  const runLogs = await getRunLogs(currentUser(request).id, request.params.id as string);
  response.json(runLogs);
}

export async function compare(request: Request, response: Response): Promise<void> {
  const query = request.validatedQuery as { ids?: string };
  const ids = (query.ids ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const runs = await compareRuns(currentUser(request).id, ids);
  response.json(runs.map(toRunDTO));
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteRun(currentUser(request).id, request.params.id as string);
  response.status(204).end();
}
