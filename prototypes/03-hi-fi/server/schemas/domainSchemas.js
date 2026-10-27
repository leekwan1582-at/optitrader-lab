import { z } from 'zod';

const parameterRangeSchema = z.object({
  min: z.coerce.number().int().positive(),
  max: z.coerce.number().int().positive(),
  step: z.coerce.number().int().positive(),
}).refine((range) => range.max >= range.min, {
  message: 'Max must be greater than or equal to min.',
});

export const datasetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  symbol: z.string().trim().min(1).max(24),
  timeframe: z.string().trim().min(1).max(12),
  dateRange: z.string().trim().max(80).optional(),
  date_range: z.string().trim().max(80).optional(),
  rows: z.coerce.number().int().nonnegative().optional(),
  csvText: z.string().min(1).optional(),
  status: z.enum(['validated', 'pending', 'invalid']).optional(),
});

export const profileParamsSchema = z.object({
  fast_ma: parameterRangeSchema,
  slow_ma: parameterRangeSchema,
});

const profileBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  strategy_type: z.enum(['sma_crossover', 'ema_momentum']),
  objective: z.enum(['sharpe', 'total_return', 'calmar']),
  max_drawdown_limit: z.coerce.number().gt(0).lte(1),
  params: profileParamsSchema,
});

export const createProfileSchema = profileBaseSchema.refine((profile) => profile.params.fast_ma.max < profile.params.slow_ma.min, {
  message: 'Fast MA range must stay below the slow MA range.',
  path: ['params', 'slow_ma', 'min'],
});

export const updateProfileSchema = profileBaseSchema.partial();

export const runConfigSchema = z.object({
  prompt: z.string().trim().max(2000).optional(),
  strategy_type: z.enum(['sma_crossover', 'ema_momentum']),
  dataset_id: z.string().trim().min(1),
  objective: z.enum(['sharpe', 'total_return', 'calmar']),
  max_drawdown_limit: z.coerce.number().gt(0).lte(1),
  fast_ma: parameterRangeSchema,
  slow_ma: parameterRangeSchema,
  transaction_costs: z.coerce.number().min(0).max(0.1).optional(),
  walk_forward: z.boolean().optional(),
}).refine((config) => config.fast_ma.max < config.slow_ma.min, {
  message: 'Fast MA range must stay below the slow MA range.',
  path: ['slow_ma', 'min'],
});

export const compareQuerySchema = z.object({
  ids: z.string().trim().min(1),
});

export const assistantSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  datasets: z.array(z.object({
    id: z.string().optional(),
    dataset_id: z.string().optional(),
    name: z.string().optional(),
  })).optional(),
});
