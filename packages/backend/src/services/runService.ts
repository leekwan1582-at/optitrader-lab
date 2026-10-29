import Run from '../models/Run.js';
import Profile, { type ProfileDocument } from '../models/Profile.js';
import Dataset from '../models/Dataset.js';
import ErrorLog from '../models/ErrorLog.js';
import { runBacktest } from '../workers/backtestWorker.js';
import { processRegistry } from '../workers/processRegistry.js';
import type {
  BestMetrics,
  DatasetData,
  ProfileData,
  Robustness,
  RunConfig,
  RunData,
} from '../types/domain.js';
import type {
  PaginatedRunsResponse,
  RunFilterQuery,
  RunLogsResponse,
} from '@optitrader/shared';
import { AppError, NotFoundError } from '../utils/errors.js';
import { createId } from '../utils/ids.js';
import { buildRunHash } from '../utils/runHash.js';
import { countCombinations, enumerateCombinations } from '../utils/combinations.js';
import { ensureDatasetFile, getDataset } from './datasetService.js';
import { generateRunSummary } from './assistantService.js';
import { loadConfig } from '../config.js';

const MAX_TRIALS = 500;

function strategyLabel(strategy: string): string {
  return strategy === 'ema_momentum' ? 'EMA' : 'SMA';
}

function toFraction(value: number | undefined): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number / 100;
}

function buildRobustness(
  config: RunConfig,
  best: BestMetrics,
  trials: number,
  engineRobustness?: { edge_of_grid?: boolean; out_of_sample_drop?: number; warnings?: string[] }
): Robustness {
  const warnings: string[] = [];

  if (!config.transaction_costs) {
    warnings.push('Transaction costs not included');
  }
  if (!config.walk_forward) {
    warnings.push('Walk-forward validation missing');
  }
  if (best.max_drawdown > config.max_drawdown_limit) {
    warnings.push('Best result exceeds the configured drawdown limit');
  }
  warnings.push('Selection bias risk present');

  if (engineRobustness?.warnings?.length) {
    for (const w of engineRobustness.warnings) {
      if (!warnings.includes(w)) warnings.push(w);
    }
  }

  const edgeOfGrid = Boolean(engineRobustness?.edge_of_grid);
  const outOfSampleDrop = Number((engineRobustness?.out_of_sample_drop ?? -0.15).toFixed(3));

  // Confidence score: base 9.8, penalize each warning by 0.75, penalize edge of grid by 1.5, penalize trial density
  const gridPenalty = edgeOfGrid ? 1.5 : 0;
  const oosPenalty = Math.abs(outOfSampleDrop) > 0.3 ? 1.0 : 0;
  const confidence = Math.max(
    2.5,
    Math.min(9.8, 9.8 - warnings.length * 0.65 - gridPenalty - oosPenalty - (trials / MAX_TRIALS) * 0.7)
  );

  return {
    confidence_score: Number(confidence.toFixed(1)),
    edge_of_grid: edgeOfGrid,
    out_of_sample_drop: outOfSampleDrop,
    transaction_costs_included: Boolean(config.transaction_costs),
    walk_forward_completed: Boolean(config.walk_forward),
    warnings,
  };
}

// buildRobustness returns Robustness object

function decorateRun(run: RunData, profile?: ProfileData | null, dataset?: DatasetData | null): RunData {
  return {
    ...run,
    run_id: run._id,
    profile_name: profile?.name || run.profile_snapshot?.name || 'Unknown profile',
    strategy_type: profile?.strategy_type || run.profile_snapshot?.strategy_type || run.config?.strategy_type || 'sma_crossover',
    dataset_name: dataset?.name || 'Unknown dataset',
    symbol: dataset?.symbol || '—',
  };
}

async function decorateRuns(runs: RunData[]): Promise<RunData[]> {
  if (!runs.length) return [];
  const profileIds = [...new Set(runs.map((r) => r.profile_id))];
  const datasetIds = [...new Set(runs.map((r) => r.dataset_id))];

  const [profiles, datasets] = await Promise.all([
    Profile.find({ _id: { $in: profileIds } }).lean<ProfileData[]>(),
    Dataset.find({ _id: { $in: datasetIds } }).lean<DatasetData[]>(),
  ]);

  const profileMap = new Map(profiles.map((p) => [p._id, p]));
  const datasetMap = new Map(datasets.map((d) => [d._id, d]));

  return runs.map((run) => decorateRun(
    run,
    profileMap.get(run.profile_id),
    datasetMap.get(run.dataset_id)
  ));
}

export async function listRuns(owner: string): Promise<RunData[]> {
  const runs = await Run.find({ owner }).sort({ created_at: -1 }).lean<RunData[]>();
  return decorateRuns(runs);
}

