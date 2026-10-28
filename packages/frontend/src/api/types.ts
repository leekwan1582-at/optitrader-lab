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
  WorkspaceBootstrap,
} from '../types/domain';

export interface ApiClient {
  login(credentials: LoginInput): Promise<Session>;
  getMe(): Promise<User>;
  refreshSession(): Promise<User>;
  logout(): Promise<void>;
  getBootstrapData(): Promise<WorkspaceBootstrap>;
  getDatasets(): Promise<Dataset[]>;
  uploadDataset(dataset: UploadDataset): Promise<Dataset>;
  deleteDataset(datasetId: string): Promise<void>;
  getProfiles(): Promise<Profile[]>;
  createProfile(profile: CreateProfileInput): Promise<Profile>;
  getRuns(): Promise<Run[]>;
  getRun(runId: string): Promise<Run>;
  getErrorLogs(): Promise<ErrorLog[]>;
  parsePrompt(prompt: string, datasets: Dataset[]): Promise<ParsedConfig>;
  launchRun(config: RunConfig): Promise<Run>;
  compareRuns(ids: string[]): Promise<Run[]>;
  cloneRun(runId: string): Promise<RunConfig>;
  resetMockData?(): Promise<WorkspaceBootstrap>;
}
