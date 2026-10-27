import type { AuthUser } from './domain.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
