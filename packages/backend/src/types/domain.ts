import type {
  AiSummary,
  BestMetrics,
  JwtPayload as SharedJwtPayload,
  Objective,
  ParameterRange,
  ProfileSnapshot,
  Robustness,
  RunConfig,
  RunStatus,
  StrategyParams,
  StrategyType,
  User,
} from '@optitrader/shared';

export type {
  AiSummary,
  BestMetrics,
  Objective,
  ParameterRange,
  ProfileSnapshot,
  Robustness,
  RunConfig,
  RunStatus,
  StrategyParams,
  StrategyType,
  User,
  User as AuthUser,
  User as UserPublic,
  SharedJwtPayload as JwtPayload,
};

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  mongoUri: string;
  geminiApiKey: string;
  geminiModel: string;
  clientUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  cookieDomain: string | null;
  uploadDir: string;
  maxUploadMb: number;
}


export interface CsvMetadata {
  rows: number;
  dateRange: string;
  firstDate: Date | null;
  lastDate: Date | null;
  columns?: string[];
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
    calmar_ratio?: number;
    win_rate?: number;
    profit_factor?: number;
    total_trades?: number;
    oos_sharpe?: number;
    oos_total_return?: number;
    oos_max_drawdown?: number;
  };
  robustness?: {
    edge_of_grid?: boolean;
    out_of_sample_drop?: number;
    warnings?: string[];
  };
  equity_curve?: Array<{ date: string; value: number }>;
  error?: string;
}

export interface DatasetRecord {
  _id: string;
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

export interface ProfileRecord {
  _id: string;
  owner: string;
  name: string;
  strategy_type: StrategyType;
  objective: Objective;
  max_drawdown_limit: number;
  params: StrategyParams;
}

export interface RunRecord {
  _id: string;
  owner: string;
  profile_id: string;
  dataset_id: string;
  retried_from?: string;
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
  run_id?: string;
  profile_name?: string;
  strategy_type?: StrategyType;
  dataset_name?: string;
  symbol?: string;
}

export interface WorkspaceRecord {
  _id: string;
  user?: string;
  name: string;
  owner: string;
}

export interface ErrorLogRecord {
  owner?: string;
  experiment_id?: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  component: string;
  message: string;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export type DatasetData = DatasetRecord;
export type ProfileData = ProfileRecord;
export type RunData = RunRecord;
export type WorkspaceData = WorkspaceRecord;
export type ErrorLogData = ErrorLogRecord;
