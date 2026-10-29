import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.header('x-request-id');
  const requestId = incomingId && typeof incomingId === 'string' && incomingId.trim().length > 0
    ? incomingId
    : randomUUID();

  res.setHeader('X-Request-Id', requestId);

  // Attach child logger to request object if needed
  req.id = requestId;
  req.log = logger.child({ requestId });

  next();
}

