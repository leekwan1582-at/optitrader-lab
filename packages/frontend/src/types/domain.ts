export * from '@optitrader/shared';

import type { ErrorLog, WorkspaceBootstrap } from '@optitrader/shared';

export interface MockData extends WorkspaceBootstrap {
  error_logs: ErrorLog[];
}
