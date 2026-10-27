'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';

import { ConfigError, validateConfig } from '../config.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '5000',
  MONGO_URI: 'mongodb://localhost:27017/optitrader_lab',
  GEMINI_API_KEY: 'test_gemini_key_123',
  CLIENT_URL: 'http://localhost:5173',
};

function assertConfigError(env, expectedMessage) {
  assert.throws(
    () => validateConfig(env),
    (error) => {
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
  });

  assert.equal(config.port, 5001);
  assert.equal(config.clientUrl, 'http://localhost:5173');
  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.mongoUri, validEnv.MONGO_URI);
  assert.equal(config.geminiApiKey, validEnv.GEMINI_API_KEY);
  assert.equal(config.geminiModel, 'gemini-2.5-flash');
  assert.equal(config.jwtSecret, null);
  assert.equal(config.jwtExpiresIn, '1d');
});

test('accepts an explicit GEMINI_MODEL', () => {
  const config = validateConfig({ ...validEnv, GEMINI_MODEL: 'gemini-1.5-pro' });

  assert.equal(config.geminiModel, 'gemini-1.5-pro');
});

test('defaults PORT to 5000 when omitted', () => {
  const env = { ...validEnv };
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

test('requires JWT_SECRET only in production', () => {
  assert.equal(validateConfig(validEnv).jwtSecret, null);

  assertConfigError(
    { ...validEnv, NODE_ENV: 'production' },
    /JWT_SECRET is required when NODE_ENV=production/
  );

  assert.equal(
    validateConfig({
      ...validEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'a-strong-production-secret',
    }).jwtSecret,
    'a-strong-production-secret'
  );
});

test('reports all configuration errors together', () => {
  assert.throws(
    () => validateConfig({}),
    (error) => {
      assert.ok(error instanceof ConfigError);
      assert.ok(error.details.length >= 3);
      assert.match(error.message, /MONGO_URI/);
      assert.match(error.message, /GEMINI_API_KEY/);
      assert.match(error.message, /CLIENT_URL/);
      return true;
    }
  );
});
