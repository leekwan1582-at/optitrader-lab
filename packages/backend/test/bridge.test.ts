import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { runBacktest } from '../src/workers/backtestWorker.js';

const FIXTURE = fileURLToPath(new URL('./fixtures/ohlcv.csv', import.meta.url));

const baseConfig = {
  fast_ma: { min: 5, max: 10, step: 5 },
  slow_ma: { min: 20, max: 40, step: 10 },
  objective: 'sharpe',
  max_drawdown: 0.5,
  transaction_costs: 0,
};

function errorDetails(error: unknown): { code?: string; message: string } {
  return error as { code?: string; message: string };
}

test('JS → Python bridge returns a parsed successful result', { timeout: 60000 }, async () => {
  const result = await runBacktest({ csvPath: FIXTURE, config: baseConfig });

  assert.equal(result.status, 'success');
  assert.ok(typeof result.best_params?.fast_ma === 'number');
  assert.ok(typeof result.best_params?.slow_ma === 'number');
  assert.ok(result.best_params.fast_ma >= baseConfig.fast_ma.min);
  assert.ok(result.best_params.fast_ma <= baseConfig.fast_ma.max);
  assert.ok(result.best_params.slow_ma >= baseConfig.slow_ma.min);
  assert.ok(result.best_params.slow_ma <= baseConfig.slow_ma.max);
  assert.ok(result.best_params.fast_ma < result.best_params.slow_ma);
  assert.ok(Number.isFinite(result.metrics?.sharpe_ratio ?? NaN));
  assert.ok(Number.isFinite(result.metrics?.total_return ?? NaN));
  assert.ok(Number.isFinite(result.metrics?.max_drawdown ?? NaN));
  assert.ok(Array.isArray(result.equity_curve));
  assert.ok((result.equity_curve?.length ?? 0) > 0);
  assert.ok(result.equity_curve?.every((point) => Number.isFinite(point.value)));
});

test('JS → Python bridge surfaces a missing CSV as ENGINE_ERROR', { timeout: 60000 }, async () => {
  await assert.rejects(
    () => runBacktest({
      csvPath: '/tmp/optitrader-missing-fixture.csv',
      config: baseConfig,
    }),
    (error: unknown) => {
      const details = errorDetails(error);
      assert.equal(details.code, 'ENGINE_ERROR');
      assert.match(details.message, /Data loading failed|No such file|does not exist/i);
      return true;
    }
  );
});

test('JS → Python bridge surfaces invalid config as ENGINE_ERROR', { timeout: 60000 }, async () => {
  await assert.rejects(
    () => runBacktest({
      csvPath: FIXTURE,
      config: {
        slow_ma: { min: 20, max: 40, step: 10 },
        objective: 'sharpe',
        max_drawdown: 0.5,
      },
    }),
    (error: unknown) => {
      const details = errorDetails(error);
      assert.equal(details.code, 'ENGINE_ERROR');
      assert.match(details.message, /fast_ma|Missing required parameter range/i);
      return true;
    }
  );
});

test('JS → Python bridge enforces its timeout', { timeout: 60000 }, async () => {
  await assert.rejects(
    () => runBacktest({
      csvPath: FIXTURE,
      config: baseConfig,
      timeoutMs: 1,
    }),
    (error: unknown) => {
      assert.equal(errorDetails(error).code, 'TIMEOUT');
      return true;
    }
  );
});
