import { ApiError } from './client';
import rawSeed from '../data/mockData.json';
import type {
  ChangePasswordInput,
  CreateProfileInput,
  Dataset,
  DatasetPreviewResponse,
  ErrorLogQuery,
  LoginInput,
  MockData,
  PaginatedErrorLogsResponse,
  PaginatedRunsResponse,
  ParameterRange,
  ParsedConfig,
  Profile,
  RegisterInput,
  Run,
  RunConfig,
  RunFilterQuery,
  RunLogsResponse,
  Session,
  UpdateAccountInput,
  UpdateProfileInput,
  User,
  UploadDataset,
  WorkspaceBootstrap,
} from '../types/domain';


const MAX_TRIALS = 500;
const seedData = rawSeed as unknown as MockData;
let memoryStore: MockData | null = null;
let currentMockUser: User | null = null;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function readStore(): MockData {
  if (!memoryStore) {
    memoryStore = clone(seedData);
  }
  return memoryStore;
}

function writeStore(data: MockData): void {
  memoryStore = data;
}

function updateStore<T>(mutator: (store: MockData) => T): T {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}

function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function countCombinations({
  fast_ma: fast,
  slow_ma: slow,
}: {
  fast_ma?: Partial<ParameterRange>;
  slow_ma?: Partial<ParameterRange>;
} = {}): number {
  const fastMin = toNumber(fast?.min, 5);
  const fastMax = toNumber(fast?.max, 30);
  const fastStep = Math.max(1, toNumber(fast?.step, 5));
  const slowMin = toNumber(slow?.min, 40);
  const slowMax = toNumber(slow?.max, 120);
  const slowStep = Math.max(1, toNumber(slow?.step, 10));

  let count = 0;
  for (let fastValue = fastMin; fastValue <= fastMax; fastValue += fastStep) {
    for (let slowValue = slowMin; slowValue <= slowMax; slowValue += slowStep) {
      if (fastValue < slowValue) count += 1;
    }
  }
  return count;
}

function buildEquityCurve(start = 10000, points = 30): number[] {
  const curve: number[] = [];
  let value = start;
  let drift = 0.006;

  for (let index = 0; index < points; index += 1) {
    const noise = (Math.random() - 0.45) * 0.028;
    drift += (Math.random() - 0.5) * 0.001;
    value = Math.max(1000, value * (1 + drift + noise));
    curve.push(Math.round(value));
  }

  return curve;
}

function buildWarnings(config: RunConfig, maxDrawdown: number): string[] {
  const warnings: string[] = [];
  if (config.max_drawdown_limit && maxDrawdown > config.max_drawdown_limit) {
    warnings.push('Best result exceeds the configured drawdown limit');
  }
  if (!config.transaction_costs) {
    warnings.push('Transaction costs not included');
  }
  if (!config.walk_forward) {
    warnings.push('Walk-forward validation missing');
  }
  warnings.push('Selection bias risk present');
  return warnings;
}

function decorateRun(run: Run, store: MockData): Run {
  const profile = store.profiles.find((item) => item.profile_id === run.profile_id);
  const dataset = store.datasets.find((item) => item.dataset_id === run.dataset_id);
  return {
    ...run,
    profile_name: profile?.name || 'Unknown profile',
    strategy_type: profile?.strategy_type || 'sma_crossover',
    dataset_name: dataset?.name || 'Unknown dataset',
    symbol: dataset?.symbol || '—',
  };
}

function bootstrapFromStore(store: MockData): WorkspaceBootstrap {
  return {
    workspace: store.workspace,
    datasets: store.datasets,
    profiles: store.profiles,
    runs: store.runs.map((run) => decorateRun(run, store)),
    errorLogs: store.error_logs,
    settings: store.settings,
  };
}

export async function login({ email, password }: LoginInput): Promise<Session> {
  await delay(450);

  if (!email || !String(email).includes('@')) {
    throw new ApiError('Enter a valid email address.', 400);
  }
  if (!password || String(password).length < 4) {
    throw new ApiError('Password must be at least 4 characters.', 400);
  }

  const store = readStore();
  currentMockUser = {
    id: 'mock-user',
    email,
    name: store.workspace.owner,
    workspaceName: store.workspace.name,
    workspace: store.workspace,
  };
  return { user: currentMockUser };
}

