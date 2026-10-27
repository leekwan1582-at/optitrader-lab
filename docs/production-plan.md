# Production Plan

**Status:** TypeScript migration is implemented in [`../prototypes/03-hi-fi-ts/`](../prototypes/03-hi-fi-ts/) and verified with client/server typechecks, both production builds, 23 Node tests and 9 pytest tests. Production hardening, managed deployment and the Redis/BullMQ queue remain to be completed.

This plan describes how the high-fidelity PoC becomes a managed production system. The original JS PoC remains in [`../prototypes/03-hi-fi/`](../prototypes/03-hi-fi/) and the academic design remains in [`design_v01.md`](design_v01.md).

## 1. Decisions

| Area | Decision |
|---|---|
| Frontend hosting | Vercel |
| API hosting | Render or Railway |
| Database | MongoDB Atlas |
| Auth | Keep `Authorization: Bearer <JWT>` |
| Run execution | Synchronous Python child process for v1 |
| Queue | Redis/BullMQ deferred to the v1.1 backlog |
| TypeScript scope | `prototypes/03-hi-fi-ts/client` and `server` |
| JavaScript scope | `02-mid-fi` and the original `03-hi-fi` stay JavaScript |
| Python engine | Copied into `03-hi-fi-ts/engine`; remains Python |

## 2. Target architecture

```text
Vercel — React + Vite + TypeScript
        │ HTTPS + Authorization: Bearer <JWT>
        ▼
Render / Railway — Node.js + Express + TypeScript
        │
        ├── MongoDB Atlas
        ├── Google Gemini API
        ├── object storage (dataset files)
        └── Python 3.11 + vectorbt child process
                    │
                    ▼
          metrics + equity curve JSON
```

### Synchronous v1 execution

- `POST /api/runs` creates the run and waits for the Python process.
- Response returns the completed or failed run.
- The engine timeout must stay below the Render/Railway HTTP timeout.
- Combination count and CSV size remain capped.
- Redis/BullMQ, cancellation, progress streaming and retries are v1.1 work.

## 3. Repository strategy

```text
prototypes/
├── 02-mid-fi/        # remains JavaScript
├── 03-hi-fi/         # frozen JavaScript PoC
└── 03-hi-fi-ts/      # TypeScript production candidate
    ├── client/       # React + Vite + TS
    ├── server/       # Express + TS
    ├── engine/       # Python/vectorbt
    ├── test/         # pytest + TS bridge tests
    ├── pytest.ini
    └── readme.md
```

`03-hi-fi-ts` is intentionally self-contained so it can be deployed without cross-folder paths. After production readiness, archive `03-hi-fi` and either keep `03-hi-fi-ts` as the canonical prototype or promote it to `production/`.

## 4. TypeScript migration

### Completed

- Server converted to strict TypeScript with `NodeNext` modules.
- Client converted to TypeScript/TSX with strict Vite configuration.
- Domain types added for users, workspaces, datasets, profiles, runs, metrics, robustness and AI summaries.
- Express request augmentation for authenticated users.
- Typed Zod schemas and request handlers.
- Typed Mongoose models.
- Typed worker contract for the Python JSON result.
- Config, domain and bridge tests converted to TypeScript.
- `npm run typecheck`, server build, client build, Node tests and pytest pass.

### Commands

```bash
# Server
cd prototypes/03-hi-fi-ts/server
npm install
npm run typecheck
npm run build
npm test

# Client
cd ../client
npm install
npm run typecheck
npm run build

# Python (from the repository root)
cd prototypes/03-hi-fi-ts
../../.venv/bin/python -m pytest -q
```

### Rules going forward

- No new `.js`/`.jsx` files in `03-hi-fi-ts/client/src` or `03-hi-fi-ts/server`.
- `strict` stays enabled; avoid introducing `any` without a comment.
- Shared request/response shapes should be added to `types/domain.ts` or generated from OpenAPI.
- Keep the Python JSON contract typed in `BacktestResult`.

## 5. Production backend hardening

### Authentication and authorization

- Keep Bearer JWT but shorten access-token lifetime.
- Add refresh/re-auth strategy and token revocation.
- Add password reset and email verification.
- Keep owner-scoped queries on every dataset, profile and run endpoint.
- Add auth rate limiting and login audit events.

### API

- Version the API under `/api/v1`.
- Publish an OpenAPI specification.
- Add pagination, filtering and sorting to list endpoints.
- Add idempotency keys for run creation.
- Standardize the error envelope and request IDs.
- Add request size limits and strict CORS allowlist.

### Database

- Use MongoDB Atlas with production credentials.
- Add compound indexes for owner + created_at, owner + dataset, owner + profile.
- Add migrations and a backup/restore runbook.
- Define retention for runs, datasets and logs.
- Verify connection limits and pooling.

