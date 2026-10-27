import { ValidationError } from '../utils/errors.js';

function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validateBody(schema) {
  return function validate(request, response, next) {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(new ValidationError(formatIssues(result.error)));
      return;
    }
    request.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return function validate(request, response, next) {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      next(new ValidationError(formatIssues(result.error)));
      return;
    }
    request.validatedQuery = result.data;
    next();
  };
}
