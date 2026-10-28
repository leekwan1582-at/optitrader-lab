# @optitrader/backend

Express + TypeScript API for OptiTrader Lab, with MongoDB, Gemini, and the Python/vectorbt engine.

## Setup

From the repository root:

```bash
npm install
cd packages/backend
cp .env.example .env
```

Required environment:

```env
MONGO_URI=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
COOKIE_DOMAIN=
```

Generate secrets with `openssl rand -base64 48`. Both JWT secrets must be at least 32 bytes.

## Commands

```bash
npm run dev          # tsx watch
npm run build        # tsc to dist/
npm start            # node dist/server.js
npm run seed         # demo user + mock data
npm run db:check     # MongoDB connection check
npm run config:check
npm test             # auth, config, domain and bridge tests
```

Seed the demo account:

```text
marcus@optitrader.dev / demo1234
```

## Authentication

- HttpOnly access cookie `ot_access` (15 minutes).
- HttpOnly refresh cookie `ot_refresh` (7 days, `/api/auth`).
- `SameSite=Strict`; `Secure` in production.
- Refresh-token rotation with HMAC-SHA256 hashed storage.
- `Origin`/`Referer` validation on state-changing requests.
- No JWT is ever returned in JSON or stored by the frontend.

See [`../../docs/auth-plan.md`](../../docs/auth-plan.md).

## Python engine

The Python engine lives in `engine/`.

```bash
cd engine
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

The worker checks `engine/.venv`, the repository `.venv`, then `python3.11` / `python3`.

Run engine tests from the repository root:

```bash
npm run test:engine
```

## Tests

```bash
npm test
npm run test:config
npm run test:bridge
```

Auth integration tests use `mongodb-memory-server`; bridge tests use the real Python engine.
