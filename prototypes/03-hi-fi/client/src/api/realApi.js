import { http } from './client.js';

function authOptions(token) {
  return token ? { token } : {};
}

function decorateRuns(runs, profiles, datasets) {
  const profileMap = new Map(profiles.map((profile) => [profile._id || profile.profile_id, profile]));
  const datasetMap = new Map(datasets.map((dataset) => [dataset._id || dataset.dataset_id, dataset]));

  return runs.map((run) => {
    const profile = profileMap.get(run.profile_id);
    const dataset = datasetMap.get(run.dataset_id);
    return {
      ...run,
      run_id: run.run_id || run._id,
      profile_name: run.profile_name || profile?.name || 'Unknown profile',
      strategy_type: run.strategy_type || profile?.strategy_type || 'unknown',
      dataset_name: run.dataset_name || dataset?.name || 'Unknown dataset',
      symbol: run.symbol || dataset?.symbol || '—',
    };
  });
}

export async function login({ email, password }) {
  return http.post('/auth/login', { email, password });
}

export async function register({ name, email, password, workspaceName }) {
  return http.post('/auth/register', { name, email, password, workspaceName });
}

export async function getWorkspace(token) {
  return http.get('/workspace', authOptions(token));
}

export async function getBootstrapData(token) {
  const [workspace, datasets, profiles, runs, errorLogs] = await Promise.all([
    getWorkspace(token),
    http.get('/datasets', authOptions(token)),
    http.get('/profiles', authOptions(token)),
    http.get('/runs', authOptions(token)),
    http.get('/error-logs', authOptions(token)),
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

export async function getDatasets(token) {
  return http.get('/datasets', authOptions(token));
}

export async function uploadDataset(dataset, token) {
  return http.post('/datasets', dataset, authOptions(token));
}

export async function deleteDataset(datasetId, token) {
  return http.delete(`/datasets/${datasetId}`, authOptions(token));
}

export async function getProfiles(token) {
  return http.get('/profiles', authOptions(token));
}

export async function createProfile(profile, token) {
  return http.post('/profiles', profile, authOptions(token));
}

export async function getRuns(token) {
  return http.get('/runs', authOptions(token));
}

export async function getRun(runId, token) {
  return http.get(`/runs/${runId}`, authOptions(token));
}

export async function getErrorLogs(token) {
  return http.get('/error-logs', authOptions(token));
}

export async function parsePrompt(prompt, datasets, token) {
  return http.post('/assistant', {
    prompt,
    datasets: datasets.map((dataset) => ({
      id: dataset.dataset_id || dataset._id,
      name: dataset.name,
    })),
  }, authOptions(token));
}

export async function launchRun(config, token) {
  return http.post('/runs', config, authOptions(token));
}

export async function compareRuns(ids, token) {
  return http.get(`/runs/compare?ids=${encodeURIComponent(ids.join(','))}`, authOptions(token));
}

export async function cloneRun(runId, token) {
  const run = await getRun(runId, token);
  return run.config || run;
}
