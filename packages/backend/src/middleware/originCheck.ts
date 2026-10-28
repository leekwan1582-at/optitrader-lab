import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors.js';
import { getConfig } from '../utils/authContext.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const originCheck: RequestHandler = (request, _response, next) => {
  if (!MUTATING_METHODS.has(request.method)) {
    next();
    return;
  }

  const origin = request.get('origin');
  const referer = request.get('referer');
  let candidate = origin;

  if (!candidate && referer) {
    try {
      candidate = new URL(referer).origin;
    } catch {
      candidate = undefined;
    }
  }

  if (!candidate) {
    next(new AppError('Missing Origin header for a state-changing request.', 403, 'FORBIDDEN_ORIGIN'));
    return;
  }

  if (candidate !== getConfig(request).clientUrl) {
    next(new AppError('Request origin is not allowed.', 403, 'FORBIDDEN_ORIGIN'));
    return;
  }

  next();
};
