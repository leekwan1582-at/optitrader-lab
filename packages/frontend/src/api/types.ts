import type {
  ChangePasswordInput,
  CreateProfileInput,
  Dataset,
  DatasetPreviewResponse,
  LoginInput,
  ParsedConfig,
  Profile,
  RegisterInput,
  Run,
  RunConfig,
  Session,
  UpdateAccountInput,
  UpdateProfileInput,
  UploadDataset,
  User,
  WorkspaceBootstrap,
} from '../types/domain';

export interface ApiClient {
  login(credentials: LoginInput): Promise<Session>;
  register(input: RegisterInput): Promise<Session>;
  changePassword(input: ChangePasswordInput): Promise<User>;
  updateAccount(input: UpdateAccountInput): Promise<User>;
  getMe(): Promise<User>;
  refreshSession(): Promise<User>;
  logout(): Promise<void>;
  getBootstrapData(): Promise<WorkspaceBootstrap>;
  getDatasets(): Promise<Dataset[]>;
  uploadDataset(dataset: UploadDataset | FormData, onProgress?: (percent: number) => void): Promise<Dataset>;
  getDatasetPreview(datasetId: string): Promise<DatasetPreviewResponse>;
  deleteDataset(datasetId: string): Promise<void>;
  getProfiles(): Promise<Profile[]>;
  createProfile(profile: CreateProfileInput): Promise<Profile>;
  updateProfile(profileId: string, profile: UpdateProfileInput): Promise<Profile>;
  cloneProfile(profileId: string): Promise<Profile>;
  deleteProfile(profileId: string): Promise<void>;
  getRuns(filter?: import('@optitrader/shared').RunFilterQuery): Promise<import('@optitrader/shared').PaginatedRunsResponse>;
  getRun(runId: string): Promise<Run>;
  getRunLogs(runId: string): Promise<import('@optitrader/shared').RunLogsResponse>;
  cancelRun(runId: string): Promise<Run>;
  retryRun(runId: string): Promise<Run>;
  getErrorLogs(filter?: import('@optitrader/shared').ErrorLogQuery): Promise<import('@optitrader/shared').PaginatedErrorLogsResponse>;
  parsePrompt(prompt: string, datasets: Dataset[]): Promise<ParsedConfig>;
  launchRun(config: RunConfig): Promise<Run>;
  compareRuns(ids: string[]): Promise<Run[]>;
  cloneRun(runId: string): Promise<RunConfig>;
  resetMockData?(): Promise<WorkspaceBootstrap>;
}