export async function register({ name, email, workspaceName }: RegisterInput): Promise<Session> {
  await delay(450);
  const store = readStore();
  const ownerName = name || 'Marcus Lim';
  const wsName = workspaceName || `${ownerName.replace(/\s+/g, '_')}_Research`;
  store.workspace.owner = ownerName;
  store.workspace.name = wsName;
  currentMockUser = {
    id: 'mock-user',
    email,
    name: ownerName,
    workspaceName: wsName,
    workspace: store.workspace,
  };
  return { user: currentMockUser };
}

export async function changePassword(_input: ChangePasswordInput): Promise<User> {
  await delay(300);
  if (!currentMockUser) throw new ApiError('Not authenticated', 401);
  return currentMockUser;
}

export async function updateAccount(input: UpdateAccountInput): Promise<User> {
  await delay(300);
  if (!currentMockUser) throw new ApiError('Not authenticated', 401);
  const store = readStore();
  if (input.name) {
    currentMockUser.name = input.name;
    store.workspace.owner = input.name;
  }
  if (input.workspaceName) {
    currentMockUser.workspaceName = input.workspaceName;
    store.workspace.name = input.workspaceName;
  }
  return currentMockUser;
}

export async function getMe(): Promise<User> {

  await delay(150);
  if (!currentMockUser) {
    throw new ApiError('Not authenticated.', 401);
  }
  return currentMockUser;
}

export async function refreshSession(): Promise<User> {
  return getMe();
}

export async function logout(): Promise<void> {
  currentMockUser = null;
}

export async function getBootstrapData(): Promise<WorkspaceBootstrap> {
  await delay(250);
  return bootstrapFromStore(readStore());
}

export async function getDatasets(): Promise<Dataset[]> {
  await delay(200);
  return readStore().datasets;
}

export async function uploadDataset(
  input: UploadDataset | FormData,
  onProgress?: (percent: number) => void
): Promise<Dataset> {
  await delay(300);
  if (onProgress) {
    onProgress(50);
    await delay(200);
    onProgress(100);
  }

  let name = 'Uploaded dataset';
  let symbol = 'UNKNOWN';
  let timeframe = '1H';
  let dateRange = '2023-01-01 to 2023-12-31';
  let rows = 500;

  if (input instanceof FormData) {
    name = (input.get('name') as string) || name;
    symbol = (input.get('symbol') as string) || symbol;
    timeframe = (input.get('timeframe') as string) || timeframe;
  } else {
    name = input.name || name;
    symbol = input.symbol || symbol;
    timeframe = input.timeframe || timeframe;
    dateRange = input.dateRange || dateRange;
    rows = Number(input.rows) || rows;
  }

  return updateStore((store) => {
    const dataset: Dataset = {
      dataset_id: createId('ds'),
      owner: store.workspace.workspace_id,
      name,
      symbol,
      timeframe,
      date_range: dateRange,
      rows,
      status: 'validated',
    };
    store.datasets.unshift(dataset);
    return dataset;
  });
}

export async function getDatasetPreview(datasetId: string): Promise<DatasetPreviewResponse> {
  await delay(150);
  const store = readStore();
  const dataset = store.datasets.find((d) => d.dataset_id === datasetId);
  return {
    dataset_id: datasetId,
    name: dataset?.name || 'Dataset Preview',
    symbol: dataset?.symbol || 'UNKNOWN',
    timeframe: dataset?.timeframe || '1H',
    total_rows: dataset?.rows || 10,
    columns: ['timestamp', 'open', 'high', 'low', 'close', 'volume'],
    preview_rows: [
      { timestamp: '2023-01-01T00:00:00Z', open: 100.5, high: 102.0, low: 99.8, close: 101.2, volume: 1500 },
      { timestamp: '2023-01-01T01:00:00Z', open: 101.2, high: 103.4, low: 101.0, close: 102.8, volume: 2100 },
      { timestamp: '2023-01-01T02:00:00Z', open: 102.8, high: 104.0, low: 102.1, close: 103.5, volume: 1800 },
    ],
  };
}

