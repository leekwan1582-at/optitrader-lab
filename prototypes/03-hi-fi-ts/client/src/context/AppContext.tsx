import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/index';
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
  Settings,
  UploadDataset,
  User,
  Workspace,
  WorkspaceBootstrap,
} from '../types/domain';

const SESSION_KEY = 'optitrader:session';

interface AppContextValue {
  session: Session | null;
  token?: string;
  user: User | null;
  workspace: Workspace | null;
  datasets: Dataset[];
  profiles: Profile[];
  runs: Run[];
  errorLogs: ErrorLog[];
  settings: Settings;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<Session>;
  logout: () => void;
  refresh: () => Promise<void>;
  uploadDataset: (dataset: UploadDataset) => Promise<Dataset>;
  removeDataset: (datasetId: string) => Promise<void>;
  createProfile: (profile: CreateProfileInput) => Promise<Profile>;
  parsePrompt: (prompt: string) => Promise<ParsedConfig>;
  launchRun: (config: RunConfig) => Promise<Run>;
  cloneRun: (runId: string) => Promise<RunConfig>;
  compareRuns: (ids: string[]) => Promise<Run[]>;
  resetDemo: () => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null): void {
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [settings, setSettings] = useState<Settings>({ max_trials: 500 });
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState<string | null>(null);

  const token = session?.token;

  const applyBootstrap = useCallback((data: WorkspaceBootstrap) => {
    setWorkspace(data.workspace);
    setDatasets(data.datasets || []);
    setProfiles(data.profiles || []);
    setRuns(data.runs || []);
    setErrorLogs(data.errorLogs || []);
    setSettings(data.settings || { max_trials: 500 });
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBootstrapData(token);
      applyBootstrap(data);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [applyBootstrap, session, token]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh, session]);

  const login = useCallback(async (credentials: LoginInput): Promise<Session> => {
    setError(null);
    const result = await api.login(credentials);
    writeSession(result);
    setSession(result);
    return result;
  }, []);

  const logout = useCallback((): void => {
    writeSession(null);
    setSession(null);
    setWorkspace(null);
    setDatasets([]);
    setProfiles([]);
    setRuns([]);
    setErrorLogs([]);
  }, []);

  const uploadDataset = useCallback(async (dataset: UploadDataset): Promise<Dataset> => {
    const created = await api.uploadDataset(dataset, token);
    setDatasets((current) => [created, ...current]);
    return created;
  }, [token]);

  const removeDataset = useCallback(async (datasetId: string): Promise<void> => {
    await api.deleteDataset(datasetId, token);
    setDatasets((current) => current.filter((item) => item.dataset_id !== datasetId));
  }, [token]);

  const createProfile = useCallback(async (profile: CreateProfileInput): Promise<Profile> => {
    const created = await api.createProfile(profile, token);
    setProfiles((current) => [created, ...current]);
    return created;
  }, [token]);

  const parsePrompt = useCallback(
    (prompt: string): Promise<ParsedConfig> => api.parsePrompt(prompt, datasets, token),
    [datasets, token]
  );

  const launchRun = useCallback(async (config: RunConfig): Promise<Run> => {
    const run = await api.launchRun(config, token);
    setRuns((current) => [run, ...current]);
    return run;
  }, [token]);

  const cloneRun = useCallback(
    (runId: string): Promise<RunConfig> => api.cloneRun(runId, token),
    [token]
  );

  const compareRuns = useCallback(
    (ids: string[]): Promise<Run[]> => api.compareRuns(ids, token),
    [token]
  );

  const resetDemo = useCallback(async (): Promise<boolean> => {
    if (!api.resetMockData) return false;
    const data = await api.resetMockData();
    applyBootstrap(data);
    return true;
  }, [applyBootstrap]);

  const value = useMemo<AppContextValue>(() => ({
    session,
    token,
    user: session?.user || null,
    workspace,
    datasets,
    profiles,
    runs,
    errorLogs,
    settings,
    loading,
    error,
    isAuthenticated: Boolean(session),
    login,
    logout,
    refresh,
    uploadDataset,
    removeDataset,
    createProfile,
    parsePrompt,
    launchRun,
    cloneRun,
    compareRuns,
    resetDemo,
  }), [
    session,
    token,
    workspace,
    datasets,
    profiles,
    runs,
    errorLogs,
    settings,
    loading,
    error,
    login,
    logout,
    refresh,
    uploadDataset,
    removeDataset,
    createProfile,
    parsePrompt,
    launchRun,
    cloneRun,
    compareRuns,
    resetDemo,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
}
