import { z } from 'zod';

export const strategyTypeSchema = z.enum(['sma_crossover', 'ema_momentum']);
export const objectiveSchema = z.enum(['sharpe', 'total_return', 'calmar']);
export const runStatusSchema = z.enum(['completed', 'failed', 'running', 'queued']);

export const parameterRangeSchema = z.object({
  min: z.coerce.number().int().positive(),
  max: z.coerce.number().int().positive(),
  step: z.coerce.number().int().positive(),
}).refine((range) => range.max >= range.min, {
  message: 'Max must be greater than or equal to min.',
  path: ['max'],
});

export const strategyParamsSchema = z.object({
  fast_ma: parameterRangeSchema,
  slow_ma: parameterRangeSchema,
});

export const workspaceSchema = z.object({
  workspace_id: z.string().optional(),
  _id: z.string().optional(),
  user: z.string().optional(),
  name: z.string().min(1),
  owner: z.string().min(1),
});

export const datasetSchema = z.object({
  dataset_id: z.string().min(1),
  _id: z.string().optional(),
  owner: z.string().optional(),
  name: z.string().min(1),
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
  date_range: z.string(),
  rows: z.coerce.number().int().nonnegative(),
  status: z.string(),
  file_ref: z.string().nullable().optional(),
  original_filename: z.string().nullable().optional(),
});

export const uploadDatasetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  symbol: z.string().trim().min(1).max(24),
  timeframe: z.string().trim().min(1).max(12),
  dateRange: z.string().trim().max(80).optional(),
  date_range: z.string().trim().max(80).optional(),
  rows: z.coerce.number().int().nonnegative().optional(),
  csvText: z.string().min(1).optional(),
  status: z.enum(['validated', 'pending', 'invalid']).optional(),
});

export const profileSchema = z.object({
  profile_id: z.string().min(1),
  _id: z.string().optional(),
  owner: z.string().optional(),
  name: z.string().min(1),
  strategy_type: strategyTypeSchema,
  objective: objectiveSchema,
  max_drawdown_limit: z.coerce.number().gt(0).lte(1),
  params: strategyParamsSchema,
});

export const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  strategy_type: strategyTypeSchema,
  objective: objectiveSchema,
  max_drawdown_limit: z.coerce.number().gt(0).lte(1),
  params: strategyParamsSchema,
}).refine((profile) => profile.params.fast_ma.max < profile.params.slow_ma.min, {
  message: 'Fast MA range must stay below the slow MA range.',
  path: ['params', 'slow_ma', 'min'],
});

export const updateProfileSchema = profileSchema.partial().omit({ profile_id: true });

export const bestMetricsSchema = z.object({
  fast_ma: z.coerce.number().int(),
  slow_ma: z.coerce.number().int(),
  sharpe: z.coerce.number(),
  total_return: z.coerce.number(),
  max_drawdown: z.coerce.number(),
  profit_factor: z.coerce.number(),
  trades: z.coerce.number().int().nonnegative(),
});

export const robustnessSchema = z.object({
  confidence_score: z.coerce.number(),
  edge_of_grid: z.boolean(),
  out_of_sample_drop: z.coerce.number(),
  transaction_costs_included: z.boolean(),
  walk_forward_completed: z.boolean(),
  warnings: z.array(z.string()),
});

export const aiSummarySchema = z.object({
  headline: z.string(),
  key_findings: z.array(z.string()),
  caveats: z.array(z.string()),
});

export const runConfigSchema = z.object({
  prompt: z.string().trim().max(2000).optional(),
  strategy_type: strategyTypeSchema,
  dataset_id: z.string().trim().min(1),
  objective: objectiveSchema,
  max_drawdown_limit: z.coerce.number().gt(0).lte(1),
  fast_ma: parameterRangeSchema,
  slow_ma: parameterRangeSchema,
  transaction_costs: z.coerce.number().min(0).max(0.1).optional(),
  walk_forward: z.boolean().optional(),
}).refine((config) => config.fast_ma.max < config.slow_ma.min, {
  message: 'Fast MA range must stay below the slow MA range.',
  path: ['slow_ma', 'min'],
});

export const parsedConfigSchema = runConfigSchema.and(z.object({
  estimated_combinations: z.coerce.number().int().nonnegative().optional(),
  source: z.string().optional(),
  clarification: z.string().optional(),
}));

export const profileSnapshotSchema = z.object({
  name: z.string(),
  strategy_type: strategyTypeSchema,
  objective: objectiveSchema,
  max_drawdown_limit: z.coerce.number(),
  params: strategyParamsSchema,
});

export const runSchema = z.object({
  run_id: z.string().min(1),
  _id: z.string().optional(),
  owner: z.string().optional(),
  profile_id: z.string().min(1),
  dataset_id: z.string().min(1),
  run_hash: z.string().optional(),
  config: runConfigSchema.optional(),
  profile_snapshot: profileSnapshotSchema.optional(),
  status: runStatusSchema,
  created_at: z.coerce.date(),
  duration_ms: z.coerce.number().nonnegative().optional(),
  holdout_pct: z.coerce.number().optional(),
  trials: z.coerce.number().int().nonnegative().optional(),
  best: bestMetricsSchema.optional(),
  robustness: robustnessSchema.optional(),
  equity_curve: z.array(z.coerce.number()).optional(),
  ai_summary: aiSummarySchema.optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  profile_name: z.string().optional(),
  strategy_type: strategyTypeSchema.optional(),
  dataset_name: z.string().optional(),
  symbol: z.string().optional(),
});

export const errorLogSchema = z.object({
  owner: z.string().optional(),
  experiment_id: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error']),
  timestamp: z.coerce.date(),
  component: z.string(),
  message: z.string(),
});

export const settingsSchema = z.object({
  max_trials: z.coerce.number().int().positive(),
  default_holdout_pct: z.coerce.number().optional(),
  default_objective: objectiveSchema.optional(),
});

export const compareQuerySchema = z.object({
  ids: z.string().trim().min(1),
});

export const workspaceBootstrapSchema = z.object({
  workspace: workspaceSchema,
  datasets: z.array(datasetSchema),
  profiles: z.array(profileSchema),
  runs: z.array(runSchema),
  errorLogs: z.array(errorLogSchema),
  settings: settingsSchema,
});

export type StrategyType = z.infer<typeof strategyTypeSchema>;
export type Objective = z.infer<typeof objectiveSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type ParameterRange = z.infer<typeof parameterRangeSchema>;
export type StrategyParams = z.infer<typeof strategyParamsSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type UploadDataset = z.infer<typeof uploadDatasetSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type BestMetrics = z.infer<typeof bestMetricsSchema>;
export type Robustness = z.infer<typeof robustnessSchema>;
export type AiSummary = z.infer<typeof aiSummarySchema>;
export type RunConfig = z.infer<typeof runConfigSchema>;
export type ParsedConfig = z.infer<typeof parsedConfigSchema>;
export type ProfileSnapshot = z.infer<typeof profileSnapshotSchema>;
export type Run = z.infer<typeof runSchema>;
export type ErrorLog = z.infer<typeof errorLogSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type WorkspaceBootstrap = z.infer<typeof workspaceBootstrapSchema>;
export type CompareQuery = z.infer<typeof compareQuerySchema>;
