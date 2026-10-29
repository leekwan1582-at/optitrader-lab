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
- Decouple parameter calculation: move `countCombinations` out of `mockApi` and into `packages/shared` so pages (e.g. `ExperimentStudioPage`) do not depend on mock modules.
- Ensure zero mock code in production: configure dynamic import or conditional Vite bundling so that `mockApi` and `mockData.json` are excluded from production bundles.
- Standardize dev API routing: default `API_URL` to relative `/api` in development to ensure requests pass through the Vite proxy and cookies (`HttpOnly`, `SameSite=Strict`) work seamlessly without CORS or domain configuration errors.
- Update UI elements: hide or disable "Reset demo" in live mode, update `.env.example`, and adjust login copy.

### Backend

- Move the seed fixture to `packages/backend/fixtures/mockData.json`.
- Keep `npm run seed` as optional demo data.
- Add an automated live smoke test script (`packages/backend/src/scripts/smoke.ts`, runnable via `npm run smoke`):
  setup test user → login → workspace bootstrap → dataset upload → profile creation → run execution → results retrieval → comparison → teardown.

### Shared contracts

- Move `countCombinations` pure utility to `packages/shared`.
- Add response schemas for workspace, workspace bootstrap (`WorkspaceBootstrapDTO`), dataset, profile, run, error log, and comparison.
- Normalize API dates to ISO strings in DTOs.
- Add `packages/backend/src/serializers/`:
  - `toUserDTO`
  - `toWorkspaceDTO`
  - `toWorkspaceBootstrapDTO` (including populated `profile_name`, `dataset_name`, and `symbol` on runs)
  - `toDatasetDTO`
  - `toProfileDTO`
  - `toRunDTO`
  - `toErrorLogDTO`
- Validate serialized responses against shared schemas before returning them to clients.
- Add typed runtime validation to `packages/frontend/src/api/client.ts` (`request<T>(path, schema, options)`), parsing all live responses against shared Zod schemas and handling API error payloads via `ApiErrorPayload`.

### Acceptance

- **Live Default:** Frontend connects to the live backend by default; mock mode is strictly opt-in (`VITE_USE_MOCK_API=true` and `DEV` only).
- **Bundle Isolation:** Production client build (`npm run build -w @optitrader/frontend`) contains zero references to `mockApi` or bundled mock datasets.
- **DTO Serialization & Zod Validation:**
  - Backend controllers pass all outputs through DTO serializers; no raw Mongoose documents, internal fields (`__v`), or un-serialized ObjectIds are returned.
  - Frontend `client.ts` validates all API responses against shared Zod schemas; malformed payloads raise structured errors.
- **Automated Smoke Test:** An end-to-end live smoke script (`npm run smoke`) completes the full flow (login → workspace bootstrap → upload → profile launch → results → comparison) against the live API.
- **UI State Consistency:** "Reset demo" action and demo notices are hidden or disabled when running in live mode.
- **Quality Gates:** `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:engine` all pass with zero errors.

## 4. Phase 1 — Profiles and account management

### F1 Profiles

- **Shared contracts & schemas (`packages/shared`):**
  - Update `createProfileSchema` and refine `updateProfileSchema`:
    - Omit immutable identifiers and ownership fields (`profile_id`, `_id`, `owner`) from update inputs.
    - Add `.refine()` validation to `updateProfileSchema` verifying `fast_ma.max < slow_ma.min` when parameter ranges are modified.
  - Update `runConfigSchema` to optionally accept `profile_id: z.string().trim().min(1).optional()`.
  - Add schema and error codes for profile conflicts (`409 DUPLICATE_KEY` / `PROFILE_NAME_IN_USE`).
- **Backend API & Data Layer (`packages/backend`):**
  - Add unique compound index `{ owner: 1, name: 1 }` on `Profile` with case-insensitive collation or normalized trimming.
  - Add `validateParams` middleware to validate `id` path parameters on profile routes.
  - Implement full CRUD in `profileController.ts` and `profileService.ts`:
    - Enforce owner scoping on all operations (`find`, `create`, `update`, `remove`).
    - Handle duplicate name errors with 409 responses.
    - Support cloning: allow cloning via client-side prefilled creation or `POST /api/profiles/:id/clone` with an incremented copy suffix (`Copy of ...`).
  - Update `launchRun` in `runService.ts`:
    - When `profile_id` is supplied, verify ownership and bind directly to that profile rather than auto-generating a new profile on each run.
    - If `profile_id` is omitted, generate an ad-hoc profile with collision-safe naming.
  - Define profile deletion referential integrity:
    - Retain historical backtests when a profile is deleted.
    - Fallback in `decorateRun` to `run.profile_snapshot?.name` (with a marker such as `[Deleted] <name>`) rather than generic `Unknown profile`.
  - Add backend integration tests covering: owner isolation, duplicate names, invalid ranges on both `POST` and `PUT`, cross-owner tampering attempts, and run snapshot stability after profile deletion.
