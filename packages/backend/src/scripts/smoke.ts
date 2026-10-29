/**
 * Live API Smoke Test
 * Tests: register/login -> workspace bootstrap -> dataset upload -> run launch -> comparison -> teardown
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import connectDB from '../database.js';
import User, { type UserDocument } from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Dataset from '../models/Dataset.js';
import Profile from '../models/Profile.js';
import Run from '../models/Run.js';
import ErrorLog from '../models/ErrorLog.js';
import { logger } from '../logger.js';
import { createDataset } from '../services/datasetService.js';
import { launchRun, compareRuns } from '../services/runService.js';
import { createId } from '../utils/ids.js';
import { toWorkspaceBootstrapDTO } from '../serializers/index.js';

import type { MongoMemoryServer } from 'mongodb-memory-server';

const SMOKE_EMAIL = `smoke-${Date.now()}@optitrader.dev`;

async function runSmoke(): Promise<void> {
  logger.info('🚀 Starting live API smoke test...');
  let mongod: MongoMemoryServer | null = null;
  const isDefaultLocal = !process.env.MONGO_URI || process.env.MONGO_URI.includes('localhost:27017') || process.env.MONGO_URI.includes('127.0.0.1:27017');
  if (isDefaultLocal) {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      process.env.MONGO_URI = mongod.getUri();
      logger.info({ uri: process.env.MONGO_URI }, 'Started in-memory MongoDB for smoke test');
    } catch (e) {
      logger.warn({ err: e }, 'Could not launch in-memory Mongo, trying default MONGO_URI');
    }
  }
  await connectDB();

  let smokeUser: UserDocument | null = null;

  try {
    // 1. Create a transient user & workspace
    smokeUser = await User.create({
      email: SMOKE_EMAIL,
      name: 'Smoke Tester',
      passwordHash: 'dummyhash123456789012345678901234567890',
      workspaceName: 'Smoke Workspace',
    });
    const userId = smokeUser.id;
    const workspace = await Workspace.create({
      _id: createId('ws'),
      user: userId,
      name: 'Smoke Workspace',
      owner: smokeUser.name,
    });
    assert.ok(userId);
    logger.info({ userId }, '✓ User & Workspace initialized');

    // 2. Upload/create a valid dataset
    const sampleCsv = `timestamp,open,high,low,close,volume
${Array.from({ length: 60 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().replace('T', ' ').slice(0, 19);
  const price = 100 + Math.sin(i / 5) * 10;
  return `${d},${price.toFixed(2)},${(price + 2).toFixed(2)},${(price - 2).toFixed(2)},${(price + 1).toFixed(2)},1000`;
}).join('\n')}
`;
    const dataset = await createDataset(userId, {
      name: 'Smoke Test Asset',
      symbol: 'SMK-USD',
      timeframe: '1d',
      csvText: sampleCsv,
    });
    const datasetId = dataset._id;
    assert.ok(datasetId);
    logger.info({ datasetId }, '✓ Dataset ingested');

    // 3. Create a strategy profile
    const profile = await Profile.create({
      _id: createId('profile'),
      owner: userId,
      name: 'Smoke Strategy Profile',
      strategy_type: 'sma_crossover',
      objective: 'sharpe',
      max_drawdown_limit: 0.25,
      params: {
        fast_ma: { min: 2, max: 2, step: 1 },
        slow_ma: { min: 3, max: 4, step: 1 },
      },
    });
    const profileId = profile._id;
    assert.ok(profileId);
    logger.info({ profileId }, '✓ Strategy profile created');

    // 4. Launch backtest run
    const run = await launchRun(userId, {
      strategy_type: 'sma_crossover',
      dataset_id: datasetId,
      objective: 'sharpe',
      max_drawdown_limit: 0.25,
      fast_ma: { min: 2, max: 2, step: 1 },
      slow_ma: { min: 3, max: 4, step: 1 },
    });
    assert.equal(run.status, 'completed');
    assert.ok(run.run_id);
    logger.info({ runId: run.run_id, status: run.status }, '✓ Run executed');

    // 5. Compare runs
    const compared = await compareRuns(userId, [run.run_id]);
    assert.equal(compared.length, 1);
    assert.equal(compared[0]?.run_id, run.run_id);
    logger.info('✓ Run comparison verified');

    // 6. Test Workspace Bootstrap DTO
    const bootstrap = toWorkspaceBootstrapDTO({
      workspace,
      datasets: [dataset],
      profiles: [profile],
      runs: [run],
      errorLogs: [],
    });
    assert.equal(bootstrap.runs.length, 1);
    assert.equal(bootstrap.datasets.length, 1);
    logger.info('✓ Workspace Bootstrap DTO valid');

    logger.info('🎉 Live API smoke test completed successfully!');
  } finally {
    // Teardown
    if (smokeUser) {
      const cleanUserId = smokeUser.id;
      await Promise.all([
        User.deleteOne({ _id: cleanUserId }),
        Workspace.deleteMany({ user: cleanUserId }),
        Dataset.deleteMany({ owner: cleanUserId }),
        Profile.deleteMany({ owner: cleanUserId }),
        Run.deleteMany({ owner: cleanUserId }),
        ErrorLog.deleteMany({ owner: cleanUserId }),
      ]);
      logger.info('🧹 Smoke artifacts torn down cleanly');
    }
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }
}

void runSmoke().catch((err: unknown) => {
  logger.error({ err }, 'Smoke test failed');
  process.exit(1);
});
