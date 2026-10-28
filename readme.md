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
│   ├── production-plan.md        # Production roadmap and TypeScript plan
│   ├── auth-plan.md              # HttpOnly cookie authentication design
│   └── auth-implementation-checklist.md
├── packages/
│   ├── shared/                   # Zod schemas, inferred types, WS/JWT/error contracts
│   ├── backend/                  # Express + TypeScript API
│   │   └── engine/               # Python/vectorbt backtest engine
│   └── frontend/                 # React + Vite + TypeScript client
├── prototypes/
│   ├── 01-lo-fi/                 # Paper wireframes + low-fi proposal
│   ├── 02-mid-fi/                # Interactive HTML/CSS/ES6 prototype (JS)
│   └── 03-hi-fi/                 # Original high-fidelity JS PoC
└── pytest.ini
```

## Prerequisites

| Requirement | Needed for |
|---|---|
| Node.js 24 | Client and server |
| Python 3.11 + `vectorbt` | Backtest engine and bridge tests |
| MongoDB (local or Atlas) | Live API mode |
| Google Gemini API key | Live API startup and assistant (local fallback if API calls fail) |

## Quick start — standalone demo

No backend is required. The client uses bundled mock data in memory. Authentication uses HttpOnly cookies when the live API is enabled; mock mode keeps its user in memory only.

```bash
npm install
cp packages/frontend/.env.example packages/frontend/.env
npm run dev -w @optitrader/frontend
```

Open `http://localhost:5173`. The demo login is pre-filled:

```text
marcus@optitrader.dev / demo1234
```

## Quick start — live API

Prerequisites: Node.js 24, Python 3.11, MongoDB (local or Atlas), and a Gemini API key.

```bash
npm install

# 1. Backend
cd packages/backend
cp .env.example .env
# edit .env: MONGO_URI, GEMINI_API_KEY, CLIENT_URL, JWT secrets
npm run config:check
npm run seed
npm run dev

# 2. Frontend (new terminal)
cd packages/frontend
cp .env.example .env
# set VITE_USE_MOCK_API=false (dev proxy already targets localhost:5000)
npm run dev
```

API: `http://localhost:5000` · health check: `GET /api/health`.

## Tests

```bash
# Node: auth, config, domain and TypeScript ↔ Python bridge tests
npm test

# Python engine
npm run test:engine
```

See [`packages/backend/readme.md`](packages/backend/readme.md) for test-environment setup and troubleshooting. The original JS PoC remains in `prototypes/03-hi-fi/`.

## Documentation map

| Document | Purpose |
|---|---|
| [`docs/submission.md`](docs/submission.md) | Capstone report: research, design, prototyping, mock data, testing, AI integration |
| [`docs/design_v01.md`](docs/design_v01.md) | Technical design: features, architecture, schemas, security, deployment |
| [`docs/production-plan.md`](docs/production-plan.md) | Production roadmap, managed deployment, TypeScript migration and Redis backlog |
| [`docs/auth-plan.md`](docs/auth-plan.md) | HttpOnly cookie authentication design and migration plan |
| [`docs/auth-implementation-checklist.md`](docs/auth-implementation-checklist.md) | Authentication implementation and verification checklist |
| [`docs/feature-plan.md`](docs/feature-plan.md) | Remaining F1–F8 features, live-mode switch, engine/AI work and tests |
| [`prototypes/01-lo-fi/readme.md`](prototypes/01-lo-fi/readme.md) | Low-fidelity wireframes and early specification |
| [`prototypes/02-mid-fi/readme.md`](prototypes/02-mid-fi/readme.md) | Medium-fidelity interactive prototype |
| [`prototypes/03-hi-fi/readme.md`](prototypes/03-hi-fi/readme.md) | Original high-fidelity PoC setup, API and troubleshooting (JS) |
| [`packages/shared/readme.md`](packages/shared/readme.md) | Shared contracts and build instructions |
| [`packages/backend/readme.md`](packages/backend/readme.md) | Backend setup, auth, engine and tests |
| [`packages/frontend/readme.md`](packages/frontend/readme.md) | Frontend setup, auth flow and browser testing |

## Production roadmap

See [`docs/production-plan.md`](docs/production-plan.md) for the managed Vercel + Render/Railway + Atlas target, synchronous v1 execution and the Redis/BullMQ backlog. Authentication uses HttpOnly cookies — see [`docs/auth-plan.md`](docs/auth-plan.md). Remaining product features are planned in [`docs/feature-plan.md`](docs/feature-plan.md).

## Known limitations (PoC)

- The Python engine currently implements the SMA crossover path; the UI also exposes EMA momentum, but it is not a separate engine algorithm yet.
- Seeded datasets without an uploaded CSV use a deterministic synthetic OHLCV file for local runs.
- Runs execute synchronously through the child process. Redis/BullMQ queues, WebSocket progress and deployment hardening are tracked in the [production plan](docs/production-plan.md).
- The assistant falls back to a local heuristic parser if Gemini API calls fail.
- Mock mode keeps data and session state in memory, so a page reload returns to login.
- Historical data ingestion supports standard OHLCV CSV files only.

## License

Part of a Capstone submission for the BELLS SCTP Diploma in AI-Powered Software Engineering. Not intended for commercial use without permission.
