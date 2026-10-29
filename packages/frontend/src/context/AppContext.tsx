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
  ChangePasswordInput,
  CreateProfileInput,
  Dataset,
  ErrorLog,
  LoginInput,
  ParsedConfig,
  Profile,
  RegisterInput,
  Run,
  RunConfig,
  Session,
  Settings,
  UpdateAccountInput,
  UpdateProfileInput,
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
  register: (input: RegisterInput) => Promise<Session>;
  changePassword: (input: ChangePasswordInput) => Promise<User>;
  updateAccount: (input: UpdateAccountInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  uploadDataset: (dataset: UploadDataset | FormData, onProgress?: (percent: number) => void) => Promise<Dataset>;
  removeDataset: (datasetId: string) => Promise<void>;
  createProfile: (profile: CreateProfileInput) => Promise<Profile>;
  updateProfile: (profileId: string, profile: UpdateProfileInput) => Promise<Profile>;
  cloneProfile: (profileId: string) => Promise<Profile>;
  removeProfile: (profileId: string) => Promise<void>;
  parsePrompt: (prompt: string) => Promise<ParsedConfig>;
  launchRun: (config: RunConfig) => Promise<Run>;
  cancelRun: (runId: string) => Promise<Run>;
  retryRun: (runId: string) => Promise<Run>;
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

  const register = useCallback(async (input: RegisterInput): Promise<Session> => {
    setError(null);
    const result = await api.register(input);
    setUser(result.user);
    await loadBootstrap();
    return result;
  }, [loadBootstrap]);

  const changePassword = useCallback(async (input: ChangePasswordInput): Promise<User> => {
    const updated = await api.changePassword(input);
    setUser(updated);
    return updated;
  }, []);

  const updateAccount = useCallback(async (input: UpdateAccountInput): Promise<User> => {
    const updated = await api.updateAccount(input);
    setUser(updated);
    if (updated.workspaceName) {
      const newWsName = updated.workspaceName;
      setWorkspace((current) => (current ? { ...current, name: newWsName } : current));
    }
    return updated;
  }, []);


  const logout = useCallback(async (): Promise<void> => {
    await api.logout();
    setUser(null);
    clearWorkspace();
  }, [clearWorkspace]);


  const refresh = useCallback(async (): Promise<void> => {
    if (!user) return;
    await loadBootstrap();
  }, [loadBootstrap, user]);

  const uploadDataset = useCallback(
    async (dataset: UploadDataset | FormData, onProgress?: (percent: number) => void): Promise<Dataset> => {
      const created = await api.uploadDataset(dataset, onProgress);
      setDatasets((current) => [created, ...current]);
      return created;
    },
    []
  );

  const removeDataset = useCallback(async (datasetId: string): Promise<void> => {
    await api.deleteDataset(datasetId);
    setDatasets((current) => current.filter((item) => item.dataset_id !== datasetId));
  }, []);

  const createProfile = useCallback(async (profile: CreateProfileInput): Promise<Profile> => {
    const created = await api.createProfile(profile);
    setProfiles((current) => [created, ...current]);
    return created;
  }, []);

  const updateProfile = useCallback(async (profileId: string, profile: UpdateProfileInput): Promise<Profile> => {
    const updated = await api.updateProfile(profileId, profile);
    setProfiles((current) => current.map((p) => p.profile_id === profileId ? updated : p));
    return updated;
  }, []);

  const cloneProfile = useCallback(async (profileId: string): Promise<Profile> => {
    const cloned = await api.cloneProfile(profileId);
    setProfiles((current) => [cloned, ...current]);
    return cloned;
  }, []);

  const removeProfile = useCallback(async (profileId: string): Promise<void> => {
    await api.deleteProfile(profileId);
    setProfiles((current) => current.filter((p) => p.profile_id !== profileId));
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

  const cancelRun = useCallback(async (runId: string): Promise<Run> => {
    const cancelled = await api.cancelRun(runId);
    setRuns((current) => current.map((r) => r.run_id === runId ? cancelled : r));
    return cancelled;
  }, []);

  const retryRun = useCallback(async (runId: string): Promise<Run> => {
    const retried = await api.retryRun(runId);
    setRuns((current) => [retried, ...current]);
    return retried;
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
    register,
    changePassword,
    updateAccount,
    logout,
    refresh,
    uploadDataset,
    removeDataset,
    createProfile,
    updateProfile,
    cloneProfile,
    removeProfile,
    parsePrompt,
    launchRun,
    cancelRun,
    retryRun,
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
    register,
    changePassword,
    updateAccount,
    logout,
    refresh,
    uploadDataset,
    removeDataset,
    createProfile,
    updateProfile,
    cloneProfile,
    removeProfile,
    parsePrompt,
    launchRun,
    cancelRun,
    retryRun,
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
