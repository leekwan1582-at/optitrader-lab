import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { Express } from 'express';
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

async function register(agent: request.Agent, email: string): Promise<request.Response> {
  return agent
    .post('/api/auth/register')
    .set('Origin', clientUrl)
    .send({
      name: 'Auth Test',
      email,
      password: 'password123',
      workspaceName: 'Auth_Test',
    });
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  testConfig.mongoUri = mongo.getUri();
  await mongoose.connect(testConfig.mongoUri);
  app = createApp(testConfig);
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

test('register sets HttpOnly cookies and returns no token', async () => {
  const agent = request.agent(app);
  const response = await register(agent, 'register@example.com');

  const body = response.body as { token?: unknown; user: { email: string } };
  assert.equal(response.status, 201);
  assert.equal(body.token, undefined);
  assert.equal(body.user.email, 'register@example.com');

  const cookies = setCookies(response);
  const access = cookies.find((item) => item.startsWith('ot_access='));
  const refresh = cookies.find((item) => item.startsWith('ot_refresh='));

  assert.ok(access);
  assert.ok(refresh);
  assert.match(access, /HttpOnly/i);
  assert.match(access, /SameSite=Strict/i);
  assert.match(refresh, /Path=\/api\/auth/i);
});

test('me requires the access cookie and returns the user', async () => {
  const agent = request.agent(app);
  const response = await register(agent, 'me@example.com');
  const cookies = setCookies(response);

  const unauthorised = await request(app).get('/api/auth/me');
  assert.equal(unauthorised.status, 401);

  const authorised = await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookiePair(cookies, 'ot_access'));

  assert.equal(authorised.status, 200);
  const authorisedBody = authorised.body as { user: { email: string } };
  assert.equal(authorisedBody.user.email, 'me@example.com');
});

test('refresh rotates the refresh cookie', async () => {
  const agent = request.agent(app);
  const login = await register(agent, 'refresh@example.com');
  const cookies = setCookies(login);

  const refreshed = await request(app)
    .post('/api/auth/refresh')
    .set('Origin', clientUrl)
    .set('Cookie', cookiePair(cookies, 'ot_refresh'));

  assert.equal(refreshed.status, 200);
  const newCookies = setCookies(refreshed);
  assert.ok(cookiePair(newCookies, 'ot_refresh'));
  assert.notEqual(cookiePair(newCookies, 'ot_refresh'), cookiePair(cookies, 'ot_refresh'));
});

test('refresh-token reuse revokes the session family', async () => {
  const agent = request.agent(app);
  const login = await register(agent, 'reuse@example.com');
  const cookies = setCookies(login);
  const oldRefresh = cookiePair(cookies, 'ot_refresh');

  const refreshed = await request(app)
    .post('/api/auth/refresh')
    .set('Origin', clientUrl)
    .set('Cookie', oldRefresh);
  assert.equal(refreshed.status, 200);

  const reuse = await request(app)
    .post('/api/auth/refresh')
    .set('Origin', clientUrl)
    .set('Cookie', oldRefresh);
  assert.equal(reuse.status, 401);
  assert.equal((reuse.body as { code?: string }).code, 'REFRESH_REUSED');

  const newRefresh = cookiePair(setCookies(refreshed), 'ot_refresh');
  const afterReuse = await request(app)
    .post('/api/auth/refresh')
    .set('Origin', clientUrl)
    .set('Cookie', newRefresh);
  assert.equal(afterReuse.status, 401);
});

test('logout revokes the refresh session and clears cookies', async () => {
  const agent = request.agent(app);
  const login = await register(agent, 'logout@example.com');
  const cookies = setCookies(login);
  const refresh = cookiePair(cookies, 'ot_refresh');

  const logout = await request(app)
    .post('/api/auth/logout')
    .set('Origin', clientUrl)
    .set('Cookie', authHeader(cookies));

  assert.equal(logout.status, 204);
  const cleared = setCookies(logout).join('\n');
  assert.match(cleared, /ot_access=;/);
  assert.match(cleared, /ot_refresh=;/);

  const refreshAfterLogout = await request(app)
    .post('/api/auth/refresh')
    .set('Origin', clientUrl)
    .set('Cookie', refresh);
  assert.equal(refreshAfterLogout.status, 401);
});

test('mutations reject a mismatched Origin', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .set('Origin', 'http://evil.example')
    .send({ email: 'nobody@example.com', password: 'password123' });

  assert.equal(response.status, 403);
  assert.equal((response.body as { code?: string }).code, 'FORBIDDEN_ORIGIN');
});

test('production cookies are marked Secure', async () => {
  const productionApp = createApp({ ...testConfig, nodeEnv: 'production' });
  const response = await request(productionApp)
    .post('/api/auth/register')
    .set('Origin', clientUrl)
    .send({
      name: 'Secure Test',
      email: 'secure@example.com',
      password: 'password123',
      workspaceName: 'Secure_Test',
    });

  assert.equal(response.status, 201);
  const cookies = setCookies(response);
  assert.match(cookies.find((item) => item.startsWith('ot_access=')) ?? '', /Secure/i);
  assert.match(cookies.find((item) => item.startsWith('ot_refresh=')) ?? '', /Secure/i);
});
