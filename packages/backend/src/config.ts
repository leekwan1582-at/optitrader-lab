import type { AppConfig } from './types/domain.js';

const MONGO_PREFIXES = ['mongodb://', 'mongodb+srv://'];
const PLACEHOLDER_KEYS = new Set([
  '',
  'your_gemini_api_key_here',
  'replace_me',
  'changeme',
]);
const ALLOWED_ENVIRONMENTS = ['development', 'test', 'production'] as const;
const DEFAULT_PORT = 5000;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_ACCESS_TTL = '15m';
const DEFAULT_REFRESH_TTL = '7d';
const DEV_ACCESS_SECRET = 'optitrader-dev-access-secret-change-before-production-32';
const DEV_REFRESH_SECRET = 'optitrader-dev-refresh-secret-change-before-production-32';
const DURATION_PATTERN = /^\d+[smhd]$/;

export class ConfigError extends Error {
  details: string[];

  constructor(details: string[]) {
    super(`Invalid environment configuration:\n- ${details.join('\n- ')}`);
    this.name = 'ConfigError';
    this.details = details;
  }
}

type Env = Record<string, string | undefined>;

function validateSecret(
  name: string,
  value: string,
  fallback: string,
  nodeEnv: string,
  errors: string[]
): string {
  if (!value) {
    if (nodeEnv === 'production') {
      errors.push(`${name} is required in production (32+ bytes).`);
      return '';
    }
    return fallback;
  }
  if (Buffer.byteLength(value, 'utf8') < 32) {
    errors.push(`${name} must be at least 32 bytes.`);
  }
  return value;
}

function validateDuration(name: string, value: string, errors: string[]): string {
  if (!DURATION_PATTERN.test(value)) {
    errors.push(`${name} must use a duration such as 15m or 7d.`);
  }
  return value;
}

export function validateConfig(env: Env = {}): AppConfig {
  const errors: string[] = [];

  const mongoUri = String(env.MONGO_URI ?? '').trim();
  if (!mongoUri) {
    errors.push('MONGO_URI is required (local MongoDB or Atlas connection string).');
  } else if (!MONGO_PREFIXES.some((prefix) => mongoUri.startsWith(prefix))) {
    errors.push('MONGO_URI must start with mongodb:// or mongodb+srv://.');
  }

  const geminiApiKey = String(env.GEMINI_API_KEY ?? '').trim();
  if (!geminiApiKey) {
    errors.push('GEMINI_API_KEY is required (get one from https://aistudio.google.com/app/apikey).');
  } else if (PLACEHOLDER_KEYS.has(geminiApiKey.toLowerCase())) {
    errors.push('GEMINI_API_KEY is still a placeholder; replace it with a real key.');
  }

  const geminiModel = String(env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL).trim()
    || DEFAULT_GEMINI_MODEL;

  const rawClientUrl = String(env.CLIENT_URL ?? '').trim();
  let clientUrl = rawClientUrl;
  if (!rawClientUrl) {
    errors.push('CLIENT_URL is required (the exact frontend origin used by CORS).');
  } else {
    try {
      const parsed = new URL(rawClientUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('CLIENT_URL must use http:// or https://.');
      }
      if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
        errors.push('CLIENT_URL must be an origin only, e.g. http://localhost:5173 (no path, query or hash).');
      }
      clientUrl = parsed.origin;
    } catch {
      errors.push('CLIENT_URL must be a valid URL, e.g. http://localhost:5173.');
    }
  }

  const rawPort = env.PORT === undefined || env.PORT === ''
    ? DEFAULT_PORT
    : Number(env.PORT);
  if (!Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) {
    errors.push('PORT must be an integer between 1 and 65535.');
  }

  const nodeEnvValue = String(env.NODE_ENV ?? 'development').trim() || 'development';
  if (!ALLOWED_ENVIRONMENTS.includes(nodeEnvValue as typeof ALLOWED_ENVIRONMENTS[number])) {
    errors.push(`NODE_ENV must be one of: ${ALLOWED_ENVIRONMENTS.join(', ')}.`);
  }

  const accessSecret = validateSecret(
    'JWT_ACCESS_SECRET',
    String(env.JWT_ACCESS_SECRET ?? '').trim(),
    DEV_ACCESS_SECRET,
    nodeEnvValue,
    errors
  );
  const refreshSecret = validateSecret(
    'JWT_REFRESH_SECRET',
    String(env.JWT_REFRESH_SECRET ?? '').trim(),
    DEV_REFRESH_SECRET,
    nodeEnvValue,
    errors
  );
  const accessTokenTtl = validateDuration(
    'ACCESS_TOKEN_TTL',
    String(env.ACCESS_TOKEN_TTL ?? DEFAULT_ACCESS_TTL).trim() || DEFAULT_ACCESS_TTL,
    errors
  );
  const refreshTokenTtl = validateDuration(
    'REFRESH_TOKEN_TTL',
    String(env.REFRESH_TOKEN_TTL ?? DEFAULT_REFRESH_TTL).trim() || DEFAULT_REFRESH_TTL,
    errors
  );

  const cookieDomain = String(env.COOKIE_DOMAIN ?? '').trim();
  if (cookieDomain && !/^\.?[a-zA-Z0-9.-]+$/.test(cookieDomain)) {
    errors.push('COOKIE_DOMAIN must be a domain such as .optitrader.dev.');
  }

  if (errors.length > 0) {
    throw new ConfigError(errors);
  }

  return {
    port: rawPort,
    nodeEnv: nodeEnvValue as AppConfig['nodeEnv'],
    mongoUri,
    geminiApiKey,
    geminiModel,
    clientUrl,
    jwtAccessSecret: accessSecret,
    jwtRefreshSecret: refreshSecret,
    accessTokenTtl,
    refreshTokenTtl,
    cookieDomain: cookieDomain || null,
  };
}

export function loadConfig(env: Env = process.env): AppConfig {
  return validateConfig(env);
}
