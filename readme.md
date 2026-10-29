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

Prerequisites: Node.js 24, Python 3.11, MongoDB (local or Docker), and optionally a Gemini API key.

```bash
# 0. Install workspace dependencies
npm install

# 1. Start MongoDB (either local systemd service or Docker)
# If using local systemd: sudo systemctl start mongod
# If using Docker: docker run -d --name mongo -p 27017:27017 mongo:7

# 2. Configure & Start Backend
cd packages/backend
cp .env.example .env
# Verify .env: MONGO_URI, GEMINI_API_KEY, CLIENT_URL, JWT secrets
npm run config:check
npm run seed             # Seeds demo account: marcus@optitrader.dev / demo1234
npm run dev              # Starts Express on http://localhost:5000

# 3. Configure & Start Frontend (in a new terminal)
cd packages/frontend
cp .env.example .env     # Defaults to VITE_API_URL=/api and VITE_USE_MOCK_API=false
npm run dev              # Starts Vite on http://localhost:5173
```

API: `http://localhost:5000` · health check: `GET /api/health` · OpenAPI docs: `GET /api/docs`.

### Recommended Next Steps to Run Locally

1. **Verify Services Are Listening:**
   - Backend Express server is running on `http://localhost:5000`.
   - Frontend Vite development server is running on `http://localhost:5173`.
   - MongoDB is accepting connections at `mongodb://localhost:27017`.

2. **Authenticate in the Browser:**
   - Open `http://localhost:5173` in your browser.
   - If not authenticated, you will be redirected to `http://localhost:5173/login`.
   - *Note on Initial Console Warnings:* Seeing `POST /api/auth/refresh 401 (Unauthorized)` on the very first page load is normal—the client attempts a silent session restoration before an authentication cookie exists, and gracefully redirects to `/login`.
   - Log in using the seeded credentials (`marcus@optitrader.dev` / `demo1234`) or click **Register** to create a new workspace.

3. **Verify API Communication:**
   - Once logged in, `ot_access` and `ot_refresh` HttpOnly cookies are set.
   - The dashboard calls `/api/workspace` and `/api/runs` via Vite proxy (`/api` -> `http://localhost:5000`), loading experiments, datasets, and profiles seamlessly.

## Quick start — local production simulation

To test and verify the compiled, production-ready build (`dist/`) without development reloaders:

```bash
# 0. Build all packages for production
npm run build

# 1. Backend: configure production secrets and start compiled Node server
# In packages/backend/.env set:
#   NODE_ENV=production
#   CLIENT_URL=http://localhost:4173
#   JWT_ACCESS_SECRET=<32+ bytes>
#   JWT_REFRESH_SECRET=<32+ bytes>
#   MONGO_URI=mongodb://localhost:27017/optitrader_lab
npm run seed:prod -w @optitrader/backend   # Seeds using dist/seed.js
npm start -w @optitrader/backend           # Runs node dist/server.js on :5000

# 2. Frontend: serve production preview bundle (in a separate terminal)
# In packages/frontend/.env set:
#   VITE_API_URL=http://localhost:5000/api
#   VITE_USE_MOCK_API=false
npm run preview -w @optitrader/frontend -- --port 4173
```

Open `http://localhost:4173` to verify the production minified bundle with HttpOnly cookie session handling.

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
