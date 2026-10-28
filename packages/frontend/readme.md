# @optitrader/frontend

React + Vite + TypeScript client for OptiTrader Lab.

## Setup

From the repository root:

```bash
npm install
cd packages/frontend
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Modes

```env
VITE_API_URL=/api
VITE_USE_MOCK_API=true
```

- **Mock mode:** bundled mock data in memory; no backend required. A reload returns to login.
- **Live API:** set `VITE_USE_MOCK_API=false`, run the backend, and use the seeded demo account.

The Vite dev server proxies `/api` to `http://localhost:5000`, keeping cookies same-origin.

## Authentication

- Login calls `POST /api/auth/login` with `credentials: 'include'`.
- The backend sets HttpOnly access and refresh cookies; the frontend never receives a JWT.
- On startup the app calls `POST /api/auth/refresh`, then loads workspace data.
- A 401 triggers one refresh-and-retry in the API wrapper.
- Logout calls `POST /api/auth/logout` and clears in-memory user state.

See [`../../docs/auth-plan.md`](../../docs/auth-plan.md).

## Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run preview
```

## Structure

```text
src/
├── api/          # fetch wrapper, mock API, live API
├── components/   # layout, tables, charts, KPIs
├── context/      # auth and workspace state
├── data/         # mockData.json
├── pages/        # dashboard, studio, datasets, results, comparison
├── types/        # shared re-exports and mock-only types
└── utils/
```
