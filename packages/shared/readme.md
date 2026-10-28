# @optitrader/shared

Single source of truth for API contracts shared by the frontend and backend.

## Contents

```text
src/
├── index.ts
├── errors.ts             # Error codes and error response shape
├── ws.ts                 # WebSocket event names and payload schemas
└── schemas/
    ├── auth.ts           # Login/register, user, session, JWT payload
    ├── domain.ts         # Workspace, dataset, profile, run, metrics, settings
    └── assistant.ts      # Assistant prompt input
```

Rules:

- Define Zod schemas here, then derive TypeScript types with `z.infer`.
- Do not duplicate these types in `packages/frontend` or `packages/backend`.
- Import through `@optitrader/shared`, never from `src/` internals.

## Build

```bash
npm run build -w @optitrader/shared
```

The package emits to `dist/` and is consumed as a workspace package.