export async function deleteDataset(datasetId: string): Promise<void> {
  await delay(200);
  updateStore((store) => {
    store.datasets = store.datasets.filter((item) => item.dataset_id !== datasetId);
  });
}

export async function getProfiles(): Promise<Profile[]> {
  await delay(200);
  return readStore().profiles;
}

export async function createProfile(profile: CreateProfileInput): Promise<Profile> {
  await delay(300);
  return updateStore((store) => {
    const nextProfile: Profile = {
      profile_id: createId('profile'),
      owner: store.workspace.workspace_id,
      name: profile.name || 'Untitled profile',
      strategy_type: profile.strategy_type || 'sma_crossover',
      objective: profile.objective || 'sharpe',
      max_drawdown_limit: Number(profile.max_drawdown_limit) || 0.15,
      params: profile.params,
    };
    store.profiles.unshift(nextProfile);
    return nextProfile;
  });
}

export async function updateProfile(profileId: string, profile: UpdateProfileInput): Promise<Profile> {
  await delay(300);
  return updateStore((store) => {
    const existing = store.profiles.find((p) => p.profile_id === profileId);
    if (!existing) throw new ApiError('Profile not found', 404);
    if (profile.name) existing.name = profile.name;
    if (profile.strategy_type) existing.strategy_type = profile.strategy_type;
    if (profile.objective) existing.objective = profile.objective;
    if (profile.max_drawdown_limit) existing.max_drawdown_limit = Number(profile.max_drawdown_limit);
    if (profile.params) existing.params = profile.params;
    return existing;
  });
}

export async function cloneProfile(profileId: string): Promise<Profile> {
  await delay(300);
  return updateStore((store) => {
    const existing = store.profiles.find((p) => p.profile_id === profileId);
    if (!existing) throw new ApiError('Profile not found', 404);
    const cloned: Profile = {
      ...clone(existing),
      profile_id: createId('profile'),
      name: `Copy of ${existing.name}`,
    };
    store.profiles.unshift(cloned);
    return cloned;
  });
}

export async function deleteProfile(profileId: string): Promise<void> {
  await delay(300);
  updateStore((store) => {
    store.profiles = store.profiles.filter((p) => p.profile_id !== profileId);
  });
}


