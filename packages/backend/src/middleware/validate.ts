import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../utils/errors.js';

function formatIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return function validate(request, _response, next) {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(new ValidationError(formatIssues(result.error)));
      return;
    }
    request.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return function validate(request, _response, next) {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      next(new ValidationError(formatIssues(result.error)));
      return;
    }
    request.validatedQuery = result.data as Record<string, unknown>;
    next();
  };
}
