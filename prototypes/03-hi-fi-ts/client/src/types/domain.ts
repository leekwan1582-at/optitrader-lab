export type StrategyType = 'sma_crossover' | 'ema_momentum';
export type Objective = 'sharpe' | 'total_return' | 'calmar';
export type RunStatus = 'completed' | 'failed' | 'running' | 'queued';

export interface ParameterRange {
  min: number;
  max: number;
  step: number;
}

export interface StrategyParams {
  fast_ma: ParameterRange;
  slow_ma: ParameterRange;
}

export interface Workspace {
  workspace_id?: string;
  _id?: string;
  user?: string;
  name: string;
  owner: string;
}

export interface Dataset {
  dataset_id: string;
  _id?: string;
  owner?: string;
  name: string;
  symbol: string;
  timeframe: string;
  date_range: string;
  rows: number;
  status: string;
  file_ref?: string | null;
  original_filename?: string | null;
}

export interface Profile {
  profile_id: string;
  _id?: string;
  owner?: string;
  name: string;
  strategy_type: StrategyType;
  objective: Objective;
  max_drawdown_limit: number;
  params: StrategyParams;
}

export interface BestMetrics {
  fast_ma: number;
  slow_ma: number;
  sharpe: number;
  total_return: number;
  max_drawdown: number;
  profit_factor: number;
  trades: number;
}

export interface Robustness {
  confidence_score: number;
  edge_of_grid: boolean;
  out_of_sample_drop: number;
  transaction_costs_included: boolean;
  walk_forward_completed: boolean;
  warnings: string[];
}

export interface AiSummary {
  headline: string;
  key_findings: string[];
  caveats: string[];
}

export interface RunConfig {
  prompt?: string;
  strategy_type: StrategyType;
  dataset_id: string;
  objective: Objective;
  max_drawdown_limit: number;
  fast_ma: ParameterRange;
  slow_ma: ParameterRange;
  transaction_costs?: number;
  walk_forward?: boolean;
}

export interface ParsedConfig extends RunConfig {
  estimated_combinations?: number;
  source?: string;
  clarification?: string;
}

export interface Run {
  run_id: string;
  _id?: string;
  owner?: string;
  profile_id: string;
  dataset_id: string;
  run_hash?: string;
  config?: RunConfig;
  status: RunStatus;
  created_at: string;
  duration_ms?: number;
  holdout_pct?: number;
  trials?: number;
  best?: BestMetrics;
  robustness?: Robustness;
  equity_curve?: number[];
  ai_summary?: AiSummary;
  error_code?: string;
  error_message?: string;
  profile_name?: string;
  strategy_type?: StrategyType;
  dataset_name?: string;
  symbol?: string;
}

export interface ErrorLog {
  owner?: string;
  experiment_id?: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  component: string;
  message: string;
}

export interface Settings {
  max_trials: number;
  default_holdout_pct?: number;
  default_objective?: Objective;
}

export interface WorkspaceBootstrap {
  workspace: Workspace;
  datasets: Dataset[];
  profiles: Profile[];
  runs: Run[];
  errorLogs: ErrorLog[];
  settings: Settings;
}

export interface MockData extends WorkspaceBootstrap {
  error_logs: ErrorLog[];
}

export interface User {
  id?: string;
  name: string;
  email: string;
  workspaceName?: string;
  workspace?: Workspace;
}

export interface Session {
  token: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UploadDataset {
  name: string;
  symbol: string;
  timeframe: string;
  dateRange: string;
  rows: number;
  csvText?: string;
}

export interface CreateProfileInput {
  name: string;
  strategy_type: StrategyType;
  objective: Objective;
  max_drawdown_limit: number;
  params: StrategyParams;
}