export async function getRuns(filter?: RunFilterQuery): Promise<PaginatedRunsResponse> {
  await delay(200);
  const store = readStore();
  let items = store.runs.map((run) => decorateRun(run, store));

  if (filter?.status) {
    items = items.filter((r) => r.status === filter.status);
  }
  if (filter?.dataset_id) {
    items = items.filter((r) => r.dataset_id === filter.dataset_id);
  }
  if (filter?.strategy_type) {
    items = items.filter((r) => r.strategy_type === filter.strategy_type);
  }

  const page = filter?.page || 1;
  const limit = filter?.limit || 20;
  const total = items.length;
  const paginated = items.slice((page - 1) * limit, page * limit);

  return {
    items: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getRun(runId: string): Promise<Run> {
  await delay(200);
  const store = readStore();
  const run = store.runs.find((item) => item.run_id === runId)
    || store.runs.find((item) => item.status === 'completed');
  if (!run) throw new ApiError('Run not found.', 404);
  return decorateRun(run, store);
}

export async function getRunLogs(runId: string): Promise<RunLogsResponse> {
  await delay(150);
  const run = await getRun(runId);
  return {
    run_id: runId,
    status: run.status,
    logs: [
      { timestamp: new Date(Date.now() - 60000), level: 'info', message: 'Optimization worker initialized.' },
      { timestamp: new Date(Date.now() - 45000), level: 'info', message: `Evaluating ${run.trials || 54} combinations.` },
      { timestamp: new Date(Date.now() - 30000), level: 'info', message: 'In-sample optimization complete.' },
      { timestamp: new Date(Date.now() - 15000), level: 'info', message: 'Out-of-sample forward evaluation verified.' },
    ],
  };
}

export async function cancelRun(runId: string): Promise<Run> {
  await delay(250);
  return updateStore((store) => {
    const run = store.runs.find((r) => r.run_id === runId);
    if (!run) throw new ApiError('Run not found', 404);
    run.status = 'cancelled';
    run.error_code = 'RUN_CANCELLED';
    run.error_message = 'Optimization was cancelled.';
    return decorateRun(run, store);
  });
}

export async function retryRun(runId: string): Promise<Run> {
  await delay(300);
  const original = await getRun(runId);
  if (!original.config) throw new ApiError('Missing run configuration', 422);
  return launchRun(original.config);
}

export async function getErrorLogs(filter?: ErrorLogQuery): Promise<PaginatedErrorLogsResponse> {
  await delay(150);
  let items = readStore().error_logs;
  if (filter?.severity) {
    items = items.filter((log) => log.severity === filter.severity);
  }
  if (filter?.experiment_id) {
    items = items.filter((log) => log.experiment_id === filter.experiment_id);
  }

  const page = filter?.page || 1;
  const limit = filter?.limit || 50;
  const total = items.length;
  const paginated = items.slice((page - 1) * limit, page * limit);

  return {
    items: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function parsePrompt(prompt: string, datasets: Dataset[] = []): Promise<ParsedConfig> {
  await delay(700);
  const text = String(prompt || '').toLowerCase();
  const strategy = text.includes('ema') ? 'ema_momentum' : 'sma_crossover';
  const objective = text.includes('return')
    ? 'total_return'
    : text.includes('calmar')
      ? 'calmar'
      : 'sharpe';

  const drawdownMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const maxDrawdownLimit = drawdownMatch
    ? Math.min(1, Math.max(0.01, Number(drawdownMatch[1]) / 100))
    : 0.15;

  const symbolMatch = ['eurusd', 'es', 'nq'].find((symbol) => (
    new RegExp(`\\b${symbol}\\b`, 'i').test(text)
  ));
  const dataset = datasets.find((item) => item.symbol?.toLowerCase() === symbolMatch)
    || datasets[0];

  const parsed: ParsedConfig = {
    prompt,
    strategy_type: strategy,
    dataset_id: dataset?.dataset_id || '',
    objective,
    max_drawdown_limit: maxDrawdownLimit,
    fast_ma: { min: strategy === 'ema_momentum' ? 10 : 5, max: strategy === 'ema_momentum' ? 40 : 30, step: 5 },
    slow_ma: { min: strategy === 'ema_momentum' ? 60 : 40, max: strategy === 'ema_momentum' ? 200 : 120, step: strategy === 'ema_momentum' ? 20 : 10 },
    transaction_costs: 0.0002,
    walk_forward: false,
  };

  return {
    ...parsed,
    estimated_combinations: countCombinations(parsed),
  };
}

export async function launchRun(config: RunConfig): Promise<Run> {
  await delay(1100);
  const combinations = countCombinations(config);
  if (combinations === 0) {
    throw new ApiError('No valid fast/slow MA combinations. Fast MA must stay below slow MA.', 422);
  }
  if (combinations > MAX_TRIALS) {
    throw new ApiError(
      `Grid has ${combinations} combinations; the cap is ${MAX_TRIALS}. Increase the step size.`,
      422
    );
  }

  return updateStore((store) => {
    const dataset = store.datasets.find((item) => item.dataset_id === config.dataset_id);
    if (!dataset) {
      throw new ApiError('Select a dataset before launching a run.', 422);
    }

    const profile: Profile = {
      profile_id: createId('profile'),
      owner: store.workspace.workspace_id,
      name: `${dataset.symbol} ${config.strategy_type === 'ema_momentum' ? 'EMA' : 'SMA'} Sweep`,
      strategy_type: config.strategy_type,
      objective: config.objective,
      max_drawdown_limit: config.max_drawdown_limit,
      params: { fast_ma: config.fast_ma, slow_ma: config.slow_ma },
    };
    store.profiles.unshift(profile);

    const maxDrawdown = 0.06 + Math.random() * 0.13;
    const fastValues: number[] = [];
    const slowValues: number[] = [];
    for (let fast = config.fast_ma.min; fast <= config.fast_ma.max; fast += Math.max(1, config.fast_ma.step)) {
      fastValues.push(fast);
    }
    for (let slow = config.slow_ma.min; slow <= config.slow_ma.max; slow += Math.max(1, config.slow_ma.step)) {
      slowValues.push(slow);
    }
    const validPairs = fastValues.flatMap((fast) => slowValues
      .filter((slow) => fast < slow)
      .map((slow) => ({ fast, slow })));
    const bestPair = validPairs[Math.floor(validPairs.length / 2)] || {
      fast: config.fast_ma.min,
      slow: config.slow_ma.min + config.slow_ma.step,
    };
    const sharpe = Number((0.62 + Math.random() * 0.95).toFixed(2));

    const run: Run = {
      run_id: createId('run'),
      owner: store.workspace.workspace_id,
      profile_id: profile.profile_id,
      dataset_id: dataset.dataset_id,
      status: 'completed',
      created_at: new Date(),
      duration_ms: 8000 + Math.floor(Math.random() * 22000),
      holdout_pct: store.settings?.default_holdout_pct || 0.2,
      trials: combinations,
      best: {
        fast_ma: bestPair.fast,
        slow_ma: bestPair.slow,
        sharpe,
        total_return: Number((0.12 + Math.random() * 0.4).toFixed(3)),
        max_drawdown: Number(maxDrawdown.toFixed(3)),
        profit_factor: Number((1.05 + Math.random() * 0.6).toFixed(2)),
        trades: 45 + Math.floor(Math.random() * 110),
      },
      equity_curve: buildEquityCurve(),
      robustness: {
        confidence_score: Number((6 + Math.random() * 3.5).toFixed(1)),
        edge_of_grid: false,
        out_of_sample_drop: -Number((Math.random() * 0.35).toFixed(2)),
        transaction_costs_included: Boolean(config.transaction_costs),
        walk_forward_completed: Boolean(config.walk_forward),
        warnings: buildWarnings(config, maxDrawdown),
      },
      ai_summary: {
        headline: `Best Sharpe ${sharpe} at fast ${bestPair.fast} / slow ${bestPair.slow} across ${combinations} tested combinations.`,
        key_findings: [
          'Performance stayed stable across the centre of the search grid.',
          'Out-of-sample behaviour should be reviewed before deployment.',
        ],
        caveats: [
          `${combinations} combinations were tested, so the winner is partly a selection effect.`,
          'Transaction costs and walk-forward validation must be confirmed.',
        ],
      },
    };

    store.runs.unshift(run);
    return decorateRun(run, store);
  });
}

export async function compareRuns(ids: string[] = []): Promise<Run[]> {
  await delay(250);
  const store = readStore();
  const selected = ids.length
    ? store.runs.filter((run) => ids.includes(run.run_id))
    : store.runs.filter((run) => run.status === 'completed');
  return selected.map((run) => decorateRun(run, store));
}

export async function cloneRun(runId: string): Promise<RunConfig> {
  await delay(250);
  const store = readStore();
  const run = store.runs.find((item) => item.run_id === runId);
  if (!run) throw new ApiError('Run not found.', 404);
  const profile = store.profiles.find((item) => item.profile_id === run.profile_id);
  return {
    strategy_type: profile?.strategy_type || 'sma_crossover',
    dataset_id: run.dataset_id,
    objective: profile?.objective || 'sharpe',
    max_drawdown_limit: profile?.max_drawdown_limit || 0.15,
    fast_ma: profile?.params?.fast_ma || { min: 5, max: 30, step: 5 },
    slow_ma: profile?.params?.slow_ma || { min: 40, max: 120, step: 10 },
    transaction_costs: 0.0002,
    walk_forward: false,
  };
}

export async function resetMockData(): Promise<WorkspaceBootstrap> {
  writeStore(clone(seedData));
  return bootstrapFromStore(readStore());
}
