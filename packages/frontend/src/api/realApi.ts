import { http } from './client';
import {
  datasetPreviewResponseSchema,
  datasetSchema,
  paginatedErrorLogsResponseSchema,
  paginatedRunsResponseSchema,
  parsedConfigSchema,
  profileSchema,
  runLogsResponseSchema,
  runSchema,
  sessionSchema,
  userSchema,
  workspaceBootstrapSchema,
  workspaceSchema,
} from '@optitrader/shared';
import { z } from 'zod';
import type {
  ChangePasswordInput,
  CreateProfileInput,
  Dataset,
  DatasetPreviewResponse,
  ErrorLogQuery,
  LoginInput,
  PaginatedErrorLogsResponse,
  PaginatedRunsResponse,
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
  UploadDataset,
  User,
  Workspace,
  WorkspaceBootstrap,
} from '../types/domain';


const userResponseSchema = z.object({
  user: userSchema,
});

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
  return http.post<Session>('/auth/login', { email, password }, sessionSchema);
}

export async function register(input: RegisterInput): Promise<Session> {
  return http.post<Session>('/auth/register', input, sessionSchema);
}

export async function changePassword(input: ChangePasswordInput): Promise<User> {
  const response = await http.post<{ user: User }>('/auth/password', input, userResponseSchema);
  return response.user;
}

export async function updateAccount(input: UpdateAccountInput): Promise<User> {
  const response = await http.patch<{ user: User }>('/auth/me', input, userResponseSchema);
  return response.user;
}

export async function getMe(): Promise<User> {

  const response = await http.get<{ user: User }>('/auth/me', userResponseSchema);
  return response.user;
}

export async function refreshSession(): Promise<User> {
  const response = await http.post<{ user: User }>('/auth/refresh', {}, userResponseSchema);
  return response.user;
}

export async function logout(): Promise<void> {
  await http.post<unknown>('/auth/logout', {});
}

export async function getWorkspace(): Promise<Workspace> {
  return http.get<Workspace>('/workspace', workspaceSchema);
}

export async function getBootstrapData(): Promise<WorkspaceBootstrap> {
  const bootstrap = await http.get<WorkspaceBootstrap>('/workspace', workspaceBootstrapSchema);
  return {
    ...bootstrap,
    runs: decorateRuns(bootstrap.runs, bootstrap.profiles, bootstrap.datasets),
  };
}

export async function getDatasets(): Promise<Dataset[]> {
  return http.get<Dataset[]>('/datasets', z.array(datasetSchema));
}

export async function uploadDataset(
  dataset: UploadDataset | FormData,
  onProgress?: (percent: number) => void
): Promise<Dataset> {
  if (dataset instanceof FormData) {
    return http.upload<Dataset>('/datasets', dataset, datasetSchema, { onProgress });
  }
  return http.post<Dataset>('/datasets', dataset, datasetSchema);
}

export async function getDatasetPreview(datasetId: string): Promise<DatasetPreviewResponse> {
  return http.get<DatasetPreviewResponse>(`/datasets/${datasetId}/preview`, datasetPreviewResponseSchema);
}

export async function deleteDataset(datasetId: string): Promise<void> {
  await http.delete<unknown>(`/datasets/${datasetId}`);
}

export async function getProfiles(): Promise<Profile[]> {
  return http.get<Profile[]>('/profiles', z.array(profileSchema));
}

export async function createProfile(profile: CreateProfileInput): Promise<Profile> {
  return http.post<Profile>('/profiles', profile, profileSchema);
}

export async function updateProfile(profileId: string, profile: UpdateProfileInput): Promise<Profile> {
  return http.put<Profile>(`/profiles/${profileId}`, profile, profileSchema);
}

export async function cloneProfile(profileId: string): Promise<Profile> {
  return http.post<Profile>(`/profiles/${profileId}/clone`, {}, profileSchema);
}

export async function deleteProfile(profileId: string): Promise<void> {
  await http.delete<unknown>(`/profiles/${profileId}`);
}


export async function getRuns(filter?: RunFilterQuery): Promise<PaginatedRunsResponse> {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  if (filter?.strategy_type) params.set('strategy_type', filter.strategy_type);
  if (filter?.dataset_id) params.set('dataset_id', filter.dataset_id);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.limit) params.set('limit', String(filter.limit));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return http.get<PaginatedRunsResponse>(`/runs${qs}`, paginatedRunsResponseSchema);
}

export async function getRun(runId: string): Promise<Run> {
  return http.get<Run>(`/runs/${runId}`, runSchema);
}

export async function getRunLogs(runId: string): Promise<RunLogsResponse> {
  return http.get<RunLogsResponse>(`/runs/${runId}/logs`, runLogsResponseSchema);
}

export async function cancelRun(runId: string): Promise<Run> {
  return http.post<Run>(`/runs/${runId}/cancel`, {}, runSchema);
}

export async function retryRun(runId: string): Promise<Run> {
  return http.post<Run>(`/runs/${runId}/retry`, {}, runSchema);
}

export async function getErrorLogs(filter?: ErrorLogQuery): Promise<PaginatedErrorLogsResponse> {
  const params = new URLSearchParams();
  if (filter?.severity) params.set('severity', filter.severity);
  if (filter?.experiment_id) params.set('experiment_id', filter.experiment_id);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.limit) params.set('limit', String(filter.limit));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return http.get<PaginatedErrorLogsResponse>(`/error-logs${qs}`, paginatedErrorLogsResponseSchema);
}

export async function parsePrompt(prompt: string, datasets: Dataset[]): Promise<ParsedConfig> {
  return http.post<ParsedConfig>('/assistant', {
    prompt,
    datasets: datasets.map((dataset) => ({
      id: dataset.dataset_id,
      name: dataset.name,
    })),
  }, parsedConfigSchema);
}

export async function launchRun(config: RunConfig): Promise<Run> {
  return http.post<Run>('/runs', config, runSchema);
}

export async function compareRuns(ids: string[]): Promise<Run[]> {
  return http.get<Run[]>(`/runs/compare?ids=${encodeURIComponent(ids.join(','))}`, z.array(runSchema));
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

