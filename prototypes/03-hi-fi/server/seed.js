// server/seed.js
import 'dotenv/config';

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import connectDB from './database.js';
import User from './models/User.js';
import Workspace from './models/Workspace.js';
import Dataset from './models/Dataset.js';
import Profile from './models/Profile.js';
import Run from './models/Run.js';
import ErrorLog from './models/ErrorLog.js';
import Setting from './models/Setting.js';

const DEMO_EMAIL = 'marcus@optitrader.dev';
const DEMO_PASSWORD = 'demo1234';

// Adjust if your folder layout differs
const MOCK_DATA_PATH = fileURLToPath(
  new URL('../../02-mid-fi/mockData.json', import.meta.url)
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

  // 2a. Demo user
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      email: DEMO_EMAIL,
      name: 'Marcus Lim',
      passwordHash,
      workspaceName: data.workspace?.name || 'Marcus_Lim_Research',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const owner = user._id.toString();
  console.log(`  ✅ Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

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
      user: owner,
      name: data.workspace.name,
      owner: data.workspace.owner,
    });
    console.log(`  ✅ Workspace: ${data.workspace.name}`);
  }

  // 4b. Datasets
  if (Array.isArray(data.datasets) && data.datasets.length) {
    const datasetDocs = data.datasets.map((d) => ({
      _id: d.dataset_id,
      owner,
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
      owner,
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
      owner,
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
      owner,
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