- **Frontend (`packages/frontend`):**
  - Add `ProfilesPage` with responsive data table/grid, create modal, edit modal, delete confirmation, and clone action.
  - Add `/profiles` route to `App.tsx` and profile link (`02 Profiles`) to `Sidebar.tsx`.
  - Expand `ApiClient`, `realApi.ts`, `mockApi.ts`, and `AppContext.tsx` with complete profile operations (`getProfiles`, `createProfile`, `updateProfile`, `deleteProfile`, `cloneProfile`).
  - Update `ExperimentStudioPage`:
    - Add profile selection dropdown that pre-fills parameters and links the selected `profile_id` on run launch.
    - Add a "Save as Profile" action directly from the studio.
    - Support route navigation state passing a profile directly into the studio.

### F8 Account

- **Shared contracts & schemas (`packages/shared`):**
  - Add `changePasswordSchema` with `currentPassword`, `newPassword` (min 8, max 128 chars), and mismatch validation against `currentPassword`.
  - Add `updateAccountSchema` for updating display name and workspace metadata.
- **Backend API & Authentication (`packages/backend`):**
  - Add `POST /api/auth/register` client support and ensure `authLimiter` covers registration attempts.
  - Add `POST /api/auth/password` (protected by `requireAuth`, `originCheck`, and `authLimiter`):
    - Verify `currentPassword` using bcrypt.
    - Hash `newPassword` (12 rounds) and update user record.
    - Revoke all existing refresh sessions for the user (`revokeAllUserSessions`).
    - Issue fresh access and refresh session cookies immediately to the active client (preserving login state while invalidating all other devices/sessions).
  - Add account metadata management (`PATCH /api/auth/me` or `/api/workspace`):
    - Allow updating user name and workspace name.
    - When user or workspace name changes, synchronize `User` and `Workspace` documents and reissue the access token cookie to reflect updated claims in `jwtPayloadSchema`.
  - Structured login & security audit logging:
    - Emit structured `pino` audit logs (and optional MongoDB security events collection) for `register`, `login_success`, `login_failure`, `logout`, `password_changed`, and `refresh_reuse_detected`.
    - Strictly exclude passwords, plain tokens, or sensitive PII from audit logs.
  - Document deferred status: password reset via email and email verification remain deferred until a transactional email provider is integrated.
- **Frontend (`packages/frontend`):**
  - Add `RegisterPage` with form validation, link from `LoginPage`, and error handling for `EMAIL_IN_USE`.
  - Add `AccountPage` (or modal):
    - Display current user name, email, workspace details, and session status.
    - Profile details update form (name, workspace name).
    - Change password form with current password and new password confirmation.
    - Sign out action.
  - Expose `register`, `changePassword`, and `updateAccount` in `ApiClient`, `realApi.ts`, `mockApi.ts`, and `AppContext.tsx`.
  - Add route `/register` to public routes in `App.tsx` and link to account settings in the top bar user menu in `AppLayout.tsx`.

### Acceptance

- **Live Flow Parity:** Registration, login, profile CRUD, profile cloning, and launching runs from a selected profile operate end-to-end against the live API.
- **Profile Ownership & Validation:**
  - Profile endpoints strictly enforce owner scoping (`404` or `403` on cross-tenant access).
  - Both `POST /api/profiles` and `PUT /api/profiles/:id` reject invalid ranges (`fast_ma.max >= slow_ma.min`) and return structured validation errors.
  - Duplicate profile names for the same owner are rejected with `409 DUPLICATE_KEY`.
  - Deleting a profile does not corrupt historical run metrics or crash run views; runs display the snapshotted profile name.
- **Run-to-Profile Binding:** Launching a run with a selected profile preserves `run.profile_id` without generating duplicate profile records.
- **Password Security & Session Invalidation:**
  - Incorrect current password returns `401 INVALID_CREDENTIALS`.
  - Changing password revokes all prior refresh sessions; old refresh tokens fail rotation (`401 REFRESH_INVALID` / `REFRESH_REUSED`).
  - The password change endpoint is rate-limited.
- **Security Auditing:** Authentication and credential modification events log structured audit events without leaking secrets or passwords.
- **UI & Accessibility:**
  - `ProfilesPage`, `RegisterPage`, and `AccountPage` satisfy WCAG touch targets (>= 44x44px / 2.75rem) and pass `vitest-axe` checks.
- **Quality Gates:** `npm run lint`, `npm run typecheck`, and `npm test` pass across touched packages (`shared`, `backend`, `frontend`).

## 5. Phase 2 — Dataset management

### Storage Architecture & Protocol

- **Storage Adapter Interface (`packages/backend`):**
  - Define a unified `DatasetStorageAdapter` interface:
    - `save(datasetId: string, streamOrBuffer: Buffer | NodeJS.ReadableStream): Promise<{ fileRef: string; checksum: string }>`
    - `getLocalPath(fileRef: string): Promise<string>` (ensures a local file path is available for the Python engine child process)
    - `getStream(fileRef: string): Promise<NodeJS.ReadableStream>`
    - `delete(fileRef: string): Promise<void>`
    - `exists(fileRef: string): Promise<boolean>`
  - Implement `LocalStorageAdapter` for development and production default:
    - Saves uploaded files persistently under `packages/backend/uploads/{owner}/` (git-ignored), partitioning directory trees by owner to prevent flat-directory performance degradation, `ls`/file-glob slowdowns, and OS inode/directory file limits.
    - Datasets remain permanently available for repeated, concurrent backtest runs across experiments; files are never discarded after an execution.
    - Resolves and returns the persistent local file path directly to `runBacktest` without re-copying.
  - Provide an S3/R2 storage adapter contract/stub with local cache synchronization for future cloud deployment (Phase 7) to eliminate single-disk storage and inode limits at scale.
  - Deprecate and remove silent synthetic data generation (`buildSyntheticCsv`); missing dataset files must throw explicit errors.

