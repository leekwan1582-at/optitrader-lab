import Dataset from '../models/Dataset.js';
import { parsePrompt } from '../services/assistantService.js';
import { AppError } from '../utils/errors.js';

export async function assistant(request, response) {
  const datasets = await Dataset.find({ owner: request.user.id }).sort({ createdAt: -1 }).lean();
  if (!datasets.length) {
    throw new AppError('Upload a dataset before asking the assistant to configure a run.', 422, 'NO_DATASETS');
  }

  const parsed = await parsePrompt({
    prompt: request.body.prompt,
    datasets,
    config: request.app.locals.config,
  });

  response.json(parsed);
}
