import type { Request, Response } from 'express';
import { currentUser, getConfig } from '../utils/authContext.js';
import Dataset from '../models/Dataset.js';
import { parsePrompt } from '../services/assistantService.js';
import type { DatasetData } from '../types/domain.js';
import { AppError } from '../utils/errors.js';
import type { AssistantPromptInput } from '@optitrader/shared';

export async function assistant(request: Request, response: Response): Promise<void> {
  const datasets = await Dataset.find({ owner: currentUser(request).id }).sort({ createdAt: -1 }).lean<DatasetData[]>();
  if (!datasets.length) {
    throw new AppError('Upload a dataset before asking the assistant to configure a run.', 422, 'NO_DATASETS');
  }

  const body = request.body as AssistantPromptInput;
  const parsed = await parsePrompt({
    prompt: body.prompt,
    datasets,
    config: getConfig(request),
  });

  response.json(parsed);
}
