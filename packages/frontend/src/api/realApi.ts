import { http } from './client';
import type {
  CreateProfileInput,
  Dataset,
  ErrorLog,
  LoginInput,
  ParsedConfig,
  Profile,
  Run,
  RunConfig,
  Session,
  UploadDataset,
  User,
  Workspace,
  WorkspaceBootstrap,
} from '../types/domain';

interface UserResponse {
  user: User;
}

function decorateRuns(runs: Run[], profiles: Profile[], datasets: Dataset[]): Run[] {
  const profileMap = new Map(profiles.map((profile) => [profile.profile_id, profile]));
  const datasetMap = new Map(datasets.map((dataset) => [dataset.dataset_id, dataset]));

  return runs.map((run) => {
    const profile = profileMap.get(run.profile_id);
    const dataset = datasetMap.get(run.dataset_id);
    return {
      ...run,
      run_id: run.run_id || run._id || '',
      profile_name: run.profile_name || profile?.name || 'Unknown profile',
      strategy_type: run.strategy_type || profile?.strategy_type || 'sma_crossover',
      dataset_name: run.dataset_name || dataset?.name || 'Unknown dataset',
      symbol: run.symbol || dataset?.symbol || '—',
    };
  });
}

export async function login({ email, password }: LoginInput): Promise<Session> {
  return http.post<Session>('/auth/login', { email, password });
}

export async function getMe(): Promise<User> {
  const response = await http.get<UserResponse>('/auth/me');
  return response.user;
}

export async function refreshSession(): Promise<User> {
  const response = await http.post<UserResponse>('/auth/refresh', {});
  return response.user;
}

export async function logout(): Promise<void> {
  await http.post<unknown>('/auth/logout', {});
}

export async function getWorkspace(): Promise<Workspace> {
  return http.get<Workspace>('/workspace');
}

export async function getBootstrapData(): Promise<WorkspaceBootstrap> {
  const [workspace, datasets, profiles, runs, errorLogs] = await Promise.all([
    getWorkspace(),
    http.get<Dataset[]>('/datasets'),
    http.get<Profile[]>('/profiles'),
    http.get<Run[]>('/runs'),
    http.get<ErrorLog[]>('/error-logs'),
  ]);

  return {
    workspace: workspace || { name: 'Workspace', owner: 'OptiTrader user' },
    datasets,
    profiles,
    runs: decorateRuns(runs, profiles, datasets),
    errorLogs,
    settings: { max_trials: 500, default_holdout_pct: 0.2, default_objective: 'sharpe' },
  };
}

export async function getDatasets(): Promise<Dataset[]> {
  return http.get<Dataset[]>('/datasets');
}

export async function uploadDataset(dataset: UploadDataset): Promise<Dataset> {
  return http.post<Dataset>('/datasets', dataset);
}

export async function deleteDataset(datasetId: string): Promise<void> {
  await http.delete<unknown>(`/datasets/${datasetId}`);
}

export async function getProfiles(): Promise<Profile[]> {
  return http.get<Profile[]>('/profiles');
}

export async function createProfile(profile: CreateProfileInput): Promise<Profile> {
  return http.post<Profile>('/profiles', profile);
}

export async function getRuns(): Promise<Run[]> {
  return http.get<Run[]>('/runs');
}

export async function getRun(runId: string): Promise<Run> {
  return http.get<Run>(`/runs/${runId}`);
}

export async function getErrorLogs(): Promise<ErrorLog[]> {
  return http.get<ErrorLog[]>('/error-logs');
}

export async function parsePrompt(prompt: string, datasets: Dataset[]): Promise<ParsedConfig> {
  return http.post<ParsedConfig>('/assistant', {
    prompt,
    datasets: datasets.map((dataset) => ({
      id: dataset.dataset_id,
      name: dataset.name,
    })),
  });
}

export async function launchRun(config: RunConfig): Promise<Run> {
  return http.post<Run>('/runs', config);
}

export async function compareRuns(ids: string[]): Promise<Run[]> {
  return http.get<Run[]>(`/runs/compare?ids=${encodeURIComponent(ids.join(','))}`);
}

export async function cloneRun(runId: string): Promise<RunConfig> {
  const run = await getRun(runId);
  return run.config || {
    strategy_type: run.strategy_type || 'sma_crossover',
    dataset_id: run.dataset_id,
    objective: 'sharpe',
    max_drawdown_limit: 0.15,
    fast_ma: { min: 5, max: 30, step: 5 },
    slow_ma: { min: 40, max: 120, step: 10 },
    transaction_costs: 0.0002,
    walk_forward: false,
  };
}