### Multipart Upload & Validation Pipeline

- **Shared Contracts (`packages/shared`):**
  - Update `uploadDatasetSchema` and add `datasetMetadataSchema` for multipart fields: `name` (1–120 chars), `symbol` (1–24 chars), and `timeframe` (1–12 chars).
  - Add `datasetPreviewSchema` and `datasetPreviewResponseSchema`: array of 5–10 OHLCV rows (`{ timestamp: string, open: number, high: number, low: number, close: number, volume: number }`).
  - Add specific error codes to `errorCodeSchema`: `FILE_TOO_LARGE`, `INVALID_CSV_HEADERS`, `INVALID_PRICE_VALUES`, `TIMESTAMPS_NOT_ORDERED`, `DATASET_IN_USE`.
- **Backend API & Middleware (`packages/backend`):**
  - Add a multipart upload middleware (e.g. `multer`) on `POST /api/datasets`:
    - File size cap: 50MB.
    - Allowed MIME types: `text/csv`, `text/plain`, `application/vnd.ms-excel`.
  - Stream-based CSV validator:
    - Validate header row for required case-insensitive columns: `timestamp, open, high, low, close, volume`.
    - Check timestamp validity and strictly verify chronological order (ascending timestamps).
    - Reject duplicate timestamps with line number details.
    - Validate price sanity (`open, high, low, close > 0`, `high >= low`, `high >= open`, `high >= close`, `volume >= 0`).
    - Compute total row count, start date, end date, and SHA-256 checksum in a single streaming pass.
  - Add `GET /api/datasets/:id/preview` returning the first 10 validated rows and summary metadata.
  - Deletion referential integrity on `DELETE /api/datasets/:id`:
    - Query `Run` collection for any runs referencing `dataset_id`.
    - If active or completed runs exist, reject deletion with `409 DATASET_IN_USE` (or provide soft-delete archiving that hides the dataset from new experiment selectors while preserving CSV data on disk for historical runs).

### Frontend UX & Upload Pipeline (`packages/frontend`)

- **Upload Pipeline & Progress:**
  - Replace raw `file.text()` string loading with `FormData` multipart upload.
  - Implement real upload progress using `XMLHttpRequest` (or Axios) to drive a visible Bootstrap progress bar during upload.
  - Surface actionable validation errors (e.g. "Row 412: timestamp out of order" or "Missing columns: high, volume") in an accessible alert region.
  - Add a direct "Retry upload" button on failed network or validation attempts.
- **Dataset Preview Modal / Drawer:**
  - Add a "Preview" action to `DatasetsPage` data table rows opening a modal with the first 10 rows formatted in a clean, scrollable table.
- **Client & Context Updates:**
  - Update `ApiClient`, `realApi.ts`, `mockApi.ts`, and `AppContext.tsx` to support `uploadDataset(formData: FormData, onProgress?: (pct: number) => void)` and `getDatasetPreview(datasetId: string)`.

### Acceptance

- **Durable File Storage:** A real CSV upload persists to the configured storage adapter; server restarts do not corrupt or lose the dataset file.
- **Engine Execution:** Backtest runs launched from the uploaded dataset successfully load the physical CSV file in the Python engine process and execute without fallback to synthetic data.
- **Owner Scoping:** Dataset routes (`GET /api/datasets`, `POST /api/datasets`, `GET /api/datasets/:id/preview`, `DELETE /api/datasets/:id`) are strictly owner-scoped and reject cross-owner access with `404` or `403`.
- **Validation Gates:**
  - Files larger than 50MB are rejected with `413` / `FILE_TOO_LARGE`.
  - CSVs missing any OHLCV header are rejected with `422` / `INVALID_CSV_HEADERS`.
  - Non-chronological or duplicate timestamps are rejected with specific line-numbered error messages.
  - Non-positive or corrupt price values (`high < low`) are rejected with `422` / `INVALID_PRICE_VALUES`.
- **Preview & Feedback:** The first rows preview endpoint returns valid OHLCV records and displays accurately in the frontend preview modal.
- **Referential Integrity:** Deleting a dataset that is referenced by existing runs is rejected (`409 DATASET_IN_USE`) or safely archived without breaking historical backtest logs or deleting needed CSV files.
- **Accessibility & Quality Gates:** `DatasetsPage` passes `vitest-axe` checks, upload controls maintain >= 44x44px touch targets, and `npm run lint`, `npm run typecheck`, and `npm test` pass.

## 6. Phase 3 — Run lifecycle and UX

Keep synchronous execution in this phase (Redis/BullMQ queue remains in Phase 7).

### Cancellation & Process Management

