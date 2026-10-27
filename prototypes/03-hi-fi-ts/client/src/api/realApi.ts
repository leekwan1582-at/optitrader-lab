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
  Workspace,
  WorkspaceBootstrap,
} from '../types/domain';

function authOptions(token?: string): { token?: string } {
  return token ? { token } : {};
}

function decorateRuns(runs: Run[], profiles: Profile[], datasets: Dataset[]): Run[] {
  const profileMap = new Map(profiles.map((profile) => [profile.profile_id || profile._id, profile]));
  const datasetMap = new Map(datasets.map((dataset) => [dataset.dataset_id || dataset._id, dataset]));

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

export async function register({
  name,
  email,
  password,
  workspaceName,
}: {
  name: string;
  email: string;
  password: string;
  workspaceName?: string;
}): Promise<Session> {
  return http.post<Session>('/auth/register', { name, email, password, workspaceName });
}

export async function getWorkspace(token?: string): Promise<Workspace> {
  return http.get<Workspace>('/workspace', authOptions(token));
}

export async function getBootstrapData(token?: string): Promise<WorkspaceBootstrap> {
  const [workspace, datasets, profiles, runs, errorLogs] = await Promise.all([
    getWorkspace(token),
    http.get<Dataset[]>('/datasets', authOptions(token)),
    http.get<Profile[]>('/profiles', authOptions(token)),
    http.get<Run[]>('/runs', authOptions(token)),
    http.get<ErrorLog[]>('/error-logs', authOptions(token)),
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

export async function getDatasets(token?: string): Promise<Dataset[]> {
  return http.get<Dataset[]>('/datasets', authOptions(token));
}

export async function uploadDataset(dataset: UploadDataset, token?: string): Promise<Dataset> {
  return http.post<Dataset>('/datasets', dataset, authOptions(token));
}

export async function deleteDataset(datasetId: string, token?: string): Promise<void> {
  await http.delete<unknown>(`/datasets/${datasetId}`, authOptions(token));
}

export async function getProfiles(token?: string): Promise<Profile[]> {
  return http.get<Profile[]>('/profiles', authOptions(token));
}

export async function createProfile(profile: CreateProfileInput, token?: string): Promise<Profile> {
  return http.post<Profile>('/profiles', profile, authOptions(token));
}

export async function getRuns(token?: string): Promise<Run[]> {
  return http.get<Run[]>('/runs', authOptions(token));
}

export async function getRun(runId: string, token?: string): Promise<Run> {
  return http.get<Run>(`/runs/${runId}`, authOptions(token));
}

export async function getErrorLogs(token?: string): Promise<ErrorLog[]> {
  return http.get<ErrorLog[]>('/error-logs', authOptions(token));
}

export async function parsePrompt(prompt: string, datasets: Dataset[], token?: string): Promise<ParsedConfig> {
  return http.post<ParsedConfig>('/assistant', {
    prompt,
    datasets: datasets.map((dataset) => ({
      id: dataset.dataset_id || dataset._id,
      name: dataset.name,
    })),
  }, authOptions(token));
}

export async function launchRun(config: RunConfig, token?: string): Promise<Run> {
  return http.post<Run>('/runs', config, authOptions(token));
}

export async function compareRuns(ids: string[], token?: string): Promise<Run[]> {
  return http.get<Run[]>(`/runs/compare?ids=${encodeURIComponent(ids.join(','))}`, authOptions(token));
}

export async function cloneRun(runId: string, token?: string): Promise<RunConfig> {
  const run = await getRun(runId, token);
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
