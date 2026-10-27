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

export class ConfigError extends Error {
  details: string[];

  constructor(details: string[]) {
    super(`Invalid environment configuration:\n- ${details.join('\n- ')}`);
    this.name = 'ConfigError';
    this.details = details;
  }
}

type Env = Record<string, string | undefined>;

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

  const jwtSecret = String(env.JWT_SECRET ?? '').trim();
  if (nodeEnvValue === 'production' && !jwtSecret) {
    errors.push('JWT_SECRET is required when NODE_ENV=production.');
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
    jwtSecret: jwtSecret || null,
    jwtExpiresIn: String(env.JWT_EXPIRES_IN ?? '1d').trim() || '1d',
  };
}

export function loadConfig(env: Env = process.env): AppConfig {
  return validateConfig(env);
}