- **Process Registry & Lifecycle (`packages/backend`):**
  - Implement an in-memory `ProcessRegistry` tracking active Python child processes by `run_id`:
    - Register process upon spawn; unregister upon process exit or error.
    - Provide `cancel(runId: string, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<boolean>`.
    - Implement process reaping on Node server shutdown (`process.on('SIGTERM')`, `process.on('SIGINT')`) to prevent orphaned Python processes.
  - Client Disconnect & Abort Handling:
    - Listen to `req.on('close')` on `POST /api/runs`: if the client drops connection or aborts request via `AbortController`, automatically trigger process cancellation.
  - Endpoints & State Updates:
    - Add `POST /api/runs/:id/cancel` (owner-scoped, protected by `requireAuth` and `originCheck`).
    - Terminate child process (send `SIGTERM` with a 2-second timeout before `SIGKILL`).
    - Mark run `status: 'failed'`, set `error_code: 'CANCELLED'`, and record duration.
    - Append cancellation audit record to `ErrorLog`.
- **Frontend Cancellation UX (`packages/frontend`):**
  - Add `AbortController` support to `launchRun` in `client.ts` and `AppContext.tsx`.
  - In `ExperimentStudioPage` launch modal / progress state, expose a responsive "Cancel run" button that triggers `abortController.abort()` and calls `POST /api/runs/:id/cancel`.
  - Provide a manual status refresh action for active jobs.

### Run Querying, Filtering & Pagination

- **Shared Contracts (`packages/shared`):**
  - Define `runFilterQuerySchema`: `page` (default 1), `limit` (default 10, max 100), `status`, `dataset_id`, `strategy_type`, `from` (ISO date), `to` (ISO date).
  - Define `errorLogQuerySchema`: `page`, `limit`, `experiment_id`, `severity`, `from`, `to`.
  - Define generic `paginatedResponseSchema<T>`: `{ items: T[]; total: number; page: number; pageSize: number; totalPages: number }`.
- **Backend API & Database Indexing (`packages/backend`):**
  - Update `GET /api/runs` and `GET /api/error-logs` to validate query parameters with Zod and return paginated envelopes.
  - Add compound indexes in `Run` model:
    - `{ owner: 1, created_at: -1 }`
    - `{ owner: 1, status: 1, created_at: -1 }`
    - `{ owner: 1, dataset_id: 1, created_at: -1 }`
    - `{ owner: 1, strategy_type: 1, created_at: -1 }`
  - Add compound indexes in `ErrorLog` model:
    - `{ owner: 1, timestamp: -1 }`
    - `{ owner: 1, experiment_id: 1, timestamp: -1 }`
- **Frontend Data Views (`packages/frontend`):**
  - Update `DashboardPage` recent experiments table with filter dropdowns (status, dataset, strategy) and pagination controls (`Previous`, page numbers, `Next`).
  - Update `activity feed` to query paginated logs.

### Diagnostics, Error Logs & Retry

- **Run Diagnostics Endpoint:**
  - Add `GET /api/runs/:id/logs` returning run-specific error logs, stderr traces, execution duration, and parameter context.
- **Results Page Error Log Tab:**
  - Add tabbed layout in `ResultsPage`:
    - Tab 1: **Analytics & Equity Curve** (for completed runs).
    - Tab 2: **Diagnostic Logs & Trace** (displays full error codes, Python stderr trace, and failure timestamps for failed/cancelled runs).
- **Immutable Run Retry:**
  - Add a "Retry run" action on failed or cancelled runs:
    - Preserves audit immutability by creating a **new** run with identical configuration (linking back via `retried_from: failedRunId`) rather than mutating historical records.
    - Expose via `POST /api/runs/:id/retry` or prefill studio workflow via `cloneRun`.

### Export Formats

- **PDF Export:**
  - Lock standard implementation to dedicated print stylesheet (`@media print`) and clean executive report layout triggered by `window.print()`.
  - Ensures zero bloat from heavy headless browser/canvas dependencies while rendering vector equity curves and metrics cleanly for download as PDF.
- **CSV Export:**
  - Expand CSV export to include both the equity curve and an executive metadata header block (run ID, symbol, strategy, Sharpe ratio, total return, max drawdown, trades).
  - Add comprehensive unit and integration tests for CSV generation and download.

### Acceptance

- **Cancellation & Process Reaping:**
  - Cancelling an active run terminates the underlying Python OS child process and frees worker resources within 2 seconds.
  - Cancelled runs persist with `status: 'failed'`, `error_code: 'CANCELLED'`, and accurate elapsed duration.
  - Dropping the client connection during execution triggers automatic worker termination.
- **Owner Isolation:** Cancellation, retry, and log queries strictly verify ownership; cross-tenant attempts return `404` or `403`.
- **Filtering & Pagination:**
  - `GET /api/runs` and `GET /api/error-logs` filter accurately across combinations of status, dataset, strategy, and date bounds.
  - Pagination boundary conditions (first page, last page, empty pages, out-of-bounds page requests) return accurate totals and structured metadata.
- **Diagnostics & Audit Trail:**
  - Failed runs display actionable error messages and stderr traces under the Diagnostics tab in `ResultsPage`.
  - Retrying a run creates a new audit-tracked experiment without mutating the failed run record.
