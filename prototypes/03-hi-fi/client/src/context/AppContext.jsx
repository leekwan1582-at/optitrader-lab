import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/index.js';

const SESSION_KEY = 'optitrader:session';
const AppContext = createContext(null);

function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [workspace, setWorkspace] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [runs, setRuns] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [settings, setSettings] = useState({ max_trials: 500 });
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState(null);

  const token = session?.token;

  const applyBootstrap = useCallback((data) => {
    setWorkspace(data.workspace);
    setDatasets(data.datasets || []);
    setProfiles(data.profiles || []);
    setRuns(data.runs || []);
    setErrorLogs(data.errorLogs || []);
    setSettings(data.settings || { max_trials: 500 });
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBootstrapData(token);
      applyBootstrap(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load workspace data.');
    } finally {
      setLoading(false);
    }
  }, [applyBootstrap, session, token]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, session]);

  const login = useCallback(async (credentials) => {
    setError(null);
    const result = await api.login(credentials);
    writeSession(result);
    setSession(result);
    return result;
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
    setWorkspace(null);
    setDatasets([]);
    setProfiles([]);
    setRuns([]);
    setErrorLogs([]);
  }, []);

  const uploadDataset = useCallback(async (dataset) => {
    const created = await api.uploadDataset(dataset, token);
    setDatasets((current) => [created, ...current]);
    return created;
  }, [token]);

  const removeDataset = useCallback(async (datasetId) => {
    await api.deleteDataset(datasetId, token);
    setDatasets((current) => current.filter((item) => item.dataset_id !== datasetId));
  }, [token]);

  const createProfile = useCallback(async (profile) => {
    const created = await api.createProfile(profile, token);
    setProfiles((current) => [created, ...current]);
    return created;
  }, [token]);

  const parsePrompt = useCallback(
    (prompt) => api.parsePrompt(prompt, datasets, token),
    [datasets, token]
  );

  const launchRun = useCallback(async (config) => {
    const run = await api.launchRun(config, token);
    setRuns((current) => [run, ...current]);
    return run;
  }, [token]);

  const cloneRun = useCallback(
    (runId) => api.cloneRun(runId, token),
    [token]
  );

  const compareRuns = useCallback(
    (ids) => api.compareRuns(ids, token),
    [token]
  );

  const resetDemo = useCallback(async () => {
    if (!api.resetMockData) return false;
    const data = await api.resetMockData();
    applyBootstrap(data);
    return true;
  }, [applyBootstrap]);

  const value = useMemo(() => ({
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

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
}
