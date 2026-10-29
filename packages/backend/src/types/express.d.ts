import type { User } from '@optitrader/shared';
import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      validatedQuery?: Record<string, unknown>;
      id?: string;
      log?: Logger;
    }
  }
}

export {};
