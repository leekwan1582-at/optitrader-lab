# OptiTrader Lab

**Research · Optimize · Validate · Deploy**

OptiTrader Lab is an AI-assisted strategy optimization platform for solo quantitative traders. It turns parameter tuning into tracked, reproducible experiments with a React dashboard, an Express API, and a Python/vectorbt backtesting engine.

## Current status

- **High-fidelity PoC implemented:** React + Vite client, Express API, MongoDB models, JWT auth, Gemini assistant, and Python bridge.
- **Standalone demo available:** the client runs from local mock data by default (`VITE_USE_MOCK_API=true`).
- **Live API available:** seed MongoDB, start the server, and switch the client to the live API.
- **Documentation:** this file is the entry point; the detailed design and capstone report are in [`docs/`](docs/).

## Architecture

```text
React + Vite client
        │  REST / JWT
        ▼
Node.js + Express API (ES modules)
        │
        ├── MongoDB (Mongoose)
        ├── Gemini API (@google/genai, optional fallback)
        └── Node worker → Python 3.11 / vectorbt
                              │
                              ▼
                        JSON metrics + equity curve
```

## Repository layout

```text
optitrader-lab/
├── readme.md
├── docs/
│   ├── submission.md             # Capstone report (LU1–LU6)
│   ├── design_v01.md             # Technical/design specification
│   └── production-plan.md        # Production roadmap and TypeScript plan
├── prototypes/
│   ├── 01-lo-fi/                 # Paper wireframes + low-fi proposal
│   ├── 02-mid-fi/                # Interactive HTML/CSS/ES6 prototype (JS)
│   ├── 03-hi-fi/                 # Original high-fidelity PoC (JS)
│   └── 03-hi-fi-ts/              # TypeScript production candidate
│       ├── client/               # React + Vite + TypeScript
│       ├── server/               # Express + TypeScript
│       ├── engine/               # Python/vectorbt backtest engine
│       ├── test/                 # Python, bridge and Node tests
│       └── readme.md             # TypeScript setup + browser walkthrough
└── pytest.ini
```

## Prerequisites

| Requirement | Needed for |
|---|---|
| Node.js 18+ | Client and server |
| Python 3.11 + `vectorbt` | Backtest engine and bridge tests |
| MongoDB (local or Atlas) | Live API mode |
| Google Gemini API key | Live API startup and assistant (local fallback if API calls fail) |

## Quick start — standalone demo

No backend is required. The client uses bundled mock data and `localStorage`.

```bash
cd prototypes/03-hi-fi-ts/client
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The demo login is pre-filled:

```text
marcus@optitrader.dev / demo1234
```

## Quick start — live API

Prerequisites: Node.js 18+, Python 3.11, MongoDB (local or Atlas), and a Gemini API key.

```bash
# 1. Backend
cd prototypes/03-hi-fi-ts/server
npm install
cp .env.example .env
# edit .env: MONGO_URI, GEMINI_API_KEY, CLIENT_URL
npm run config:check
npm run seed
npm run dev

# 2. Frontend (new terminal)
cd prototypes/03-hi-fi-ts/client
cp .env.example .env
# set VITE_USE_MOCK_API=false
npm run dev
```

API: `http://localhost:5000` · health check: `GET /api/health`.

## Tests

```bash
# Node: config, domain and TypeScript ↔ Python bridge tests
cd prototypes/03-hi-fi-ts/server
npm test

# Python engine (uses the copied engine + local pytest.ini)
cd ..
../../.venv/bin/python -m pytest -q
```

See [`prototypes/03-hi-fi-ts/test/readme.md`](prototypes/03-hi-fi-ts/test/readme.md) for test-environment setup and troubleshooting. The original JS PoC remains in `03-hi-fi/` with the same commands.

## Documentation map

| Document | Purpose |
|---|---|
| [`docs/submission.md`](docs/submission.md) | Capstone report: research, design, prototyping, mock data, testing, AI integration |
| [`docs/design_v01.md`](docs/design_v01.md) | Technical design: features, architecture, schemas, security, deployment |
| [`docs/production-plan.md`](docs/production-plan.md) | Production roadmap, managed deployment, TypeScript migration and Redis backlog |
| [`prototypes/01-lo-fi/readme.md`](prototypes/01-lo-fi/readme.md) | Low-fidelity wireframes and early specification |
| [`prototypes/02-mid-fi/readme.md`](prototypes/02-mid-fi/readme.md) | Medium-fidelity interactive prototype |
| [`prototypes/03-hi-fi/readme.md`](prototypes/03-hi-fi/readme.md) | Original high-fidelity PoC setup, API and troubleshooting (JS) |
| [`prototypes/03-hi-fi-ts/readme.md`](prototypes/03-hi-fi-ts/readme.md) | TypeScript candidate setup and browser walkthrough |
| [`prototypes/03-hi-fi-ts/test/readme.md`](prototypes/03-hi-fi-ts/test/readme.md) | TypeScript test environment and procedures |

## Production roadmap

See [`docs/production-plan.md`](docs/production-plan.md) for the managed Vercel + Render/Railway + Atlas target, Bearer JWT hardening, synchronous v1 execution and the Redis/BullMQ backlog.

## Known limitations (PoC)

- The Python engine currently implements the SMA crossover path; the UI also exposes EMA momentum, but it is not a separate engine algorithm yet.
- Seeded datasets without an uploaded CSV use a deterministic synthetic OHLCV file for local runs.
- Runs execute synchronously through the child process. Redis/BullMQ queues, WebSocket progress and deployment hardening are tracked in the [production plan](docs/production-plan.md).
- Gemini is optional at the service level; the assistant falls back to a local heuristic parser if the API is unavailable.
- Historical data ingestion supports standard OHLCV CSV files only.

## License

Part of a Capstone submission for the BELLS SCTP Diploma in AI-Powered Software Engineering. Not intended for commercial use without permission.
