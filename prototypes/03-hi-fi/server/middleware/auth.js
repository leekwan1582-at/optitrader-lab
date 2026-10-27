import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors.js';

const DEV_SECRET = 'optitrader-development-secret-change-before-production';
let warnedAboutSecret = false;

export function getJwtSecret(config) {
  if (config?.jwtSecret) return config.jwtSecret;

  if (config?.nodeEnv === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }

  if (!warnedAboutSecret) {
    console.warn('⚠️  JWT_SECRET is not set; using an insecure development-only secret.');
    warnedAboutSecret = true;
  }
  return DEV_SECRET;
}

export function signToken(user, config) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    workspaceName: user.workspaceName,
  };

  return jwt.sign(payload, getJwtSecret(config), {
    expiresIn: config?.jwtExpiresIn || '1d',
  });
}

export function requireAuth(request, response, next) {
  const header = request.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(new UnauthorizedError('Provide a Bearer token.'));
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(request.app.locals.config));
    request.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      workspaceName: payload.workspaceName,
    };
    next();
  } catch {
    next(new UnauthorizedError('The session token is invalid or has expired.'));
  }
}
