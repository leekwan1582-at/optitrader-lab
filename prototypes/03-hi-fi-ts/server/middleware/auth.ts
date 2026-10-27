import jwt, { type SignOptions } from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import type { AppConfig, AuthUser, JwtPayload, UserPublic } from '../types/domain.js';
import { UnauthorizedError } from '../utils/errors.js';

const DEV_SECRET = 'optitrader-development-secret-change-before-production';
let warnedAboutSecret = false;

export function getJwtSecret(config: AppConfig): string {
  if (config.jwtSecret) return config.jwtSecret;

  if (config.nodeEnv === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }

  if (!warnedAboutSecret) {
    console.warn('⚠️  JWT_SECRET is not set; using an insecure development-only secret.');
    warnedAboutSecret = true;
  }
  return DEV_SECRET;
}

export function signToken(user: UserPublic, config: AppConfig): string {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    workspaceName: user.workspaceName,
  };

  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, getJwtSecret(config), options);
}

export const requireAuth: RequestHandler = (request, _response, next) => {
  const header = request.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(new UnauthorizedError('Provide a Bearer token.'));
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(request.app.locals.config)) as JwtPayload;
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      workspaceName: payload.workspaceName,
    };
    request.user = user;
    next();
  } catch {
    next(new UnauthorizedError('The session token is invalid or has expired.'));
  }
};