- **Export Verification:**
  - CSV export generates a valid, well-formatted CSV with both metadata headers and equity curve data points.
  - Print / PDF export triggers clean printable layout omitting navigation chrome.
- **Accessibility & Quality Gates:**
  - All new filter selects, pagination buttons, tabs, cancel controls, and retry actions maintain >= 44x44px touch targets and pass `vitest-axe`.
  - `npm run lint`, `npm run typecheck`, and `npm test` pass.

## 7. Phase 4 — Engine and robustness

### Strategy Engine & Objectives (`packages/backend/engine/`)

- **EMA Momentum Implementation:**
  - Implement `run_ema_momentum(df, config)` in `backtest.py`:
    - Calculate exponential moving averages via `vbt.MA.run(close, window=windows, ewm=True)`.
    - Long entry when `fast_ema.ma_crossed_above(slow_ema)`.
    - Long exit when `fast_ema.ma_crossed_below(slow_ema)`.
  - Strategy Dispatcher:
    - Register supported strategies (`sma_crossover`, `ema_momentum`) in a dispatcher mapping.
    - Dispatch based on `config.get('strategy_type', 'sma_crossover')`.
  - Calmar Ratio & Objective Selection:
    - Support all objectives defined in `objectiveSchema`: `sharpe` (`pf.sharpe_ratio()`), `total_return` (`pf.total_return()`), and `calmar` (`pf.calmar_ratio()`).

### In-Sample / Out-of-Sample (OOS) Holdout Pipeline

- **Continuous Indicator Warm-up & Train/Holdout Slicing:**
  - Inside `backtest.py`, split chronologically based on `holdout_pct` (e.g. 0.2 -> 80% train / In-Sample, 20% test / Out-of-Sample).
  - Compute moving average indicators over the full continuous series to prevent `NaN` warm-up distortion on the holdout boundary.
  - Parameter optimization runs strictly on In-Sample (IS) data: select the best parameter combination based on the chosen objective subject to the drawdown limit.
  - Out-of-Sample (OOS) evaluation: evaluate the winning parameter set on the unseen holdout slice to produce genuine out-of-sample metrics (`oos_sharpe`, `oos_total_return`, `oos_max_drawdown`).
- **Real Out-of-Sample Degradation:**
  - Replace the synthetic heuristic formula in `runService.ts` with the real relative Sharpe performance drop:
    $$\text{out\_of\_sample\_drop} = \frac{\text{Sharpe}_{\text{OOS}} - \text{Sharpe}_{\text{IS}}}{\max(|\text{Sharpe}_{\text{IS}}|, 0.001)}$$
  - Store OOS metrics in `robustnessSchema` (`packages/shared`) and expose them on `ResultsPage`.

### Robustness Guard & Calibrated Confidence Scoring

- **Edge-of-Grid Detection:**
  - Detect if winning parameters hit the search boundary:
    `best_fast == fast_ma.min || best_fast == fast_ma.max || best_slow == slow_ma.min || best_slow == slow_ma.max`.
  - Set `edge_of_grid: true` and push warning: `"Best parameter combination lies on the grid boundary (fast=${fast}, slow=${slow}); expand parameter bounds."`
- **Sample-Size Warnings:**
  - Check dataset length (`rows < 500` -> `"Dataset sample size is small (< 500 bars); risk of statistical noise."`).
  - Check total trade count of the winning strategy (`trades < 30` -> `"Strategy generated fewer than 30 trades; statistically insufficient for robust evaluation."`).
- **Calibrated Confidence Score Model:**
  - Derive `confidence_score` dynamically from validated risk factors:
    - Base score: `10.0`
    - Edge-of-grid detected: `-1.5`
    - Severe OOS degradation (`out_of_sample_drop < -0.30`): `-2.0`
    - Low trade count (`trades < 30`): `-2.0`
    - Transaction costs omitted (`transaction_costs == 0`): `-1.5`
    - Over-fitting penalty (`trials > 300` without walk-forward): `-1.0`
    - Clamped strictly between `1.0` and `9.9` with 1 decimal precision.
- **Walk-Forward Validation Status:**
  - Lock decision: Defer multi-window rolling walk-forward optimization to Phase 7.
  - In Phase 4, keep `walk_forward_completed: false` with the explicit audit warning: `"Walk-forward validation not performed; results subject to non-stationary regime risk"`.

### Acceptance

- **Strategy Engine Parity:**
  - Backtests configured with `strategy_type: 'ema_momentum'` execute without error and produce measurably different trade counts, equity curves, and performance metrics compared to `sma_crossover` on identical datasets and parameter grids.
  - All three objectives (`sharpe`, `total_return`, `calmar`) optimize and pick the respective maximizing parameter pair.
- **True Holdout Evaluation:**
  - Optimization is performed exclusively on the In-Sample slice.
  - OOS metrics (`oos_sharpe`, `oos_total_return`, `oos_max_drawdown`) and `out_of_sample_drop` are 100% calculated from real holdout data, with zero random synthetic generation.
