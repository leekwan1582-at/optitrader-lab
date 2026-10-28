import type { User } from '@optitrader/shared';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
