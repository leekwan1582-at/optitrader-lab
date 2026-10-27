import type { Request, Response } from 'express';
import Dataset from '../models/Dataset.js';
import { parsePrompt } from '../services/assistantService.js';
import type { DatasetData } from '../types/domain.js';
import { AppError } from '../utils/errors.js';

export async function assistant(request: Request, response: Response): Promise<void> {
  const datasets = await Dataset.find({ owner: request.user!.id }).sort({ createdAt: -1 }).lean<DatasetData[]>();
  if (!datasets.length) {
    throw new AppError('Upload a dataset before asking the assistant to configure a run.', 422, 'NO_DATASETS');
  }

  const body = request.body as { prompt: string };
  const parsed = await parsePrompt({
    prompt: body.prompt,
    datasets,
    config: request.app.locals.config,
  });

  response.json(parsed);
}
