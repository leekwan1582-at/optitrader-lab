import {
  datasetSchema,
  errorLogSchema,
  profileSchema,
  runSchema,
  workspaceBootstrapSchema,
  workspaceSchema,
  type Dataset,
  type ErrorLog,
  type Profile,
  type Run,
  type User,
  type Workspace,
  type WorkspaceBootstrap,
} from '@optitrader/shared';

export interface DocumentLike {
  _id?: unknown;
  id?: unknown;
  toObject?: () => Record<string, unknown>;
  [key: string]: unknown;
}

function toPlainObject(doc: unknown): Record<string, unknown> {
  if (!doc || typeof doc !== 'object') return {};
  const toObject = (doc as DocumentLike).toObject;
  if (typeof toObject === 'function') {
    return toObject.call(doc);
  }
  return { ...(doc as Record<string, unknown>) };
}


export function toUserDTO(user: unknown): User {
  const plain = toPlainObject(user);
  return {
    id: String(plain.id ?? plain._id ?? ''),
    email: String(plain.email ?? ''),
    name: String(plain.name ?? ''),
    workspaceName: String(plain.workspaceName ?? 'Default Workspace'),
  };
}

export function toWorkspaceDTO(workspace: unknown, fallbackOwner = ''): Workspace {
  const plain = toPlainObject(workspace);
  const data: Workspace = {
    workspace_id: String(plain.workspace_id ?? plain._id ?? ''),
    _id: String(plain._id ?? plain.workspace_id ?? ''),
    user: plain.user ? String(plain.user) : undefined,
    name: String(plain.name ?? 'Default Workspace'),
    owner: String(plain.owner ?? fallbackOwner),
  };
  return workspaceSchema.parse(data);
}

export function toDatasetDTO(dataset: unknown): Dataset {
  const plain = toPlainObject(dataset);
  const data = {
    ...plain,
    dataset_id: String(plain.dataset_id ?? plain._id ?? ''),
    _id: String(plain._id ?? plain.dataset_id ?? ''),
    owner: plain.owner ? String(plain.owner) : undefined,
    name: String(plain.name ?? ''),
    symbol: String(plain.symbol ?? ''),
    timeframe: String(plain.timeframe ?? ''),
    date_range: String(plain.date_range ?? ''),
    rows: Number(plain.rows ?? 0),
    status: String(plain.status ?? 'validated'),
    file_ref: plain.file_ref ? String(plain.file_ref) : null,
    original_filename: plain.original_filename ? String(plain.original_filename) : null,
  };
  return datasetSchema.parse(data);
}

export function toProfileDTO(profile: unknown): Profile {
  const plain = toPlainObject(profile);
  const data = {
    ...plain,
    profile_id: String(plain.profile_id ?? plain._id ?? ''),
    _id: String(plain._id ?? plain.profile_id ?? ''),
    owner: plain.owner ? String(plain.owner) : undefined,
    name: String(plain.name ?? ''),
    strategy_type: plain.strategy_type ?? 'sma_crossover',
    objective: plain.objective ?? 'sharpe',
    max_drawdown_limit: Number(plain.max_drawdown_limit ?? 0.2),
    params: plain.params,
  };
  return profileSchema.parse(data);
}

export function toRunDTO(run: unknown): Run {
  const plain = toPlainObject(run);
  const data = {
    ...plain,
    run_id: String(plain.run_id ?? plain._id ?? ''),
    _id: String(plain._id ?? plain.run_id ?? ''),
    owner: plain.owner ? String(plain.owner) : undefined,
    profile_id: String(plain.profile_id ?? ''),
    dataset_id: String(plain.dataset_id ?? ''),
    status: plain.status ?? 'completed',
    created_at: plain.created_at ? new Date(plain.created_at as string | number | Date) : new Date(),
  };
  return runSchema.parse(data);
}

export function toErrorLogDTO(log: unknown): ErrorLog {
  const plain = toPlainObject(log);
  const data = {
    owner: plain.owner ? String(plain.owner) : undefined,
    experiment_id: plain.experiment_id ? String(plain.experiment_id) : undefined,
    severity: plain.severity ?? 'info',
    timestamp: plain.timestamp ? new Date(plain.timestamp as string | number | Date) : new Date(),
    component: String(plain.component ?? 'System'),
    message: String(plain.message ?? ''),
  };
  return errorLogSchema.parse(data);
}

export function toWorkspaceBootstrapDTO(input: {
  workspace: unknown;
  datasets: unknown[];
  profiles: unknown[];
  runs: unknown[];
  errorLogs: unknown[];
  settings?: unknown;
}): WorkspaceBootstrap {
  const data = {
    workspace: toWorkspaceDTO(input.workspace),
    datasets: input.datasets.map(toDatasetDTO),
    profiles: input.profiles.map(toProfileDTO),
    runs: input.runs.map(toRunDTO),
    errorLogs: input.errorLogs.map(toErrorLogDTO),
    settings: input.settings ?? {
      max_trials: 500,
      default_holdout_pct: 0.2,
      default_objective: 'sharpe',
    },
  };
  return workspaceBootstrapSchema.parse(data);
}