- **Robustness Warnings & Scoring:**
  - Parameters at the edge of the grid reliably trigger `edge_of_grid: true` and the boundary warning.
  - Runs with `< 30` trades trigger sample-size warnings.
  - Confidence score reflects exact deductions from active warnings.
- **Test Suite Coverage:**
  - Pytest suite (`pytest packages/backend/engine/tests/`) covers EMA execution, Calmar optimization, train/holdout splitting, and edge-of-grid detection.
  - Node.js bridge tests (`npm test -w @optitrader/backend`) verify that the updated JSON output conforms to the shared schema.
  - `npm run test:engine`, `npm test`, `npm run lint`, and `npm run typecheck` pass.

## 8. Phase 5 — Gemini assistant completion

### Config Parsing & Interactive Clarification (`packages/backend` & `packages/frontend`)

- **Function-Calling & Structured Extraction:**
  - Retain Gemini tool declaration (`create_optimization_config`) for prompt extraction in `assistantService.ts`.
  - When required parameters (dataset, objective, strategy) are ambiguous, instruct Gemini to ask a focused clarifying question instead of guessing.
- **Interactive Clarification UX (`ExperimentStudioPage`):**
  - Replace the passive info alert with an interactive clarification widget when `parsed.clarification` is returned.
  - Render an inline reply input allowing the user to provide clarifying details without re-entering the entire initial prompt.
  - Surface contextual quick-choice pills (e.g., choice between detected datasets, or "Maximize Sharpe" vs. "Maximize Total Return") that append user intent and re-trigger parsing.

### Schema-Constrained Run Summaries & Grounding Guardrails

- **Structured Output Generation:**
  - Implement Gemini summary generation in `assistantService.ts` called after backtest completion.
  - Use `@google/genai` native JSON Structured Outputs (`responseMimeType: 'application/json'` and `responseSchema` mapped from `aiSummarySchema`).
  - Pass the exact completed run context as immutable ground truth: strategy type, dataset symbol/timeframe, tested combinations count, best parameter combination (`fast_ma`, `slow_ma`), performance metrics (Sharpe ratio, total return, max drawdown, trades, win rate), real holdout OOS drop, and active robustness warnings.
- **Anti-Hallucination & Metric Guarding:**
  - Enforce strict factual grounding: instruct the model to interpret behavior rather than inventing numbers.
  - Deterministic headline guardrail: generate the factual metric headline programmatically in the backend (or validate via regex against real backtest values within a 1% tolerance), letting Gemini generate the qualitative synthesis for `key_findings` and `caveats`.
  - If schema validation fails or invented metrics are detected, discard the hallucinated text and automatically apply the deterministic fallback summary.
- **Failure Isolation & Graceful Degradation:**
  - Gemini outages, quota limits (429), or timeouts must **never fail the backtest run**.
  - Wrap Gemini summary calls in a protective try-catch: on error, log a warning and return the deterministic template summary (`buildSummary`), marking `source: 'fallback'`.

### Telemetry, Rate Limiting & Token Logging

