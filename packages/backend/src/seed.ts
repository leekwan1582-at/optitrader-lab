// server/seed.ts
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
import { logger } from './logger.js';

const DEMO_EMAIL = 'marcus@optitrader.dev';
const DEMO_PASSWORD = 'demo1234';

interface MockWorkspace {
  workspace_id: string;
  name: string;
  owner: string;
}

interface MockDataset {
  dataset_id: string;
  name: string;
  symbol: string;
  timeframe: string;
  date_range: string;
  rows: number;
  status: string;
}

interface MockProfile {
  profile_id: string;
  name: string;
  strategy_type: 'sma_crossover' | 'ema_momentum';
  objective: 'sharpe' | 'total_return' | 'calmar';
  max_drawdown_limit: number;
  params: { fast_ma: { min: number; max: number; step: number }; slow_ma: { min: number; max: number; step: number } };
}

interface MockRun {
  run_id: string;
  profile_id: string;
  dataset_id: string;
  status: 'completed' | 'failed' | 'running' | 'queued';
  created_at: string;
  duration_ms?: number;
  holdout_pct?: number;
  trials?: number;
  best?: Record<string, unknown>;
  robustness?: Record<string, unknown>;
  equity_curve?: number[];
  error_code?: string;
}

interface MockErrorLog {
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  component: string;
  message: string;
}

interface MockData {
  workspace?: MockWorkspace;
  datasets?: MockDataset[];
  profiles?: MockProfile[];
  runs?: MockRun[];
  error_logs?: MockErrorLog[];
  settings?: Record<string, unknown>;
}

// Adjust if your folder layout differs
const MOCK_DATA_PATH = fileURLToPath(
  new URL('../../../prototypes/02-mid-fi/mockData.json', import.meta.url)
);

async function seed(): Promise<void> {
  logger.info('🌱 Seeding database...');

  if (!fs.existsSync(MOCK_DATA_PATH)) {
    throw new Error(`Mock data not found at: ${MOCK_DATA_PATH}`);
  }
  const raw = fs.readFileSync(MOCK_DATA_PATH, 'utf-8');
  const data = JSON.parse(raw) as MockData;

  await connectDB();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      email: DEMO_EMAIL,
      name: 'Marcus Lim',
      passwordHash,
      workspaceName: data.workspace?.name || 'Marcus_Lim_Research',
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );
  if (!user) throw new Error('Failed to create demo user.');
  const owner = user._id.toString();
  logger.info(`  ✅ Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  logger.info('🧹 Clearing existing collections...');
  await Promise.all([
    Workspace.deleteMany({}),
    Dataset.deleteMany({}),
    Profile.deleteMany({}),
    Run.deleteMany({}),
    ErrorLog.deleteMany({}),
    Setting.deleteMany({}),
  ]);

  if (data.workspace) {
    await Workspace.create({
      _id: data.workspace.workspace_id,
      user: owner,
      name: data.workspace.name,
      owner: data.workspace.owner,
    });
    logger.info(`  ✅ Workspace: ${data.workspace.name}`);
  }

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
    logger.info(`  ✅ Datasets: ${datasetDocs.length}`);
  }

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
    logger.info(`  ✅ Profiles: ${profileDocs.length}`);
  }

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
    await Run.insertMany(runDocs as never[]);
    logger.info(`  ✅ Runs: ${runDocs.length}`);
  }

  if (Array.isArray(data.error_logs) && data.error_logs.length) {
    const logDocs = data.error_logs.map((l) => ({
      owner,
      severity: l.severity,
      timestamp: new Date(l.timestamp),
      component: l.component,
      message: l.message,
    }));
    await ErrorLog.insertMany(logDocs);
    logger.info(`  ✅ Error Logs: ${logDocs.length}`);
  }

  if (data.settings && typeof data.settings === 'object') {
    const settingDocs = Object.entries(data.settings).map(([key, value]) => ({
      key,
      value,
    }));
    if (settingDocs.length) {
      await Setting.insertMany(settingDocs);
      logger.info(`  ✅ Settings: ${settingDocs.length}`);
    }
  }

  logger.info('🌱 Seed complete.');
}

seed()
  .catch((err: unknown) => {
    logger.error({ err }, '❌ Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
