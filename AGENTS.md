# AGENTS.md

Full-stack TypeScript monorepo (npm workspaces, ESM). Follow these rules strictly; ask before deviating.

## Layout
- `packages/shared` – Zod schemas, inferred types, WS event names, JWT payload type, error shape. Single source of truth.
- `packages/frontend` – React + Vite + React-Bootstrap.
- `packages/backend` – Node server (Express), MongoDB, WebSocket.
- Never duplicate shared types in frontend/backend. Never mix frontend and backend code.

## Setup
- Node 24 LTS (`engines` in root `package.json`, `.nvmrc`). npm workspaces, ESM (`"type": "module"`).
- ESLint flat config lives at the repo root (`eslint.config.js`); one file, rules scoped by package path.
- All packages extend `tsconfig.base.json`. `shared` builds first (`tsc -b`, project references); other packages depend on it as a workspace package.
- ESLint 9 until eslint-plugin-jsx-a11y supports 10

## Commands
Run from root; use `-w packages/<name>` to scope.
- `npm install` · `npm run dev` · `npm run build`
- `npm run typecheck` · `npm run lint` · `npm run format` · `npm test`
<!-- Adjust script names to match package.json. -->

## Tooling & testing
- ESLint (typescript-eslint, `jsx-a11y`) enforces the TypeScript bans and a11y rules; Prettier formats. Don't disable a rule inline without an `EXCEPTION` comment.
- Vitest in all packages. Supertest for REST routes, `mongodb-memory-server` for DB tests, React Testing Library for components (query by role/label). Tests sit beside source as `*.test.ts(x)`.
- Test WebSocket handlers with a real local server and client; cover invalid-payload rejection.
- Run `vitest-axe` on every page-level component test; fix violations rather than suppressing them.

## Definition of done
Before finishing any task: typecheck, lint, and tests pass for every touched package. Add or update tests for changed behavior. Report anything you could not run.

## TypeScript
- `"strict": true`. No `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, or `!.`.
- Exceptions need the rule named and a reason: `// eslint-disable-next-line <rule-id> -- EXCEPTION: <reason>`, or `// @ts-expect-error EXCEPTION: <reason>`.
- External data (API, WS, `JSON.parse`, raw driver results) is `unknown` until validated by Zod or a type guard. Mongoose model results are already typed; validate them once, in the DTO serializer, against the shared schema. Don't double-parse.
- Infer types with `z.infer<typeof schema>`; don't hand-write duplicates.

## Runtime boundaries
- REST: validate `req.body`, `req.params`, `req.query` with Zod in every handler. Validate ObjectId strings.
- WebSocket: event names are a string-literal union in `shared`. Validate every incoming message before business logic; enforce a message size limit.
- Validate server env vars with Zod at startup. Keep `.env.example` current. Never commit secrets.

## Auth & security
- JWT only in `HttpOnly`, `SameSite=Strict`, `Secure` (prod) cookies. Never in `localStorage`/`sessionStorage`.
- Verify signature and payload shape (shared type) on every authenticated request, including the WS handshake. Check WS origin.
- Hash passwords with argon2 or bcrypt. Use helmet, an explicit CORS allowlist, and rate limiting on auth routes.
- JWT lifecycle: 15-minute access token plus rotating refresh token, both in HttpOnly cookies. Store refresh tokens hashed server-side so logout revokes them. Pin the algorithm in `verify`. Load secrets from env (32+ bytes).
- CSRF: `SameSite=Strict` plus an `Origin` check on all state-changing requests.
- WebSocket: authorize every room join server-side. Ping/pong heartbeat drops dead connections. Client reconnects with exponential backoff and jitter.
- Dev uses a Vite proxy so cookies stay same-origin; use `credentials: 'include'` for API calls.

## MongoDB
- Never send `HydratedDocument` or `ObjectId` to clients. Map through a serializer to DTOs with string IDs (REST and WS).
- Add indexes for query patterns you introduce.
- Mongoose, with query results parsed through Zod at the boundary. Transactions only for multi-document invariants. Open one connection at startup; close it on SIGTERM.
- Local dev: `docker-compose` for MongoDB; `npm run seed` for sample data.

## Frontend
- Env vars: `VITE_` prefix, read via `import.meta.env`. Never put secrets in them.
- Import react-bootstrap per module: `import Button from 'react-bootstrap/Button'`.
- Mobile-first with `Container`/`Row`/`Col` (`xs` upward). Use fluid units, no fixed pixel widths on major layouts.
- Semantic HTML5 (`main`, `header`, `nav`, `section`, `footer`) over generic `div`s.
- Styling: CSS Modules (`Name.module.css`) alongside Bootstrap utilities; no global style leaks. One module per component, camelCase class names; types come from `vite/client` in `tsconfig`.
- Routing: React Router. Server state: TanStack Query for all fetching; no data fetching in `useEffect`.
- Forms: React Hook Form with `zodResolver`, reusing schemas from `packages/shared`.
- State: local `useState` by default; Context only for auth/session. Ask before adding a state library.
- Errors: route-level error boundary (`react-error-boundary`); surface API errors in an `aria-live` region.
- API client: one typed fetch wrapper (`src/api/client.ts`) with `credentials: 'include'` that validates responses against shared Zod schemas. Components never call `fetch` directly.
- Accessibility: ARIA where native semantics fall short; descriptive `alt` (`aria-hidden="true"` for decorative); every input bound to a label (`Form.Label` or `htmlFor`/`id`); logical focus order with visible `:focus-visible`, never remove outlines without a replacement; interactive targets at least 44x44px. Bootstrap `btn-sm`, form controls, and icon buttons fall below this by default; enforce `min-height`/`min-width` of `2.75rem` in a shared CSS Module rather than avoiding the components.
- WebSockets live in a `useWebSocket` hook using `useEffect`, returning cleanup that calls `socket.close()`.

## Code style
- Simplicity first: smallest change that solves the task. No unrelated refactors.
- TSDoc on created or modified exported code. State Big-O only for new algorithms.
- Performance: avoid unnecessary re-renders (memoize only after measuring); clean up timers, listeners, and sockets on unmount; stream or paginate large result sets instead of loading them into memory.
- Return errors in the shared error shape via central error middleware; no silent catches.
- Log with pino (structured). Never log tokens, passwords, or PII.

## Working rules
- Ask before adding dependencies, changing `tsconfig`/lint config, or touching lockfiles by hand.
- Run the most relevant check (typecheck/lint/test for the touched package) while working, full suite at the end.
- Don't edit generated files or `dist/`. Never read or print `.env` contents.
- Small, focused commits with imperative messages.