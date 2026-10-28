import test from 'node:test';
import assert from 'node:assert/strict';

import { countCombinations, enumerateCombinations } from '../src/utils/combinations.js';
import { parseCsvMetadata } from '../src/utils/csv.js';
import { buildRunHash } from '../src/utils/runHash.js';
import { runConfigSchema } from '@optitrader/shared';
import { parsePromptLocally } from '../src/services/assistantService.js';
import type { RunConfig } from '@optitrader/shared';
import type { DatasetData } from '../src/types/domain.js';

const baseConfig: RunConfig = {
  strategy_type: 'sma_crossover',
  dataset_id: 'ds_test',
  objective: 'sharpe',
  max_drawdown_limit: 0.15,
  fast_ma: { min: 5, max: 30, step: 5 },
  slow_ma: { min: 40, max: 120, step: 10 },
};

test('counts and enumerates valid fast/slow combinations', () => {
  assert.equal(countCombinations(baseConfig), 54);
  assert.equal(enumerateCombinations(baseConfig).length, 54);
  assert.deepEqual(enumerateCombinations(baseConfig)[0], { fast: 5, slow: 40 });
});

test('validates a run configuration and rejects overlapping MA ranges', () => {
  const parsed = runConfigSchema.safeParse(baseConfig);
  assert.equal(parsed.success, true);

  const invalid = runConfigSchema.safeParse({
    ...baseConfig,
    fast_ma: { min: 5, max: 60, step: 5 },
    slow_ma: { min: 40, max: 120, step: 10 },
  });
  assert.equal(invalid.success, false);
});

test('parses CSV metadata and rejects duplicate timestamps', () => {
  const csv = [
    'timestamp,open,high,low,close,volume',
    '2024-01-01T00:00:00Z,1.1,1.2,1.0,1.15,100',
    '2024-01-01T01:00:00Z,1.15,1.25,1.1,1.2,120',
  ].join('\n');

  const metadata = parseCsvMetadata(csv);
  assert.equal(metadata.rows, 2);
  assert.equal(metadata.dateRange, '2024-01-01 to 2024-01-01');

  assert.throws(
    () => parseCsvMetadata(`${csv}\n2024-01-01T01:00:00Z,1.2,1.3,1.1,1.25,90`),
    /Duplicate timestamp/
  );
  assert.throws(
    () => parseCsvMetadata('timestamp,open\nt,1'),
    /missing required columns/
  );
});

test('builds a deterministic run hash that changes with config', () => {
  const first = buildRunHash({
    strategyType: baseConfig.strategy_type,
    config: baseConfig,
    datasetChecksum: 'abc123',
  });
  const second = buildRunHash({
    strategyType: baseConfig.strategy_type,
    config: baseConfig,
    datasetChecksum: 'abc123',
  });
  const different = buildRunHash({
    strategyType: baseConfig.strategy_type,
    config: { ...baseConfig, max_drawdown_limit: 0.2 },
    datasetChecksum: 'abc123',
  });

  assert.equal(first, second);
  assert.notEqual(first, different);
  assert.equal(first.length, 64);
});

test('local assistant parser extracts strategy, dataset, objective and drawdown', () => {
  const datasets: DatasetData[] = [
    {
      _id: 'ds_eurusd',
      owner: 'u1',
      name: 'EURUSD_H1',
      symbol: 'EURUSD',
      timeframe: '1H',
      date_range: '2020-01-01 to 2025-01-01',
      rows: 31240,
      status: 'validated',
    },
    {
      _id: 'ds_nq',
      owner: 'u1',
      name: 'NQ_M15',
      symbol: 'NQ',
      timeframe: '15m',
      date_range: '2023-06-01 to 2024-06-01',
      rows: 24100,
      status: 'validated',
    },
  ];

  const parsed = parsePromptLocally(
    'Tune EMA momentum on NQ to maximize total return with drawdown under 10%',
    datasets
  );

  assert.equal(parsed.strategy_type, 'ema_momentum');
  assert.equal(parsed.dataset_id, 'ds_nq');
  assert.equal(parsed.objective, 'total_return');
  assert.equal(parsed.max_drawdown_limit, 0.1);
  assert.ok(parsed.estimated_combinations > 0);
});
