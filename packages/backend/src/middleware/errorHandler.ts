import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../logger.js';

interface ErrorWithDetails extends Error {
  statusCode?: number;
  code?: string | number;
  details?: unknown;
}

export const notFound: RequestHandler = (request, _response, next) => {
  next(new AppError(`Route not found: ${request.method} ${request.originalUrl}`, 404, 'NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error: ErrorWithDetails, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  let status = error.statusCode || 500;
  let code: string | number = error.code || 'INTERNAL_ERROR';
  let message = error.message || 'Something went wrong.';
  let details = error.details || null;

  if (error instanceof ZodError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (error.name === 'ValidationError') {
    status = 422;
    code = 'DATABASE_VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    status = 400;
    code = 'INVALID_IDENTIFIER';
  } else if (error.code === 11000) {
    status = 409;
    code = 'DUPLICATE_KEY';
    message = 'A record with that value already exists.';
  } else if (error.name === 'MongooseServerSelectionError' || error.name === 'MongoNetworkError') {
    status = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'The database is unavailable. Check that MongoDB is running.';
  } else if (error.name === 'MulterError') {
    status = 400;
    if (error.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      code = 'FILE_TOO_LARGE';
      message = 'Uploaded file exceeds the maximum allowed size.';
    } else {
      code = 'INVALID_FILE_UPLOAD';
    }
  }

  if (status >= 500) {
    logger.error({ error }, '[server error]');
  }

  const payload: Record<string, unknown> = { message, code };
  if (details) payload.details = details;
  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    payload.stack = error.stack;
  }

  response.status(status).json(payload);
};
