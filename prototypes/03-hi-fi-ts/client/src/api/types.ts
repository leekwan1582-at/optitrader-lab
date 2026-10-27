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
  WorkspaceBootstrap,
} from '../types/domain';

export interface ApiClient {
  login(credentials: LoginInput): Promise<Session>;
  getBootstrapData(token?: string): Promise<WorkspaceBootstrap>;
  getDatasets(token?: string): Promise<Dataset[]>;
  uploadDataset(dataset: UploadDataset, token?: string): Promise<Dataset>;
  deleteDataset(datasetId: string, token?: string): Promise<void>;
  getProfiles(token?: string): Promise<Profile[]>;
  createProfile(profile: CreateProfileInput, token?: string): Promise<Profile>;
  getRuns(token?: string): Promise<Run[]>;
  getRun(runId: string, token?: string): Promise<Run>;
  getErrorLogs(token?: string): Promise<ErrorLog[]>;
  parsePrompt(prompt: string, datasets: Dataset[], token?: string): Promise<ParsedConfig>;
  launchRun(config: RunConfig, token?: string): Promise<Run>;
  compareRuns(ids: string[], token?: string): Promise<Run[]>;
  cloneRun(runId: string, token?: string): Promise<RunConfig>;
  resetMockData?(): Promise<WorkspaceBootstrap>;
}
