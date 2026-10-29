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
import type { Dataset, DatasetPreviewResponse } from '@optitrader/shared';

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
      name: 'Dataset Test User',
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

test('uploads a valid CSV file and retrieves its preview', async () => {
  const agent = request(app);
  const auth = await register(agent, 'dataset1@example.com');

  const validCsv = [
    'timestamp,open,high,low,close,volume',
    '2023-01-01T00:00:00Z,100,105,95,102,500',
    '2023-01-01T01:00:00Z,102,106,101,104,600',
    '2023-01-01T02:00:00Z,104,108,103,107,750',
  ].join('\n');

  const uploadRes = await agent
    .post('/api/datasets')
    .set('Cookie', auth)
    .set('Origin', clientUrl)
    .field('name', 'BTC Hourly')
    .field('symbol', 'BTCUSD')
    .field('timeframe', '1H')
    .attach('file', Buffer.from(validCsv), 'BTC_1H.csv');

  assert.equal(uploadRes.status, 201);
  const uploadedDataset = uploadRes.body as Dataset;
  assert.equal(uploadedDataset.name, 'BTC Hourly');
  assert.equal(uploadedDataset.symbol, 'BTCUSD');
  assert.equal(uploadedDataset.rows, 3);
  const datasetId = uploadedDataset.dataset_id;

  // Retrieve preview
  const previewRes = await agent
    .get(`/api/datasets/${datasetId}/preview`)
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(previewRes.status, 200);
  const preview = previewRes.body as DatasetPreviewResponse;
  assert.equal(preview.total_rows, 3);
  assert.equal(preview.preview_rows.length, 3);
  assert.equal(preview.preview_rows[0]?.open, 100);
});

test('rejects CSV with missing required OHLCV headers', async () => {
  const agent = request(app);
  const auth = await register(agent, 'dataset2@example.com');

  const corruptedHeadersCsv = [
    'time,open,high,low,close',
    '2023-01-01T00:00:00Z,100,105,95,102',
  ].join('\n');

  const uploadRes = await agent
    .post('/api/datasets')
    .set('Cookie', auth)
    .set('Origin', clientUrl)
    .field('name', 'Bad Headers')
    .field('symbol', 'TEST')
    .field('timeframe', '1D')
    .attach('file', Buffer.from(corruptedHeadersCsv), 'bad_headers.csv');

  assert.equal(uploadRes.status, 422);
  const body = uploadRes.body as { code?: string };
  assert.equal(body.code, 'INVALID_CSV_HEADERS');
});

test('rejects CSV with non-chronological timestamps', async () => {
  const agent = request(app);
  const auth = await register(agent, 'dataset3@example.com');

  const disorderedCsv = [
    'timestamp,open,high,low,close,volume',
    '2023-01-01T02:00:00Z,104,108,103,107,750',
    '2023-01-01T01:00:00Z,102,106,101,104,600',
  ].join('\n');

  const uploadRes = await agent
    .post('/api/datasets')
    .set('Cookie', auth)
    .set('Origin', clientUrl)
    .field('name', 'Disordered')
    .field('symbol', 'TEST')
    .field('timeframe', '1H')
    .attach('file', Buffer.from(disorderedCsv), 'disordered.csv');

  assert.equal(uploadRes.status, 422);
  const body = uploadRes.body as { code?: string };
  assert.equal(body.code, 'TIMESTAMPS_NOT_ORDERED');
});

test('enforces referential integrity on dataset deletion when runs reference it', async () => {
  const agent = request(app);
  const auth = await register(agent, 'dataset4@example.com');

  const validCsv = [
    'timestamp,open,high,low,close,volume',
    '2023-01-01T00:00:00Z,100,105,95,102,500',
    '2023-01-01T01:00:00Z,102,106,101,104,600',
  ].join('\n');

  const uploadRes = await agent
    .post('/api/datasets')
    .set('Cookie', auth)
    .set('Origin', clientUrl)
    .field('name', 'Dataset With Run')
    .field('symbol', 'ETHUSD')
    .field('timeframe', '1H')
    .attach('file', Buffer.from(validCsv), 'eth.csv');

  assert.equal(uploadRes.status, 201);
  const uploadedDataset = uploadRes.body as Dataset;
  const datasetId = uploadedDataset.dataset_id;

  const meRes = await agent.get('/api/auth/me').set('Cookie', auth).set('Origin', clientUrl);
  const meBody = meRes.body as { user: { id: string } };
  const owner = meBody.user.id;

  // Create a profile and a run that references this dataset
  const profile = await Profile.create({
    _id: 'prof_test_ref',
    owner,
    name: 'Test Profile',
    strategy_type: 'sma_crossover',
    objective: 'sharpe',
    max_drawdown_limit: 0.2,
    params: {
      fast_ma: { min: 5, max: 20, step: 5 },
      slow_ma: { min: 30, max: 60, step: 10 },
    },
  });

  await Run.create({
    _id: 'run_test_ref',
    owner,
    profile_id: profile._id,
    dataset_id: datasetId,
    status: 'completed',
    created_at: new Date(),
  });

  // Attempt delete -> should fail with 409 DATASET_IN_USE
  const deleteRes = await agent
    .delete(`/api/datasets/${datasetId}`)
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(deleteRes.status, 409);
  const deleteBody = deleteRes.body as { code?: string };
  assert.equal(deleteBody.code, 'DATASET_IN_USE');

  // Remove run, then delete -> should succeed with 204
  await Run.deleteOne({ _id: 'run_test_ref' });

  const deleteSuccessRes = await agent
    .delete(`/api/datasets/${datasetId}`)
    .set('Cookie', auth)
    .set('Origin', clientUrl);

  assert.equal(deleteSuccessRes.status, 204);
});
