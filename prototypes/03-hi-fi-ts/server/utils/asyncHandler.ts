import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRoute = (request: Request, response: Response, next: NextFunction) => unknown;

export function asyncHandler(handler: AsyncRoute): RequestHandler {
  return function wrappedHandler(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
