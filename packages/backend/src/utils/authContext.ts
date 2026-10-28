import type { Request } from 'express';
import type { AppConfig, AuthUser } from '../types/domain.js';
import { UnauthorizedError } from './errors.js';

export function getConfig(request: Request): AppConfig {
  return (request.app.locals as { config: AppConfig }).config;
}

export function currentUser(request: Request): AuthUser {
  if (!request.user) {
    throw new UnauthorizedError();
  }
  return request.user;
}