export async function listRunsPaginated(owner: string, filter: RunFilterQuery): Promise<PaginatedRunsResponse> {
  const query: Record<string, unknown> = { owner };
  if (filter.status) {
    query.status = filter.status;
  }
  if (filter.dataset_id) {
    query.dataset_id = filter.dataset_id;
  }
  if (filter.strategy_type) {
    query['config.strategy_type'] = filter.strategy_type;
  }

  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const skip = (page - 1) * limit;

  const [total, runs] = await Promise.all([
    Run.countDocuments(query),
    Run.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean<RunData[]>(),
  ]);

  const decorated = await decorateRuns(runs);

  return {
    items: decorated as PaginatedRunsResponse['items'],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getRun(owner: string, runId: string): Promise<RunData> {
  const run = await Run.findOne({ _id: runId, owner }).lean<RunData>();
  if (!run) throw new NotFoundError('Run not found.');

  const [profile, dataset] = await Promise.all([
    Profile.findOne({ _id: run.profile_id }).lean<ProfileData>(),
    Dataset.findOne({ _id: run.dataset_id }).lean<DatasetData>(),
  ]);
  return decorateRun(run, profile, dataset);
}

export async function getRunLogs(owner: string, runId: string): Promise<RunLogsResponse> {
  const run = await Run.findOne({ _id: runId, owner }).lean<RunData>();
  if (!run) throw new NotFoundError('Run not found.');

  const memoryLogs = processRegistry.getLogs(runId);
  const errorLogs = await ErrorLog.find({ experiment_id: runId, owner }).sort({ timestamp: 1 }).lean();

  const combinedLogs = [...memoryLogs];
  for (const err of errorLogs) {
    combinedLogs.push({
      timestamp: err.timestamp,
      level: err.severity,
      message: `[${err.component}] ${err.message}`,
    });
  }

  // Sort chronologically
  combinedLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    run_id: runId,
    status: run.status,
    logs: combinedLogs,
  };
}

export async function cancelRun(owner: string, runId: string): Promise<RunData> {
  const run = await Run.findOne({ _id: runId, owner });
  if (!run) throw new NotFoundError('Run not found.');

  if (!['queued', 'running'].includes(run.status)) {
    throw new AppError('Run is not currently in progress and cannot be cancelled.', 409, 'RUN_NOT_CANCELLABLE');
  }

  await processRegistry.cancel(runId, 'Cancelled via API');

  run.status = 'cancelled';
  run.error_code = 'RUN_CANCELLED';
  run.error_message = 'Optimization was cancelled by the user.';
  await run.save();

  await ErrorLog.create({
    owner,
    experiment_id: run._id,
    severity: 'warning',
    timestamp: new Date(),
    component: 'Run Controller',
    message: 'Optimization cancelled by user.',
  });

  return getRun(owner, runId);
}

export async function retryRun(owner: string, runId: string): Promise<RunData> {
  const original = await Run.findOne({ _id: runId, owner }).lean<RunData>();
  if (!original) throw new NotFoundError('Original run not found.');
  if (!original.config) throw new AppError('Original run configuration is missing.', 422, 'VALIDATION_ERROR');

  return launchRun(owner, {
    ...original.config,
    profile_id: original.profile_id,
  }, original._id);
}

export async function compareRuns(owner: string, ids: string[]): Promise<RunData[]> {
  const runs = await Run.find({ owner, _id: { $in: ids } }).sort({ created_at: -1 }).lean<RunData[]>();
  if (runs.length !== new Set(ids).size) {
    throw new NotFoundError('One or more runs were not found.');
  }
  return decorateRuns(runs);
}

export async function deleteRun(owner: string, runId: string): Promise<void> {
  const run = await Run.findOne({ _id: runId, owner });
  if (!run) throw new NotFoundError('Run not found.');
  if (['queued', 'running'].includes(run.status)) {
    throw new AppError('Cancel the run before deleting it.', 409, 'RUN_IN_PROGRESS');
  }
  await Run.deleteOne({ _id: runId, owner });
}

export async function launchRun(owner: string, input: RunConfig, retriedFrom?: string): Promise<RunData> {
  const dataset = await getDataset(owner, input.dataset_id);
  const trials = countCombinations(input);

  if (trials === 0) {
    throw new AppError('No valid fast/slow MA combinations. Fast MA must stay below slow MA.', 422, 'NO_VALID_COMBINATIONS');
  }
  if (trials > MAX_TRIALS) {
    throw new AppError(
      `Grid has ${trials} combinations; the cap is ${MAX_TRIALS}. Increase the step size.`,
      422,
      'COMBINATION_CAP'
    );
  }

  const datasetData = dataset.toObject();
  const { path: csvPath, checksum } = await ensureDatasetFile(datasetData);

  let profile: ProfileData | ProfileDocument | null = null;
  let profileId = input.profile_id;

  if (profileId) {
    profile = await Profile.findOne({ _id: profileId, owner });
    if (!profile) {
      throw new NotFoundError('Selected profile not found.');
    }
  } else {
    // Generate ad-hoc profile with collision-safe naming
    const shortId = createId('p').slice(-6);
    profileId = createId('profile');
    profile = await Profile.create({
      _id: profileId,
      owner,
      name: `${dataset.symbol} ${strategyLabel(input.strategy_type)} Sweep (${shortId})`,
      strategy_type: input.strategy_type,
      objective: input.objective,
      max_drawdown_limit: input.max_drawdown_limit,
      params: {
        fast_ma: input.fast_ma,
        slow_ma: input.slow_ma,
      },
    });
  }

  const runId = createId('run');
  const runHash = buildRunHash({
    strategyType: input.strategy_type,
    config: input,
    datasetChecksum: checksum,
  });

  const run = await Run.create({
    _id: runId,
    owner,
    profile_id: profileId,
    dataset_id: dataset._id,
    retried_from: retriedFrom,
    run_hash: runHash,
    config: input,
    profile_snapshot: {
      name: profile.name,
      strategy_type: profile.strategy_type,
      objective: profile.objective,
      max_drawdown_limit: profile.max_drawdown_limit,
      params: profile.params,
    },
    status: 'queued',
    created_at: new Date(),
    trials,
    holdout_pct: 0.2,
  });

  run.status = 'running';
  await run.save();
  const startedAt = Date.now();

  try {
    const result = await runBacktest({
      runId,
      csvPath,
      config: {
        fast_ma: input.fast_ma,
        slow_ma: input.slow_ma,
        objective: input.objective,
        max_drawdown: input.max_drawdown_limit,
        transaction_costs: input.transaction_costs || 0,
        strategy_type: input.strategy_type,
      },
    });

    const metrics = result.metrics || {};
    const bestPairs = enumerateCombinations(input);
    const bestPair = (result.best_params || bestPairs[Math.floor(bestPairs.length / 2)] || {
      fast_ma: input.fast_ma.min,
      slow_ma: input.slow_ma.min,
    }) as { fast_ma?: number; slow_ma?: number; fast?: number; slow?: number };

    const best: BestMetrics = {
      fast_ma: Number(bestPair.fast_ma ?? bestPair.fast),
      slow_ma: Number(bestPair.slow_ma ?? bestPair.slow),
      sharpe: Number(metrics.sharpe_ratio ?? 0),
      total_return: toFraction(metrics.total_return) ?? 0,
      max_drawdown: toFraction(metrics.max_drawdown) ?? 0,
      calmar_ratio: metrics.calmar_ratio !== undefined ? Number(metrics.calmar_ratio) : undefined,
      win_rate: metrics.win_rate !== undefined ? toFraction(metrics.win_rate) ?? undefined : undefined,
      profit_factor: Number(metrics.profit_factor ?? 0),
      trades: Number(metrics.total_trades ?? 0),
      oos_sharpe: metrics.oos_sharpe !== undefined ? Number(metrics.oos_sharpe) : undefined,
      oos_total_return: metrics.oos_total_return !== undefined ? toFraction(metrics.oos_total_return) ?? undefined : undefined,
      oos_max_drawdown: metrics.oos_max_drawdown !== undefined ? toFraction(metrics.oos_max_drawdown) ?? undefined : undefined,
    };

    const equityCurve = (result.equity_curve || [])
      .map((point) => Number(point.value ?? point))
      .filter((value) => Number.isFinite(value));

    run.status = 'completed';
    run.duration_ms = Date.now() - startedAt;
    run.best = best;
    run.equity_curve = equityCurve;
    const robustness = buildRobustness(input, best, trials, result.robustness);
    run.robustness = robustness;

    const appConfig = loadConfig();
    run.ai_summary = await generateRunSummary({
      config: input,
      best,
      trials,
      robustness,
      appConfig,
    });
    run.error_code = undefined;
    run.error_message = undefined;
    await run.save();
  } catch (error) {
    const errorCode = (error as { code?: string }).code || 'RUN_FAILED';
    if (errorCode === 'RUN_CANCELLED') {
      run.status = 'cancelled';
      run.duration_ms = Date.now() - startedAt;
      run.error_code = 'RUN_CANCELLED';
      run.error_message = 'Optimization was cancelled.';
      await run.save();
    } else {
      run.status = 'failed';
      run.duration_ms = Date.now() - startedAt;
      run.error_code = errorCode;
      run.error_message = error instanceof Error ? error.message : String(error);
      await run.save();

      await ErrorLog.create({
        owner,
        experiment_id: run._id,
        severity: 'error',
        timestamp: new Date(),
        component: 'Backtest Engine',
        message: run.error_message,
      });
    }
  }

  return decorateRun(run.toObject(), profile, datasetData);
}
