import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { jwtPayloadSchema } from '@optitrader/shared';
import type { AuthUser } from '../types/domain.js';
import { UnauthorizedError } from '../utils/errors.js';
import { ACCESS_COOKIE } from '../services/tokenService.js';
import { getConfig } from '../utils/authContext.js';

export const requireAuth: RequestHandler = (request, _response, next) => {
  const token = (request.cookies as Record<string, string | undefined>)[ACCESS_COOKIE];

  if (!token) {
    next(new UnauthorizedError('Authentication cookie is missing.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, getConfig(request).jwtAccessSecret, {
      algorithms: ['HS256'],
    });
    const payload = jwtPayloadSchema.parse(decoded);
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      workspaceName: payload.workspaceName,
    };
    request.user = user;
    next();
  } catch {
    next(new UnauthorizedError('The session is invalid or has expired.'));
  }
};
