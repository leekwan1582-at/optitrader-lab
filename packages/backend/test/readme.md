# Test Environment & Procedure

This folder contains the automated tests for the `@optitrader/backend` package.

## Test layers

| File | Layer | What it covers | Requires |
|---|---|---|---|
| `../engine/tests/test_backtest.py` | Python engine | `parse_args`, `load_data`, `run_sma_crossover`, `extract_results` | Python 3.11 + `vectorbt` |
| `bridge.test.ts` | Node ↔ Python bridge | Real `child_process` spawn, JSON parsing, missing CSV, invalid config, timeout | Node.js + Python 3.11 + `vectorbt` |
| `auth.test.ts` | Auth integration | Cookie flags, refresh rotation/reuse, logout, Origin checks | MongoDB test server |
| `config.test.ts` | Server config | Env validation: Mongo URI, Gemini key, CORS origin, ports, JWT secrets | Node.js only |
| `domain.test.ts` | Server domain | Combinations, CSV parsing, run hashes, local assistant parser, Zod schemas | Node.js only |

Bridge/config/domain tests do not require MongoDB or a live Gemini key. Auth tests use `mongodb-memory-server`.

## Prerequisites

- Node.js 24
- Python 3.11
- Repository dependencies installed

## Setup

### 1. Node dependencies

From the repository root:

```bash
npm install
```

### 2. Python environment

From `packages/backend/`:

```bash
python3.11 -m venv engine/.venv
source engine/.venv/bin/activate
pip install --upgrade pip
pip install -r engine/requirements.txt
```

The worker checks for Python in this order:

1. `engine/.venv/bin/python`
2. repository-root `.venv/bin/python`
3. `python3.11`
4. `python3`

Using `engine/.venv` is recommended because it matches the first worker candidate.

## Running the tests

### Node tests (config, domain and bridge)

From `packages/backend/`:

```bash
npm test
```

Equivalent to running auth, config, domain and bridge suites. Target them separately:

```bash
npm run test:config
npm run test:bridge
```

### Python engine tests

From the repository root:

```bash
npm run test:engine
```

Or from `packages/backend/`:

```bash
../../.venv/bin/python -m pytest engine/tests/test_backtest.py -q
```

The root `pytest.ini` sets `pythonpath = packages/backend/engine`, so `import backtest` resolves correctly.

### Everything

From the repository root:

```bash
cd packages/backend && npm test
cd ../..
npm run test:engine
```

## Bridge test details

`bridge.test.ts` calls `runBacktest()` from `../src/workers/backtestWorker.ts`, which spawns:

```text
<python> engine/backtest.py <csv_path> '<json_config>'
```

It then parses the engine's stdout as JSON. The suite verifies:

- Successful runs return `status: "success"`, valid fast/slow parameters, finite metrics and a non-empty equity curve.
- A missing CSV produces `ENGINE_ERROR`.
- Missing `fast_ma` config produces `ENGINE_ERROR`.
- `timeoutMs: 1` produces `TIMEOUT`.

The fixture `fixtures/ohlcv.csv` contains 180 hourly OHLCV rows. It is explicitly un-ignored in the root `.gitignore`:

```gitignore
!packages/backend/test/fixtures/*.csv
```

If you add another CSV fixture, add a matching exception.

## Conventions for new tests

- TypeScript tests use Node's built-in runner through `tsx`: name them `*.test.ts`.
- Python tests use pytest: name them `test_*.py`.
- Keep bridge tests free of MongoDB and Gemini network calls.
- Keep fixtures deterministic and small enough to run quickly.
- Do not commit `node_modules/`, `.env`, or virtual environments.

## Troubleshooting

### `No module named 'vectorbt'`

The bridge test is using the wrong Python interpreter. Check:

```bash
engine/.venv/bin/python -c "import vectorbt; print(vectorbt.__version__)"
```

If it fails, recreate `packages/backend/engine/.venv` with Python 3.11 and reinstall `engine/requirements.txt`.

### `TIMEOUT` in the bridge success test

The engine took longer than the test timeout. Run the engine directly first:

```bash
cd packages/backend
engine/.venv/bin/python engine/backtest.py test/fixtures/ohlcv.csv \
  '{"fast_ma":{"min":5,"max":10,"step":5},"slow_ma":{"min":20,"max":40,"step":10},"objective":"sharpe","max_drawdown":0.5,"transaction_costs":0}'
```

### `ENGINE_NOT_FOUND` or `ENGINE_START_FAILED`

Check that `engine/backtest.py` exists and that one of the Python candidates above is runnable.

### Tests pass but the app has no data

The test suite intentionally avoids MongoDB. Seeding and API integration are covered in the main [readme.md](../readme.md).
