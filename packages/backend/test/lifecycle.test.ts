import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/types/domain.js';
import Run from '../src/models/Run.js';
import Profile from '../src/models/Profile.js';
import Dataset from '../src/models/Dataset.js';
import { defaultStorage } from '../src/services/storageAdapter.js';
import type { PaginatedRunsResponse, Run as RunDTO, RunLogsResponse } from '@optitrader/shared';

const clientUrl = 'http://localhost:5173';

const testConfig: AppConfig = {
  port: 0,
  nodeEnv: 'test',
  mongoUri: '',
  geminiApiKey: 'test-gemini-key',
  geminiModel: 'test-model',
  clientUrl,
  jwtAccessSecret: 'a'.repeat(48),
  jwtRefreshSecret: 'b'.repeat(48),
  accessTokenTtl: '15m',
  refreshTokenTtl: '7d',
  cookieDomain: null,
  uploadDir: 'uploads',
  maxUploadMb: 50,
};

let mongo: MongoMemoryServer;
let app: Express;

function setCookies(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

function cookiePair(cookies: string[], name: string): string {
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Cookie ${name} not found`);
  return cookie.split(';')[0] ?? '';
}

function authHeader(cookies: string[]): string {
  return `${cookiePair(cookies, 'ot_access')}; ${cookiePair(cookies, 'ot_refresh')}`;
}

async function register(agent: request.Agent, email: string): Promise<string> {
  const res = await agent
    .post('/api/auth/register')
    .set('Origin', clientUrl)
    .send({
      name: 'Run Lifecycle User',
      email,
      password: 'password123',
    });
  assert.equal(res.status, 201);
  return authHeader(setCookies(res));
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  testConfig.mongoUri = mongo.getUri();
  app = createApp(testConfig);
  await mongoose.connect(testConfig.mongoUri);
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    const col = collections[key];
    if (col) await col.deleteMany({});
  }
});

test('supports run retry and immutable retried_from relationship', async () => {
  const agent = request(app);
  const auth = await register(agent, 'lifecycle1@example.com');

  const meRes = await agent.get('/api/auth/me').set('Cookie', auth).set('Origin', clientUrl);
  const meBody = meRes.body as { user: { id: string } };
  const owner = meBody.user.id;

  // Setup sample dataset on disk
  const csvContent = [
    'timestamp,open,high,low,close,volume',
    '2023-01-01T00:00:00Z,100,105,95,102,500',
    '2023-01-01T01:00:00Z,102,106,101,104,600',
  ].join('\n');
  const saveRes = await defaultStorage.save(owner, 'ds_lc_1', csvContent);

  await Dataset.create({
    _id: 'ds_lc_1',
    owner,
    name: 'Sample EURUSD',
    symbol: 'EURUSD',
    timeframe: '1H',
    date_range: '2023-01-01 to 2023-01-01',
    rows: 2,
    status: 'validated',
    file_ref: saveRes.fileRef,
  });

  const profile = await Profile.create({
    _id: 'prof_lc_1',
    owner,
    name: 'SMA Crossover Strategy',
    strategy_type: 'sma_crossover',
    objective: 'sharpe',
    max_drawdown_limit: 0.2,
    params: {
      fast_ma: { min: 5, max: 20, step: 5 },
      slow_ma: { min: 30, max: 60, step: 10 },
    },
  });

  const failedRun = await Run.create({
    _id: 'run_failed_1',
    owner,
    profile_id: profile._id,
    dataset_id: 'ds_lc_1',
    status: 'failed',
    created_at: new Date(),
    config: {
      strategy_type: 'sma_crossover',
      dataset_id: 'ds_lc_1',
      objective: 'sharpe',
      max_drawdown_limit: 0.2,
      fast_ma: { min: 5, max: 20, step: 5 },
      slow_ma: { min: 30, max: 60, step: 10 },
      transaction_costs: 0.0002,
    },
    error_code: 'ENGINE_ERROR',
    error_message: 'Simulated engine failure',
  });

  // Call POST /api/runs/:id/retry
  const retryRes = await agent
    .post(`/api/runs/${failedRun._id}/retry`)
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(retryRes.status, 201);
  const retriedRun = retryRes.body as RunDTO;
  assert.equal(retriedRun.retried_from, 'run_failed_1');
  assert.notEqual(retriedRun.run_id, 'run_failed_1');

  // Verify diagnostic logs endpoint
  const logsRes = await agent
    .get(`/api/runs/${retriedRun.run_id}/logs`)
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(logsRes.status, 200);
  const runLogs = logsRes.body as RunLogsResponse;
  assert.equal(runLogs.run_id, retriedRun.run_id);
  assert.ok(Array.isArray(runLogs.logs));
});

test('cancels active run and rejects cancellation on completed runs', async () => {
  const agent = request(app);
  const auth = await register(agent, 'lifecycle2@example.com');

  const meRes = await agent.get('/api/auth/me').set('Cookie', auth).set('Origin', clientUrl);
  const meBody = meRes.body as { user: { id: string } };
  const owner = meBody.user.id;

  const activeRun = await Run.create({
    _id: 'run_active_1',
    owner,
    profile_id: 'prof_test',
    dataset_id: 'ds_test',
    status: 'running',
    created_at: new Date(),
  });

  // Cancel running run
  const cancelRes = await agent
    .post(`/api/runs/${activeRun._id}/cancel`)
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(cancelRes.status, 200);
  const cancelledBody = cancelRes.body as RunDTO;
  assert.equal(cancelledBody.status, 'cancelled');

  // Re-cancelling should fail with 409 RUN_NOT_CANCELLABLE
  const invalidCancel = await agent
    .post(`/api/runs/${activeRun._id}/cancel`)
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(invalidCancel.status, 409);
  const body = invalidCancel.body as { code?: string };
  assert.equal(body.code, 'RUN_NOT_CANCELLABLE');
});

test('paginates and filters runs via GET /api/runs', async () => {
  const agent = request(app);
  const auth = await register(agent, 'lifecycle3@example.com');

  const meRes = await agent.get('/api/auth/me').set('Cookie', auth).set('Origin', clientUrl);
  const meBody = meRes.body as { user: { id: string } };
  const owner = meBody.user.id;

  // Insert 25 mock runs
  const runsToInsert = Array.from({ length: 25 }, (_, i) => ({
    _id: `run_page_${i}`,
    owner,
    profile_id: 'prof_1',
    dataset_id: i % 2 === 0 ? 'ds_even' : 'ds_odd',
    status: i < 20 ? 'completed' : 'failed',
    created_at: new Date(Date.now() - i * 1000),
  }));
  await Run.insertMany(runsToInsert);

  // Request page 1 with limit 10
  const page1Res = await agent
    .get('/api/runs?page=1&limit=10')
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(page1Res.status, 200);
  const page1Data = page1Res.body as PaginatedRunsResponse;
  assert.equal(page1Data.total, 25);
  assert.equal(page1Data.page, 1);
  assert.equal(page1Data.limit, 10);
  assert.equal(page1Data.totalPages, 3);
  assert.equal(page1Data.items.length, 10);

  // Request filtered by status=failed
  const failedRes = await agent
    .get('/api/runs?status=failed')
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(failedRes.status, 200);
  const failedData = failedRes.body as PaginatedRunsResponse;
  assert.equal(failedData.total, 5);
  assert.equal(failedData.items.length, 5);
  assert.ok(failedData.items.every((r) => r.status === 'failed'));
});