- **Usage & Cost Telemetry:**
  - Capture `response.usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) from both parsing and summary calls.
  - Emit structured `pino` audit logs for each LLM call: `{ model, promptTokens, completionTokens, totalTokens, durationMs, latencyMs, source: 'gemini' }`.
- **Rate Limiting & Safety:**
  - Retain `assistantLimiter` (20 requests / 15 min) on public prompt parsing routes.
  - Handle quota exhaustion errors gracefully with user-friendly warnings and automatic fallback to local parsing/summarizing.

### Acceptance

- **Schema Conformance:** All AI-generated configurations and summaries strictly validate against `parsedConfigSchema` and `aiSummarySchema` before consumption.
- **Anti-Hallucination Guard:** Metrics reported in run summaries strictly reflect the actual computed backtest values; invented or ungrounded statistics are rejected.
- **Graceful Fault Tolerance:** When Gemini is disabled, rate-limited, or encounters API errors/timeouts, prompt parsing and run summaries fall back to local deterministic engines without aborting runs or returning 500 errors.
- **Interactive Clarification:** Ambiguous optimization prompts trigger the clarification widget in `ExperimentStudioPage`, allowing users to respond inline or select quick-choice options.
- **Auditing & Telemetry:** Token usage metadata and latency metrics are recorded in structured logs for every Gemini interaction.
- **Quality Gates:** `npm run lint`, `npm run typecheck`, and `npm test` pass.

## 9. Phase 6 — Testing and quality

### Test Infrastructure & Automated Harness (`packages/`)

- **Frontend Unit & Component Testing:**
  - Install and configure Vitest, `@testing-library/react`, `jsdom`, and `vitest-axe` in `packages/frontend`.
  - Add page-level tests for every page (`LoginPage`, `RegisterPage`, `AccountPage`, `DashboardPage`, `DatasetsPage`, `ProfilesPage`, `ExperimentStudioPage`, `ResultsPage`, `ComparisonPage`).
  - Enforce `vitest-axe` accessibility assertions on all page-level tests; fail CI on any accessibility violations.
  - Query elements strictly by role, accessible label, or semantic attributes per `AGENTS.md`.
- **Backend Integration Tests (`packages/backend/test/`):**
  - Add Supertest + `mongodb-memory-server` suites covering:
    - User registration, login, cookie issuance, token rotation, reuse detection, and session revocation.
    - Owner isolation on datasets, profiles, runs, and error logs (assert cross-tenant requests return 404/403).
    - Multipart dataset upload, validation failure cases (file size, corrupted columns, out-of-order dates), and preview generation.
    - Profile CRUD, duplicate name rejection, range boundary validation, and run linkage.
    - Backtest execution, cancellation signals, process reaping, and diagnostic logs.
- **End-to-End (E2E) Testing (Playwright):**
  - Setup Playwright at repository root (`tests/e2e/`) with `npm run test:e2e`.
  - Implement full E2E user workflow against isolated test environment:
    Register -> Log in -> Upload CSV dataset -> Parse optimization prompt with assistant -> Launch backtest -> Review equity curve & robustness metrics -> Save profile -> Clone configuration -> Compare runs -> Change password -> Log out.
- **Load & Performance Testing:**
  - Configure `autocannon` or `k6` load test scripts under `packages/backend/test/load/`:
    - Benchmark read endpoints (`GET /api/runs`, `GET /api/datasets`, `GET /api/profiles`) sustaining >= 50 req/sec with p95 < 200ms.
    - Test concurrent upload and run launch rate limiting under load.

### Observability, OpenAPI & Sentry

- **Structured Logging & Request Correlation:**
  - Implement request ID correlation middleware in `packages/backend` using `crypto.randomUUID()`.
  - Attach `X-Request-Id` to all HTTP responses and bind `requestId` and `userId` to `pino` child loggers.
  - Ensure zero sensitive fields (passwords, tokens, cookies, PII) are logged.
- **OpenAPI 3.1 Documentation:**
  - Generate OpenAPI 3.1 documentation directly from `packages/shared` Zod schemas (using `@asteasolutions/zod-to-openapi` or `zod-openapi`) to prevent documentation drift.
  - Expose interactive documentation at `GET /api/docs` and raw spec at `GET /api/docs/openapi.json`.
- **Error Tracking (Sentry):**
  - Integrate `@sentry/node` (backend) and `@sentry/react` (frontend) with sanitized environment contexts and error boundaries.

### Continuous Integration (CI)

- **GitHub Actions (`.github/workflows/ci.yml`):**
  - Matrix/pipeline on pull requests and main branch:
    - Node.js 24 LTS and Python 3.11 setup with dependency caching.
    - Linting: `npm run lint` (`eslint` across all workspaces).
    - Formatting check: `npm run format:check`.
    - Typecheck: `npm run typecheck` (`tsc --noEmit` across `shared`, `backend`, `frontend`).
    - Unit & Integration Tests: `npm test` (backend integration and frontend vitest).
    - Engine Pytest: `npm run test:engine` (`pytest packages/backend/engine/tests/`).
    - Builds: `npm run build` (shared, backend, frontend).
    - End-to-End Tests: `npm run test:e2e` (Playwright headless).

### Frontend Architecture Migration (Post-Parity Refactoring)

Execute in strict sequence only after all tests pass:
1. **Forms Refactoring:**
   - Migrate forms to `react-hook-form` with `@hookform/resolvers/zod`, directly reusing Zod schemas from `packages/shared`.
2. **Server State Migration:**
   - Migrate server data fetching from `AppContext` / `useState` to `@tanstack/react-query`.
   - Implement query caching, automatic revalidation, and optimistic UI mutations for profiles and datasets.
   - Retain `AppContext` exclusively for user authentication and session context.
3. **CSS Modules & Touch Target Enforcement:**
   - Convert component styling to scoped CSS Modules (`ComponentName.module.css`).
   - Enforce minimum 44x44px (`2.75rem`) interactive touch targets across all buttons and inputs in a shared module per `AGENTS.md`.

### Acceptance

- **Coverage & Harness:**
  - Every page component has a corresponding test suite executing `vitest-axe` with zero accessibility violations.
  - Backend integration tests achieve complete coverage of all route handlers, authentication edge cases, and owner-scoping boundaries.
- **End-to-End Reliability:**
  - Playwright E2E suite reliably completes the full end-to-end user journey in headless CI without flakiness.
- **Performance Benchmarks:**
  - Read endpoints sustain >= 50 req/sec with p95 < 200ms under load testing.
- **Observability Standards:**
  - All incoming requests carry an `X-Request-Id` header reflected in structured `pino` logs without leaking credentials or tokens.
  - Interactive OpenAPI documentation matches live API behavior.
- **Architecture Migration Fidelity:**
  - Migrating to TanStack Query, React Hook Form, and CSS Modules introduces zero functional regressions, passing all existing tests.
- **CI Quality Gate:**
  - The complete CI pipeline (`lint`, `format:check`, `typecheck`, `test`, `test:engine`, `build`, `test:e2e`) runs green.

## 10. Phase 7 — Deployment hardening

Detailed architecture tracked in [`production-plan.md`](production-plan.md).

### Containerization & Infrastructure Topology

- **Dual-Runtime Containerization (`packages/backend/Dockerfile`):**
  - Standardize on **Node.js 24 LTS and Python 3.11** (aligning with root `engines` and `AGENTS.md`).
  - Multi-stage Docker build:
    - Stage 1: Build TypeScript packages (`shared`, `backend`).
    - Stage 2: Create hardened production image, install Python requirements (`vectorbt`, `pandas`, `numpy`) in a dedicated virtualenv, copy compiled `dist/`, and run under unprivileged user (`USER node`).
  - Expose container health check directive targeting `GET /api/health`.
- **Target Platform Topology:**
  - Frontend: Vercel (static React + Vite build).
  - API & Workers: Render or Railway running dual-runtime container.
  - Database: MongoDB Atlas (M10+ tier with automatic daily backups, connection pooling, and replica sets).
  - Cache & Queue: Managed Redis (Upstash or Redis Cloud) with TLS.
  - Object Storage: AWS S3 or Cloudflare R2 for durable dataset CSV storage.

### Production Routing, Cookie Auth & Security Hardening

- **Same-Site Cookie Architecture:**
  - Deploy under unified parent domain with same-site subdomains:
    - Frontend: `https://app.optitrader.dev`
    - API: `https://api.optitrader.dev`
    - Environment: `COOKIE_DOMAIN=.optitrader.dev`, `Secure=true`, `SameSite=Strict`.
  - Alternatively, use Vercel reverse proxy rewrites (`/api/:path*` -> Render origin) to keep single-origin simplicity.
