import { GoogleGenAI, Type, type Tool } from '@google/genai';
import { z } from 'zod';
import type { AppConfig, DatasetData, Objective, ParameterRange, RunConfig, StrategyType } from '../types/domain.js';
import { countCombinations } from '../utils/combinations.js';

const rangeSchema = z.object({
  min: z.coerce.number().int().positive(),
  max: z.coerce.number().int().positive(),
  step: z.coerce.number().int().positive(),
});

const assistantArgsSchema = z.object({
  strategy_type: z.enum(['sma_crossover', 'ema_momentum']).optional(),
  dataset_id: z.string().optional(),
  objective: z.enum(['sharpe', 'total_return', 'calmar']).optional(),
  fast_ma: rangeSchema.optional(),
  slow_ma: rangeSchema.optional(),
  max_drawdown_limit: z.coerce.number().gt(0).lte(1).optional(),
});

type AssistantArgs = z.infer<typeof assistantArgsSchema>;

export interface ParsedPrompt extends RunConfig {
  estimated_combinations: number;
  source: 'gemini' | 'fallback';
  clarification?: string;
}

const tools: Tool[] = [{
  functionDeclarations: [{
    name: 'create_optimization_config',
    description: 'Convert a trader request into a validated grid-search configuration.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        strategy_type: { type: Type.STRING, enum: ['sma_crossover', 'ema_momentum'] },
        dataset_id: { type: Type.STRING, description: 'ID from the provided dataset list.' },
        fast_ma: {
          type: Type.OBJECT,
          properties: {
            min: { type: Type.INTEGER },
            max: { type: Type.INTEGER },
            step: { type: Type.INTEGER },
          },
          required: ['min', 'max', 'step'],
        },
        slow_ma: {
          type: Type.OBJECT,
          properties: {
            min: { type: Type.INTEGER },
            max: { type: Type.INTEGER },
            step: { type: Type.INTEGER },
          },
          required: ['min', 'max', 'step'],
        },
        objective: { type: Type.STRING, enum: ['sharpe', 'total_return', 'calmar'] },
        max_drawdown_limit: { type: Type.NUMBER },
      },
      required: ['strategy_type', 'dataset_id', 'objective'],
    },
  }],
}];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number; statusCode?: number }).status
        || (error as { statusCode?: number }).statusCode;
      const retryable = status === 429 || status === 500 || status === 503;
      if (!retryable || attempt === tries - 1) throw error;
      await sleep(2 ** attempt * 500 + Math.random() * 250);
    }
  }
  throw lastError;
}

function defaultRanges(strategy: StrategyType): { fast_ma: ParameterRange; slow_ma: ParameterRange } {
  if (strategy === 'ema_momentum') {
    return {
      fast_ma: { min: 10, max: 40, step: 5 },
      slow_ma: { min: 60, max: 200, step: 20 },
    };
  }
  return {
    fast_ma: { min: 5, max: 30, step: 5 },
    slow_ma: { min: 40, max: 120, step: 10 },
  };
}

export function parsePromptLocally(prompt: string, datasets: DatasetData[]): ParsedPrompt {
  const text = String(prompt || '').toLowerCase();
  const strategy: StrategyType = text.includes('ema') ? 'ema_momentum' : 'sma_crossover';
  const ranges = defaultRanges(strategy);
  const objective: Objective = text.includes('return')
    ? 'total_return'
    : text.includes('calmar')
      ? 'calmar'
      : 'sharpe';

  const drawdownMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const maxDrawdownLimit = drawdownMatch
    ? Math.min(1, Math.max(0.01, Number(drawdownMatch[1]) / 100))
    : 0.15;

  const symbols = [...new Set(datasets.map((dataset) => String(dataset.symbol).toLowerCase()))];
  const symbolMatch = symbols.find((symbol) => (
    new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
  ));
  const dataset = (symbolMatch
    ? datasets.find((item) => String(item.symbol).toLowerCase() === symbolMatch)
    : undefined) || datasets[0];

  const parsed: ParsedPrompt = {
    prompt,
    strategy_type: strategy,
    dataset_id: dataset?._id || dataset?.dataset_id || '',
    objective,
    max_drawdown_limit: maxDrawdownLimit,
    ...ranges,
    transaction_costs: 0.0002,
    walk_forward: false,
    estimated_combinations: 0,
    source: 'fallback',
  };

  parsed.estimated_combinations = countCombinations(parsed);
  return parsed;
}

function buildSystemPrompt(datasets: DatasetData[]): string {
  const list = datasets.map((dataset) => `${dataset._id || dataset.dataset_id}: ${dataset.name} (${dataset.symbol}, ${dataset.timeframe})`).join('\n');
  return [
    'You are the OptiTrader Lab assistant.',
    'Convert the user request into one optimization configuration using the create_optimization_config tool.',
    'If strategy, dataset or objective is missing or ambiguous, ask one short clarifying question instead of calling the tool.',
    'Only use dataset IDs from this list:',
    list,
    'Never give investment advice.',
  ].join('\n');
}

function mergeWithDefaults(args: AssistantArgs, prompt: string, datasets: DatasetData[]): ParsedPrompt {
  const fallback = parsePromptLocally(prompt, datasets);
  const strategy = args.strategy_type || fallback.strategy_type;
  const ranges = defaultRanges(strategy);
  const datasetIds = new Set(datasets.map((dataset) => dataset._id || dataset.dataset_id));
  const datasetId = args.dataset_id && datasetIds.has(args.dataset_id)
    ? args.dataset_id
    : fallback.dataset_id;

  const parsed: ParsedPrompt = {
    prompt,
    strategy_type: strategy,
    dataset_id: datasetId,
    objective: args.objective || fallback.objective,
    max_drawdown_limit: args.max_drawdown_limit ?? fallback.max_drawdown_limit,
    fast_ma: args.fast_ma || ranges.fast_ma,
    slow_ma: args.slow_ma || ranges.slow_ma,
    transaction_costs: 0.0002,
    walk_forward: false,
    estimated_combinations: 0,
    source: 'gemini',
  };

  if (parsed.fast_ma.max >= parsed.slow_ma.min) {
    parsed.fast_ma = ranges.fast_ma;
    parsed.slow_ma = ranges.slow_ma;
  }

  parsed.estimated_combinations = countCombinations(parsed);
  return parsed;
}

export async function parsePrompt({
  prompt,
  datasets,
  config,
}: {
  prompt: string;
  datasets: DatasetData[];
  config: AppConfig;
}): Promise<ParsedPrompt> {
  const local = parsePromptLocally(prompt, datasets);

  if (!datasets.length || !config.geminiApiKey) {
    return local;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    const response = await withRetry(() => ai.models.generateContent({
      model: config.geminiModel,
      contents: prompt,
      config: {
        systemInstruction: buildSystemPrompt(datasets),
        tools,
      },
    }));

    const call = response.functionCalls?.[0];
    if (!call?.args) {
      const clarification = response.text?.trim();
      return {
        ...local,
        clarification: clarification || 'Could you clarify the strategy, dataset, and objective?',
      };
    }

    const args = assistantArgsSchema.parse(
      typeof call.args === 'string' ? JSON.parse(call.args) : call.args
    );
    return mergeWithDefaults(args, prompt, datasets);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Gemini assistant unavailable; using local parser:', message);
    return local;
  }
}