### Storage

- Move dataset files from local `server/uploads/` to durable object storage.
- Use presigned uploads or server-side multipart uploads.
- Validate size, MIME type, checksum and required OHLCV columns.
- Add cleanup for orphaned files and deleted datasets.

### Python engine

- Deploy Python 3.11 + vectorbt in the API container or a dedicated internal service.
- Keep the 120-second timeout below the platform request timeout.
- Add structured engine errors, deterministic seeds and engine versioning.
- Add EMA support, transaction costs, slippage and walk-forward validation as post-v1 work.

### Gemini

- Keep the API key server-side only.
- Validate function-call arguments with Zod.
- Add quota/cost logging, prompt-injection guards and redaction.
- Use a schema-constrained summary call after runs; retain the local fallback.
- Never expose the key through Vite environment variables.

## 6. Vercel + Render/Railway deployment

### Frontend — Vercel

- Build command: `npm run build` in `prototypes/03-hi-fi-ts/client`.
- Output: `dist/`.
- Environment: `VITE_API_URL=https://<api-domain>/api`.
- Set `VITE_USE_MOCK_API=false` in production.
- Add the Vercel domain to the server CORS `CLIENT_URL`.

### API — Render/Railway

Use a Docker image containing Node.js 20 and Python 3.11 + `engine/requirements.txt` because v1 runs Python synchronously.

- Start command: `npm start` after `npm run build`.
- Health check: `GET /api/health`.
- Environment: `MONGO_URI`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CLIENT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`.
- Secrets live in the platform dashboard, never in git.
- Configure graceful shutdown for SIGINT/SIGTERM.
- Verify the platform HTTP timeout is longer than the engine timeout.

## 7. Testing and release gates

| Gate | Requirement |
|---|---|
| TypeScript | `npm run typecheck` passes for client and server |
| Server tests | config, domain and bridge suites pass |
| Engine tests | pytest passes |
| Client build | production build passes |
| API integration | auth, ownership, dataset, profile and run endpoints pass with a test MongoDB |
| E2E | Playwright covers login → upload → parse → run → results → compare |
| Security | dependency scan, secrets scan and auth/CORS review |
| Operations | staging health check, logs and rollback verified |

## 8. Observability and operations

- Structured JSON logs with request IDs.
- Error tracking (Sentry or equivalent).
- Uptime checks for `/api/health`.
- Metrics for run duration, failures, Gemini errors and database latency.
- Alerts for API downtime, queue/engine failures and Atlas connection pressure.
- Runbooks for database outage, Gemini outage, Python failure and rollback.
- Backup restore drill before launch.

## 9. Backlog — Redis/BullMQ

Keep synchronous execution for v1. Move to the queue in v1.1:

- Add Redis and BullMQ.
- Run the Python engine in a dedicated worker service.
- Return `202 Accepted` from `POST /api/runs`.
- Add polling and SSE/WebSocket progress.
- Add cancellation, retries, dead-letter handling and concurrency limits.
- Move run timeouts and resource limits into the worker.
- Update the frontend from request-wait to progress subscription.

## 10. Milestones

| Milestone | Outcome |
|---|---|
| M1 | TypeScript candidate complete and tested |
| M2 | Production env + Atlas + durable storage |
| M3 | Vercel and Render/Railway staging deployment |
| M4 | Auth/CORS/security hardening |
| M5 | E2E, load and backup tests |
| M6 | Production launch checklist |
| M7 | Redis/BullMQ backlog implementation |

## 11. Risks

| Risk | Mitigation |
|---|---|
| Long synchronous runs exceed platform HTTP timeout | Keep grids small, enforce engine timeout below platform limit, queue in v1.1 |
| Bearer tokens exposed through XSS | Short expiry, strict CSP, avoid sensitive data in localStorage |
| Local uploads lost on redeploy | Move to object storage before launch |
| Duplicated JS PoC and TS candidate drift | Freeze JS PoC and archive it after TS validation |
| Python/vectorbt increases image size and build time | Build a dedicated Docker image and cache dependencies |
| Gemini cost or outage | Rate limits, quotas, local fallback and monitoring |
| Atlas connection limits | Connection pooling, indexes and load testing |

## 12. Documentation

- Root [`readme.md`](../readme.md) — project entry point and production link.
- [`design_v01.md`](design_v01.md) — PoC technical design.
- [`submission.md`](submission.md) — capstone report.
- [`../prototypes/03-hi-fi-ts/readme.md`](../prototypes/03-hi-fi-ts/readme.md) — TypeScript setup and browser testing.
- [`../prototypes/03-hi-fi-ts/test/readme.md`](../prototypes/03-hi-fi-ts/test/readme.md) — test environment and procedures.
