import { createHash } from 'node:crypto';
import type { RunConfig, StrategyType } from '../types/domain.js';

const ENGINE_VERSION = 'vectorbt-poc-1.0';

interface BuildRunHashInput {
  strategyType: StrategyType;
  config: RunConfig;
  datasetChecksum: string;
}

export function buildRunHash({ strategyType, config, datasetChecksum }: BuildRunHashInput): string {
  const sanitized = {
    strategy_type: strategyType,
    fast_ma: config.fast_ma,
    slow_ma: config.slow_ma,
    objective: config.objective,
    max_drawdown_limit: config.max_drawdown_limit,
    transaction_costs: config.transaction_costs || 0,
    walk_forward: Boolean(config.walk_forward),
  };

  return createHash('sha256')
    .update(`${strategyType}:${JSON.stringify(sanitized)}:${datasetChecksum}:${ENGINE_VERSION}`)
    .digest('hex');
}

export function checksumBuffer(buffer: Buffer | string): string {
  return createHash('sha256').update(buffer).digest('hex');
}
