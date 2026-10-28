import test from 'node:test';
import assert from 'node:assert/strict';

import { ConfigError, validateConfig } from '../src/config.js';

const accessSecret = 'a'.repeat(48);
const refreshSecret = 'b'.repeat(48);

const validEnv: Record<string, string> = {
  NODE_ENV: 'development',
  PORT: '5000',
  MONGO_URI: 'mongodb://localhost:27017/optitrader_lab',
  GEMINI_API_KEY: 'test_gemini_key_123',
  CLIENT_URL: 'http://localhost:5173',
  JWT_ACCESS_SECRET: accessSecret,
  JWT_REFRESH_SECRET: refreshSecret,
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL: '7d',
};

function assertConfigError(env: Record<string, string>, expectedMessage: RegExp): void {
  assert.throws(
    () => validateConfig(env),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, expectedMessage);
      return true;
    }
  );
}

test('accepts a valid configuration and normalizes values', () => {
  const config = validateConfig({
    ...validEnv,
    PORT: '5001',
    CLIENT_URL: 'http://localhost:5173/',
    COOKIE_DOMAIN: '.optitrader.dev',
  });

  assert.equal(config.port, 5001);
  assert.equal(config.clientUrl, 'http://localhost:5173');
  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.mongoUri, validEnv.MONGO_URI);
  assert.equal(config.geminiApiKey, validEnv.GEMINI_API_KEY);
  assert.equal(config.geminiModel, 'gemini-2.5-flash');
  assert.equal(config.jwtAccessSecret, accessSecret);
  assert.equal(config.jwtRefreshSecret, refreshSecret);
  assert.equal(config.accessTokenTtl, '15m');
  assert.equal(config.refreshTokenTtl, '7d');
  assert.equal(config.cookieDomain, '.optitrader.dev');
});

test('uses development secrets when omitted in development', () => {
  const env: Record<string, string> = { ...validEnv };
  delete env.JWT_ACCESS_SECRET;
  delete env.JWT_REFRESH_SECRET;

  const config = validateConfig(env);
  assert.ok(config.jwtAccessSecret.length >= 32);
  assert.ok(config.jwtRefreshSecret.length >= 32);
});

test('requires both secrets in production', () => {
  assertConfigError(
    { ...validEnv, NODE_ENV: 'production', JWT_ACCESS_SECRET: '' },
    /JWT_ACCESS_SECRET is required in production/
  );
  assertConfigError(
    { ...validEnv, NODE_ENV: 'production', JWT_REFRESH_SECRET: '' },
    /JWT_REFRESH_SECRET is required in production/
  );
});

test('rejects short secrets', () => {
  assertConfigError(
    { ...validEnv, JWT_ACCESS_SECRET: 'too-short' },
    /JWT_ACCESS_SECRET must be at least 32 bytes/
  );
  assertConfigError(
    { ...validEnv, JWT_REFRESH_SECRET: 'too-short' },
    /JWT_REFRESH_SECRET must be at least 32 bytes/
  );
});

test('rejects invalid token TTLs', () => {
  assertConfigError(
    { ...validEnv, ACCESS_TOKEN_TTL: 'fifteen-minutes' },
    /ACCESS_TOKEN_TTL must use a duration/
  );
  assertConfigError(
    { ...validEnv, REFRESH_TOKEN_TTL: 'one-week' },
    /REFRESH_TOKEN_TTL must use a duration/
  );
});

test('rejects an invalid COOKIE_DOMAIN', () => {
  assertConfigError(
    { ...validEnv, COOKIE_DOMAIN: 'https://optitrader.dev' },
    /COOKIE_DOMAIN must be a domain/
  );
});

test('defaults PORT to 5000 when omitted', () => {
  const env: Record<string, string> = { ...validEnv };
  delete env.PORT;

  assert.equal(validateConfig(env).port, 5000);
});

test('rejects a missing MONGO_URI', () => {
  assertConfigError({ ...validEnv, MONGO_URI: '' }, /MONGO_URI is required/);
});

test('rejects a MONGO_URI with the wrong scheme', () => {
  assertConfigError(
    { ...validEnv, MONGO_URI: 'postgres://localhost/optitrader_lab' },
    /MONGO_URI must start with mongodb/
  );
});

test('rejects a missing GEMINI_API_KEY', () => {
  assertConfigError(
    { ...validEnv, GEMINI_API_KEY: '' },
    /GEMINI_API_KEY is required/
  );
});

test('rejects a placeholder GEMINI_API_KEY', () => {
  assertConfigError(
    { ...validEnv, GEMINI_API_KEY: 'your_gemini_api_key_here' },
    /GEMINI_API_KEY is still a placeholder/
  );
});

test('rejects a missing CLIENT_URL', () => {
  assertConfigError({ ...validEnv, CLIENT_URL: '' }, /CLIENT_URL is required/);
});

test('rejects a CLIENT_URL that is not an origin', () => {
  assertConfigError(
    { ...validEnv, CLIENT_URL: 'http://localhost:5173/app' },
    /CLIENT_URL must be an origin only/
  );
});

test('rejects an invalid CLIENT_URL', () => {
  assertConfigError(
    { ...validEnv, CLIENT_URL: 'not-a-url' },
    /CLIENT_URL must be a valid URL/
  );
});

test('rejects an invalid PORT', () => {
  assertConfigError({ ...validEnv, PORT: 'not-a-port' }, /PORT must be an integer/);
  assertConfigError({ ...validEnv, PORT: '70000' }, /PORT must be an integer/);
});

test('rejects an unknown NODE_ENV', () => {
  assertConfigError(
    { ...validEnv, NODE_ENV: 'staging' },
    /NODE_ENV must be one of/
  );
});

test('reports all configuration errors together', () => {
  assert.throws(
    () => validateConfig({ NODE_ENV: 'production' }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.ok(error.details.length >= 3);
      assert.match(error.message, /MONGO_URI/);
      assert.match(error.message, /GEMINI_API_KEY/);
      assert.match(error.message, /CLIENT_URL/);
      return true;
    }
  );
});
