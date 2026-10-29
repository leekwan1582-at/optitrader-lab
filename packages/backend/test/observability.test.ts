import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/types/domain.js';

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

test('observability and docs endpoints', async (t) => {
  const app = createApp(testConfig);

  await t.test('attaches X-Request-Id header to responses', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.ok(res.headers['x-request-id']);
  });

  await t.test('preserves incoming X-Request-Id header', async () => {
    const customId = 'req-trace-12345';
    const res = await request(app).get('/api/health').set('X-Request-Id', customId);
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-request-id'], customId);
  });

  await t.test('GET /api/docs returns valid OpenAPI 3.1 schema', async () => {
    const res = await request(app).get('/api/docs');
    assert.equal(res.status, 200);
    const body = res.body as { openapi?: string; paths?: Record<string, unknown> };
    assert.equal(body.openapi, '3.1.0');
    assert.ok(body.paths?.['/runs']);
    assert.ok(body.paths?.['/health']);
    assert.ok(body.paths?.['/datasets']);
  });
});

