# Implementation & Documentation Migration Notes

**Status:** completed. This file records how the prototype and documentation were consolidated. It is not a to-do list.

## Final architecture

- The original JS PoC remains in `03-hi-fi`; the TypeScript production candidate is `03-hi-fi-ts`.
- `02-mid-fi` intentionally remains JavaScript.

- React + Vite client with mock-data and live-API modes.
- Node.js/Express backend using ES6 modules (`"type": "module"`).
- Python 3.11/vectorbt engine spawned through `child_process`.
- MongoDB/Mongoose persistence with JWT authentication.
- Gemini assistant with a local heuristic fallback.

## What changed

### Code

- Built the React client under `prototypes/03-hi-fi/client/`: pages, components, API adapters, context, mock data and styling.
- Built the Express server under `prototypes/03-hi-fi/server/`: routes, controllers, middleware, services, models, seed script and worker.
- Converted all server JavaScript in the original PoC to ES6 modules (`import`/`export`); no CommonJS remains.
- Created the self-contained TypeScript candidate in `prototypes/03-hi-fi-ts/` (client, server, engine, tests).
- Added JWT auth, owner-scoped queries, Zod validation, rate limiting and error handling.
- Added config validation and a demo seed user (`marcus@optitrader.dev` / `demo1234`).
- Fixed Python engine issues found by the bridge test: index-frequency inference, MultiIndex parameter selection, non-finite JSON values and duplicate function definitions.
- Added Node config/domain tests, a committed OHLCV fixture and a real JS ↔ Python bridge test.

### Documentation

- Replaced the root `readme.md` coaching plan with the current project entry point.
- Made `docs/submission.md` the capstone narrative and `docs/design_v01.md` the technical reference.
- Updated both documents for the Python child-process architecture, ES6 modules, ApexCharts, current repository tree and actual documentation inventory.
- Updated `prototypes/01-lo-fi/readme.md` with the final stack and links to the implemented prototypes.
- Added `prototypes/02-mid-fi/readme.md` documenting the interactive mid-fidelity prototype.
- Kept `prototypes/03-hi-fi/readme.md` as setup/API/browser-testing/troubleshooting reference.
- Added `prototypes/03-hi-fi/test/readme.md` for test-environment setup and procedure.
- Cleaned up and renamed wireframe image assets to stable filenames.

## Deferred / post-MVP

- Production hardening of the TypeScript candidate (managed deployment, object storage, auth hardening).
- Redis/BullMQ queue and WebSocket progress streaming (tracked in `docs/production-plan.md`).
- EMA-specific engine algorithm (the UI exposes EMA; the Python engine currently runs the SMA path).
- Standalone `user-guide.md`, `technical.md`, `api.md` and `CONTRIBUTING.md` (their content is covered by the high-fidelity README).
- Walk-forward validation and deployment hardening.
