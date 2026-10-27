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

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  workspaceName: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  workspaceName: string;
}

export interface WorkspaceData {
  _id?: string;
  workspace_id?: string;
  user?: string;
  name: string;
  owner: string;
}

export interface DatasetData {
  _id: string;
  dataset_id?: string;
  owner: string;
  name: string;
  symbol: string;
  timeframe: string;
  date_range: string;
  rows: number;
  status: string;
  file_ref?: string | null;
  original_filename?: string | null;
}

export interface ProfileData {
  _id: string;
  profile_id?: string;
  owner: string;
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

export interface ProfileSnapshot {
  name: string;
  strategy_type: StrategyType;
  objective: Objective;
  max_drawdown_limit: number;
  params: StrategyParams;
}

export interface RunData {
  _id: string;
  run_id?: string;
  owner: string;
  profile_id: string;
  dataset_id: string;
  run_hash?: string;
  config?: RunConfig;
  profile_snapshot?: ProfileSnapshot;
  status: RunStatus;
  created_at: Date;
  duration_ms?: number;
  holdout_pct?: number;
  trials?: number;
  best?: BestMetrics;
  robustness?: Robustness;
  equity_curve: number[];
  ai_summary?: AiSummary;
  error_code?: string;
  error_message?: string;
  profile_name?: string;
  strategy_type?: StrategyType;
  dataset_name?: string;
  symbol?: string;
}

export interface ErrorLogData {
  owner?: string;
  experiment_id?: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  component: string;
  message: string;
}

export interface BacktestResult {
  status: string;
  best_params?: {
    fast_ma?: number;
    slow_ma?: number;
    fast?: number;
    slow?: number;
  };
  metrics?: {
    sharpe_ratio?: number;
    total_return?: number;
    max_drawdown?: number;
    win_rate?: number;
    profit_factor?: number;
    total_trades?: number;
  };
  equity_curve?: Array<{ date: string; value: number }>;
  error?: string;
}

export interface CsvMetadata {
  rows: number;
  dateRange: string;
  firstDate: Date | null;
  lastDate: Date | null;
}

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  mongoUri: string;
  geminiApiKey: string;
  geminiModel: string;
  clientUrl: string;
  jwtSecret: string | null;
  jwtExpiresIn: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  workspaceName: string;
  iat?: number;
  exp?: number;
}