- **Security & Perimeter Defense:**
  - Mount `helmet` middleware with strict Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and frameguard.
  - Replace in-memory rate limiters with distributed Redis rate limiting (`rate-limit-redis`) across all auth and assistant routes.
  - Configure strict CORS allowlist restricted to verified frontend domains with `credentials: true`.

### Asynchronous Queue & Live Progress (Redis / BullMQ / WebSockets)

- **Job Queue Architecture (BullMQ):**
  - Decouple `POST /api/runs` from synchronous child process execution:
    - `POST /api/runs` validates payload, creates run document (`status: 'queued'`), pushes job to `backtest-queue`, and responds immediately with `202 Accepted` and `{ run_id, status: 'queued' }`.
    - Dedicated worker process pulls from `backtest-queue`, spawns the Python engine, streams real-time iteration counts, and writes final results to MongoDB upon completion.
    - Worker crash resilience: BullMQ auto-retries transient failures; unhandled worker crashes mark run `status: 'failed'` with code `WORKER_CRASHED`.
- **WebSocket Live Progress Protocol (`packages/backend` & `packages/shared`):**
  - Implement WebSocket server authenticated via `ot_access` HttpOnly cookie during handshake.
  - Emit real-time progress events defined in `packages/shared/src/ws.ts` (`RUN_STARTED`, `RUN_PROGRESS` with completed trial counts, `RUN_COMPLETED`, `RUN_FAILED`).
  - Implement 30-second ping/pong heartbeat dropping stale sockets, with client auto-reconnect using exponential backoff and jitter.

### Durable Cloud Storage & Worker Cache (S3 / R2)

- **Cloud Object Storage Adapter:**
  - Implement `S3StorageAdapter` using `@aws-sdk/client-s3` for dataset persistence.
  - Worker Local Cache: Worker nodes stream requested CSVs from S3/R2 into a local `/tmp/optitrader-cache/` directory with SHA-256 validation before launching `backtest.py`.
  - Cache lifecycle: LRU cache cleanup ensures ephemeral container storage is never exhausted.

### Disaster Recovery, Operations & Smoke Testing

- **Database Migrations & Backup Runbook:**
  - Add database migration runner (`migrate-mongo`) for schema evolution.
  - Document database point-in-time recovery (PITR) and disaster restore runbooks in `docs/runbooks/disaster-recovery.md`.
- **Automated Staging & Production Smoke Suite:**
  - Add automated post-deployment smoke test script (`packages/backend/src/scripts/smoke.ts`, runnable via `npm run smoke:prod`):
    - Tests live HTTPS cookie exchange.
    - Uploads CSV to S3/R2.
    - Enqueues backtest job and asserts WebSocket progress events until completion.
    - Validates results and cleans up test artifacts.

### Acceptance

- **Dual-Runtime Container Integrity:** The production Docker container builds cleanly on Node 24 and Python 3.11, passes health checks, and executes without root privileges.
- **Asynchronous Execution & Streaming:**
  - `POST /api/runs` responds in < 300ms with `202 Accepted`.
  - WebSockets establish authenticated sessions over cookies and stream live progress updates during optimization without dropped connections.
- **Storage Durability & Cache:** Datasets persist in S3/R2; worker nodes successfully pull, cache, and execute datasets without missing files after container restarts.
- **Production Cookie Security:** Cookies are issued with `Secure`, `HttpOnly`, `SameSite=Strict`, and verified across configured subdomains without CORS or credential rejection.
- **Queue Fault Tolerance:** Killing a worker container during backtest execution is caught by BullMQ, freeing the queue and updating the run status to `failed` (`WORKER_CRASHED`) without hanging the UI.
- **Staging Verification:** The automated post-deployment smoke script (`npm run smoke:prod`) completes end-to-end on the live staging environment.

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
