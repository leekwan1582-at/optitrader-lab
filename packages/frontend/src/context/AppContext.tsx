import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

interface AppContextValue {
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
  logout: () => Promise<void>;
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [settings, setSettings] = useState<Settings>({ max_trials: 500 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootstrapped = useRef(false);

  const applyBootstrap = useCallback((data: WorkspaceBootstrap) => {
    setWorkspace(data.workspace);
    setDatasets(data.datasets || []);
    setProfiles(data.profiles || []);
    setRuns(data.runs || []);
    setErrorLogs(data.errorLogs || []);
    setSettings(data.settings || { max_trials: 500 });
  }, []);

  const clearWorkspace = useCallback(() => {
    setWorkspace(null);
    setDatasets([]);
    setProfiles([]);
    setRuns([]);
    setErrorLogs([]);
    setSettings({ max_trials: 500 });
  }, []);

  const loadBootstrap = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBootstrapData();
      applyBootstrap(data);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [applyBootstrap]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    async function bootstrap(): Promise<void> {
      try {
        const currentUser = await api.refreshSession();
        setUser(currentUser);
        const data = await api.getBootstrapData();
        applyBootstrap(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [applyBootstrap]);

  const login = useCallback(async (credentials: LoginInput): Promise<Session> => {
    setError(null);
    const result = await api.login(credentials);
    setUser(result.user);
    await loadBootstrap();
    return result;
  }, [loadBootstrap]);

  const logout = useCallback(async (): Promise<void> => {
    await api.logout();
    setUser(null);
    clearWorkspace();
  }, [clearWorkspace]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!user) return;
    await loadBootstrap();
  }, [loadBootstrap, user]);

  const uploadDataset = useCallback(async (dataset: UploadDataset): Promise<Dataset> => {
    const created = await api.uploadDataset(dataset);
    setDatasets((current) => [created, ...current]);
    return created;
  }, []);

  const removeDataset = useCallback(async (datasetId: string): Promise<void> => {
    await api.deleteDataset(datasetId);
    setDatasets((current) => current.filter((item) => item.dataset_id !== datasetId));
  }, []);

  const createProfile = useCallback(async (profile: CreateProfileInput): Promise<Profile> => {
    const created = await api.createProfile(profile);
    setProfiles((current) => [created, ...current]);
    return created;
  }, []);

  const parsePrompt = useCallback(
    (prompt: string): Promise<ParsedConfig> => api.parsePrompt(prompt, datasets),
    [datasets]
  );

  const launchRun = useCallback(async (config: RunConfig): Promise<Run> => {
    const run = await api.launchRun(config);
    setRuns((current) => [run, ...current]);
    return run;
  }, []);

  const cloneRun = useCallback(
    (runId: string): Promise<RunConfig> => api.cloneRun(runId),
    []
  );

  const compareRuns = useCallback(
    (ids: string[]): Promise<Run[]> => api.compareRuns(ids),
    []
  );

  const resetDemo = useCallback(async (): Promise<boolean> => {
    if (!api.resetMockData) return false;
    const data = await api.resetMockData();
    applyBootstrap(data);
    return true;
  }, [applyBootstrap]);

  const value = useMemo<AppContextValue>(() => ({
    user,
    workspace,
    datasets,
    profiles,
    runs,
    errorLogs,
    settings,
    loading,
    error,
    isAuthenticated: Boolean(user),
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
    user,
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
