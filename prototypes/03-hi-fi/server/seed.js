// server/seed.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('./database');
const Workspace = require('./models/Workspace');
const Dataset = require('./models/Dataset');
const Profile = require('./models/Profile');
const Run = require('./models/Run');
const ErrorLog = require('./models/ErrorLog');
const Setting = require('./models/Setting');

// Adjust if your folder layout differs
const MOCK_DATA_PATH = path.resolve(
  __dirname,
  '../../02-mid-fi/mockData.json'
);

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Read mock data
  if (!fs.existsSync(MOCK_DATA_PATH)) {
    throw new Error(`Mock data not found at: ${MOCK_DATA_PATH}`);
  }
  const raw = fs.readFileSync(MOCK_DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);

  // 2. Connect
  await connectDB();

  // 3. Wipe existing collections (idempotent re-seed)
  console.log('🧹 Clearing existing collections...');
  await Promise.all([
    Workspace.deleteMany({}),
    Dataset.deleteMany({}),
    Profile.deleteMany({}),
    Run.deleteMany({}),
    ErrorLog.deleteMany({}),
    Setting.deleteMany({}),
  ]);

  // 4. Insert in dependency order

  // 4a. Workspace (single doc in mock data)
  if (data.workspace) {
    await Workspace.create({
      _id: data.workspace.workspace_id,
      name: data.workspace.name,
      owner: data.workspace.owner,
    });
    console.log(`  ✅ Workspace: ${data.workspace.name}`);
  }

  // 4b. Datasets
  if (Array.isArray(data.datasets) && data.datasets.length) {
    const datasetDocs = data.datasets.map((d) => ({
      _id: d.dataset_id,
      name: d.name,
      symbol: d.symbol,
      timeframe: d.timeframe,
      date_range: d.date_range,
      rows: d.rows,
      status: d.status,
    }));
    await Dataset.insertMany(datasetDocs);
    console.log(`  ✅ Datasets: ${datasetDocs.length}`);
  }

  // 4c. Profiles
  if (Array.isArray(data.profiles) && data.profiles.length) {
    const profileDocs = data.profiles.map((p) => ({
      _id: p.profile_id,
      name: p.name,
      strategy_type: p.strategy_type,
      objective: p.objective,
      max_drawdown_limit: p.max_drawdown_limit,
      params: p.params,
    }));
    await Profile.insertMany(profileDocs);
    console.log(`  ✅ Profiles: ${profileDocs.length}`);
  }

  // 4d. Runs (depend on Profile + Dataset)
  if (Array.isArray(data.runs) && data.runs.length) {
    const runDocs = data.runs.map((r) => ({
      _id: r.run_id,
      profile_id: r.profile_id,
      dataset_id: r.dataset_id,
      status: r.status,
      created_at: new Date(r.created_at),
      duration_ms: r.duration_ms,
      holdout_pct: r.holdout_pct,
      trials: r.trials,
      best: r.best,
      robustness: r.robustness,
      equity_curve: r.equity_curve || [],
      error_code: r.error_code,
    }));
    await Run.insertMany(runDocs);
    console.log(`  ✅ Runs: ${runDocs.length}`);
  }

  // 4e. Error logs
  if (Array.isArray(data.error_logs) && data.error_logs.length) {
    const logDocs = data.error_logs.map((l) => ({
      severity: l.severity,
      timestamp: new Date(l.timestamp),
      component: l.component,
      message: l.message,
    }));
    await ErrorLog.insertMany(logDocs);
    console.log(`  ✅ Error Logs: ${logDocs.length}`);
  }

  // 4f. Settings (flatten object → key/value docs)
  if (data.settings && typeof data.settings === 'object') {
    const settingDocs = Object.entries(data.settings).map(([key, value]) => ({
      key,
      value,
    }));
    if (settingDocs.length) {
      await Setting.insertMany(settingDocs);
      console.log(`  ✅ Settings: ${settingDocs.length}`);
    }
  }

  console.log('🌱 Seed complete.');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });