# Feature Completion Plan

**Status:** approved, implementation not started.

This plan completes the remaining product features in `packages/` before the production queue, WebSocket progress and managed-deployment work.

Related documents:

- [Production plan](production-plan.md)
- [Authentication plan](auth-plan.md)
- [Authentication implementation checklist](auth-implementation-checklist.md)
- [Technical design](design_v01.md)

## 1. Locked decisions

| Decision | Choice |
|---|---|
| Mock mode | Development/demo only; live API is the production default |
| Run execution | Synchronous Python child process for this phase |
| Queue/progress | Redis/BullMQ and live progress remain post-feature work |
| Dataset storage | Local filesystem behind a storage adapter for now; object storage before deployment |
| Local uploads | Stored under `packages/backend/uploads/` and git-ignored |
| Email delivery | Password reset/email verification deferred until a provider is chosen |
| Engine | Add EMA, real holdout/OOS and robustness checks |
| AI | Add schema-constrained Gemini summaries with local fallback |
| Frontend architecture | Keep current context/fetch/useState while completing features; TanStack Query/RHF/CSS Modules migration is deferred to Phase 6 |

## 2. Current gaps

| Area | Current state | Missing |
|---|---|---|
| Live mode | Frontend defaults to `mockApi` unless `VITE_USE_MOCK_API=false` | Live default, mock only in development, mock removed from production bundle |
| Seed data | Backend reads `prototypes/02-mid-fi/mockData.json` | Backend-owned fixture |
| Shared contracts | Shared Zod schemas exist | Response validation and backend DTO serializers |
| Profiles (F1) | Backend CRUD exists | Profiles page, create/edit/delete/clone UI |
| Account (F8) | Login, refresh, logout, me | Registration UI, change password, password reset/email verification |
| Datasets (F2) | JSON `csvText` upload and local file storage | Multipart/presigned upload, progress, durable storage adapter |
| Runs (F3) | Synchronous execution | Cancellation, filters, pagination, retry |
| Experiment log (F4) | Run list and comparison | Filtering, pagination, richer error logs |
| Results (F5) | Equity curve, metrics, CSV export | PDF export, error-log tab, retry |
| Assistant (F6) | Gemini config parsing with local fallback | Gemini summary, clarification UI, response validation |
| Robustness (F7) | Heuristic warnings and synthetic OOS value | Real holdout/OOS, edge-of-grid detection, sample-size warnings |
| Engine | SMA only; EMA routed through SMA | EMA implementation, holdout evaluation |
| Tests | Auth/config/domain/bridge/pytest | Dataset/profile/run integration, frontend, E2E, load |

## 3. Phase 0 — Make live mode the default

### Frontend

- Change `packages/frontend/src/api/index.ts` to use the live API by default.
- Enable mock only with both:
  - `import.meta.env.DEV`
  - `VITE_USE_MOCK_API=true`
- Remove mock data and mock API from production bundles.
- Update `.env.example`, login copy and “Reset demo” visibility.

### Backend

- Move the seed fixture to `packages/backend/fixtures/mockData.json`.
- Keep `npm run seed` as optional demo data.
- Add a live smoke script:
  login → workspace → dataset upload → profile → run → results → comparison.

### Shared contracts

- Add response schemas for workspace, dataset, profile, run, error log and comparison.
- Normalize API dates to ISO strings in DTOs.
- Add `packages/backend/src/serializers/`:
  - `toUserDTO`
  - `toWorkspaceDTO`
  - `toDatasetDTO`
  - `toProfileDTO`
  - `toRunDTO`
  - `toErrorLogDTO`
- Validate serialized responses against shared schemas.
- Add response validation to the frontend API wrapper.

### Acceptance

- Live mode passes the browser smoke path.
- Production build contains no mock data path.
- Backend never returns raw Mongoose documents.
- Lint, typecheck, builds, Node tests and pytest pass.

## 4. Phase 1 — Profiles and account management

### F1 Profiles

- Add `ProfilesPage` with list, create, edit, delete and clone.
- Add profile navigation in the sidebar.
- Select a profile when launching a run.
- Use React Hook Form + `zodResolver` for the profile form if adopted in this phase; otherwise use the current form patterns.
- Add backend integration tests for owner scoping, duplicate names, invalid ranges and delete behavior.

### F8 Account

- Add a registration page.
- Add account menu/page: name, workspace, change password, sign out.
- Implement password change with refresh-session revocation.
- Add login audit events.
- Defer password reset and email verification until an email provider is selected; document the deferred state.

### Acceptance

- Registration, login, profile CRUD, profile clone and launch-from-profile work live.
- Password change revokes existing sessions.
- Profile endpoints are owner-scoped and tested.

## 5. Phase 2 — Dataset management

- Replace JSON `csvText` with multipart upload or presigned object-storage upload.
- Validate file size, MIME type, OHLCV columns, duplicate timestamps and date ordering.
- Add a storage adapter:
  - local filesystem for development
  - S3/R2 for deployment
- Add upload progress and validation feedback.
- Preview the first rows.
- Add retry for failed uploads.
- Define dataset deletion behavior when runs reference it.
- Add integration tests with a real CSV fixture.

### Acceptance

- A real CSV creates a durable dataset.
- Runs use the uploaded CSV through the Python engine.
- Invalid files fail with specific messages.
- Uploads survive restart when object storage is configured.

## 6. Phase 3 — Run lifecycle and UX

Keep synchronous execution in this phase.

### Cancellation

- Add `DELETE /api/runs/:id/cancel`.
- Track running Python child processes by run ID.
- Kill the child process and mark the run `failed` with `CANCELLED`.
- Add a “Cancel run” action for running runs.
- Provide a refresh/poll action for status.

### Run UX

- Add filters: status, dataset, strategy, date.
- Add pagination to runs and error logs.
- Add an error-log tab for failed runs.
- Add retry-failed-run.
- Add PDF export through browser print or a PDF library.
- Add CSV export tests.

### Acceptance

- Users can cancel a running job.
- Failed/cancelled runs show error codes, messages and logs.
- Lists are filterable and paginated.
- PDF export produces a real document.

## 7. Phase 4 — Engine and robustness

### EMA

- Add a real EMA momentum implementation.
- Pass `strategy_type` into the Python engine and select the implementation.
- Add engine tests proving EMA and SMA differ on the same data.

### Holdout/OOS

- Split data into train/holdout using `holdout_pct`.
- Optimize on train only.
- Compute out-of-sample Sharpe, return and drawdown.
- Replace the synthetic `out_of_sample_drop` with the real value.

### Robustness guard

- Detect edge-of-grid when the best parameter is at a range boundary.
- Report missing transaction costs.
- Report missing walk-forward validation.
- Add sample-size warnings.
- Derive confidence from actual warnings.

### Walk-forward

- Implement walk-forward only if feasible in this phase.
- Otherwise keep an explicit “not performed” warning and do not claim completion.

### Acceptance

- EMA and SMA produce different results.
- OOS metrics are real and reproducible.
- Robustness warnings reflect the actual run.
- Engine tests cover EMA, holdout and edge-of-grid.

## 8. Phase 5 — Gemini assistant completion

- Keep function-calling config parsing.
- Add schema-constrained Gemini summaries after completed runs.
- Return headline, key findings, caveats and trial count.
- Keep the local fallback when Gemini fails.
- Add a clarification UI when the assistant asks a question.
- Validate all AI output with shared schemas.
- Add quota/cost logging and keep the assistant rate limit.
- Never let the model invent metrics.

### Acceptance

- Parsing and summaries pass schema validation.
- Malformed AI output is rejected without creating a run.
- Fallback summary works during Gemini outages.

## 9. Phase 6 — Testing and quality

- Backend integration tests: datasets, profiles, runs, comparison, assistant, owner isolation.
- Frontend: Vitest + React Testing Library + `vitest-axe` for every page.
- E2E: Playwright login → upload → parse → run → results → compare → logout.
- Load tests: upload, run launch, run listing.
- OpenAPI documentation.
- Structured logs, request IDs, metrics and Sentry.
- CI: lint, typecheck, tests, builds, pytest and E2E.
- Frontend architecture migration after feature parity:
  - TanStack Query for server state
  - React Hook Form + Zod for forms
  - CSS Modules per component

## 10. Phase 7 — Deployment hardening

Tracked in [`production-plan.md`](production-plan.md):

- Vercel + Render/Railway + Atlas
- same-site cookie domains or reverse proxy
- object storage
- Redis/BullMQ
- WebSocket/SSE progress
- backups, monitoring, alerts and runbooks
- staging and production smoke tests

## 11. Recommended order

1. Live mode default + shared DTOs/serializers
2. Profiles + account
3. Dataset upload/storage
4. Engine EMA + holdout + robustness
5. Gemini summary
6. Run cancellation/progress UX
7. Frontend/E2E tests
8. Production deployment hardening

## 12. Out of scope for this plan

- Redis/BullMQ queue
- WebSocket/SSE live progress
- Object storage in the feature phase
- Email delivery for reset/verification
- Full frontend architecture refactor
- Broker integrations
- User-uploaded strategies

## 13. Verification

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run test:engine
```

Plus a live browser smoke test with `VITE_USE_MOCK_API=false`.
