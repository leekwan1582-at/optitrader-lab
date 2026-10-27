# Test Environment & Procedure

This folder contains the automated tests for the TypeScript high-fidelity `03-hi-fi-ts` prototype.

## Test layers

| File | Layer | What it covers | Requires |
|---|---|---|---|
| `test_backtest.py` | Python engine | `parse_args`, `load_data`, `run_sma_crossover`, `extract_results` | Python 3.11 + `vectorbt` |
| `bridge.test.ts` | Node ↔ Python bridge | Real `child_process` spawn, JSON parsing, missing CSV, invalid config, timeout | Node.js + Python 3.11 + `vectorbt` |
| `../server/test/config.test.ts` | Server config | Env validation: Mongo URI, Gemini key, CORS origin, port, JWT | Node.js only |
| `../server/test/domain.test.ts` | Server domain | Combinations, CSV parsing, run hashes, local assistant parser, Zod schemas | Node.js only |

The bridge and server tests do **not** require MongoDB or a live Gemini key.

## Prerequisites

- Node.js 18 or newer
- Python 3.11
- Repository dependencies installed

## Setup

### 1. Node dependencies

From this folder:

```bash
cd ../server
npm install
```

### 2. Python environment

From `prototypes/03-hi-fi-ts/`:

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

From `prototypes/03-hi-fi-ts/server/`:

```bash
npm test
```

Equivalent to running both server and bridge suites. Target them separately:

```bash
npm run test:config
npm run test:bridge
```

### Python engine tests

From `prototypes/03-hi-fi-ts/`:

```bash
../../.venv/bin/python -m pytest -q
```

Or target the engine suite directly:

```bash
pytest prototypes/03-hi-fi-ts/test/test_backtest.py -v
```

The folder-level `pytest.ini` sets `pythonpath = engine`, so `import backtest` resolves correctly.

### Everything

From the repository root:

```bash
cd prototypes/03-hi-fi-ts/server && npm test
cd ..
../../.venv/bin/python -m pytest -q
```

## Bridge test details

`bridge.test.ts` calls `runBacktest()` from `../server/workers/backtestWorker.ts`, which spawns:

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
!prototypes/03-hi-fi-ts/test/fixtures/*.csv
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

If it fails, recreate `03-hi-fi-ts/engine/.venv` with Python 3.11 and reinstall `engine/requirements.txt`.

### `TIMEOUT` in the bridge success test

The engine took longer than the test timeout. Run the engine directly first:

```bash
cd prototypes/03-hi-fi-ts
engine/.venv/bin/python engine/backtest.py test/fixtures/ohlcv.csv \
  '{"fast_ma":{"min":5,"max":10,"step":5},"slow_ma":{"min":20,"max":40,"step":10},"objective":"sharpe","max_drawdown":0.5,"transaction_costs":0}'
```

### `ENGINE_NOT_FOUND` or `ENGINE_START_FAILED`

Check that `engine/backtest.py` exists and that one of the Python candidates above is runnable.

### Tests pass but the app has no data

The test suite intentionally avoids MongoDB. Seeding and API integration are covered in the main [readme.md](../readme.md).
