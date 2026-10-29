Analyzed feature-plan.md:L46-85
Analyzed index.ts:L1-13
Analyzed realApi.ts:L1-60
Analyzed client.ts:L1-50
Ran list shared source files
Analyzed runRoutes.ts:L1-15
Analyzed runController.ts:L1-40
Ran search countCombinations usages
Ran search mock references in frontend

Here is the targeted analysis of **Phase 0 — Make live mode the default** from [`docs/feature-plan.md`](file:///home/leekwan/code/optitrader-lab/docs/feature-plan.md#L46-L84), breaking down the gaps, logic errors, and missing prerequisites:

---

### 1. Code Coupling & Logic Errors

1. **`countCombinations` is imported from `mockApi`**
   - **The issue:** [`packages/frontend/src/api/index.ts`](file:///home/leekwan/code/optitrader-lab/packages/frontend/src/api/index.ts#L9) does `export { countCombinations } from './mockApi'`, and [`ExperimentStudioPage.tsx`](file:///home/leekwan/code/optitrader-lab/packages/frontend/src/pages/ExperimentStudioPage.tsx#L19) imports it directly from `../api/index`.
   - **Consequence:** If mock data/mock API is pruned or excluded from production builds, `ExperimentStudioPage` breaks at build or runtime.
   - **Correction needed:** `countCombinations` is pure parameter-math logic (`(stop - start) / step + 1`). It already exists in `packages/backend/src/utils/combinations.ts` and should be moved into `packages/shared` so both frontend and backend share it cleanly without touching `mockApi`.

2. **Static Bundling Defeats "Remove Mock from Production"**
   - **The issue:** In [`packages/frontend/src/api/index.ts`](file:///home/leekwan/code/optitrader-lab/packages/frontend/src/api/index.ts#L1-L2), `import * as mockApi from './mockApi'` is a top-level static import. `mockApi.ts` in turn statically imports `rawSeed from '../data/mockData.json'`.
   - **Consequence:** Regardless of `import.meta.env.VITE_USE_MOCK_API`, Vite’s bundler will bundle `mockApi.ts` and the entire JSON fixture into production assets unless conditional/dynamic imports or Vite virtual modules/tree-shaking are used.
   - **Correction needed:** The plan should specify using a Vite build alias/plugin, dynamic `await import()`, or build-time replacement to guarantee zero mock code in production chunks.

3. **In-Memory UI State in `AppLayout.tsx` vs. Backend Live State**
   - **The issue:** The sidebar / header has a "Reset demo" button (`handleResetDemo` in [`AppLayout.tsx`](file:///home/leekwan/code/optitrader-lab/packages/frontend/src/components/AppLayout.tsx#L40)). In mock mode, this resets in-memory objects. In live mode, what does it do? If it calls `mockApi.reset()`, it has no effect on MongoDB; if it stays visible, it confuses users.
   - **Correction needed:** Phase 0 must specify hiding/disabling "Reset demo" in live mode (or making it conditionally render only when `apiMode === 'mock'`).

---

### 2. Missing Shared Contracts & DTO Gaps

4. **Missing Workspace Bootstrap Contract & Endpoint Serializer**
   - **The issue:** Phase 0 lists serializers for `User`, `Workspace`, `Dataset`, `Profile`, `Run`, and `ErrorLog`. But the live frontend currently calls:
     - `GET /workspace` (returns datasets, profiles, runs, and workspace metadata together as `WorkspaceBootstrap`)
     - `realApi.ts` currently runs `decorateRuns(runs, profiles, datasets)` on the client because raw Mongoose runs are missing populated fields (`profile_name`, `dataset_name`, `symbol`).
   - **Correction needed:**
     - Add `workspaceBootstrapDTO` and serializer `toWorkspaceBootstrapDTO`.
     - Decide whether `decorateRuns` belongs in backend serialization (recommended: DTO serializer joins/populates names) or shared utilities, eliminating ad-hoc client-side normalization.

5. **Schema Validation Strategy in Frontend Client (`client.ts`)**
   - **The issue:** The plan states: *"Add response validation to the frontend API wrapper"*, but [`client.ts`](file:///home/leekwan/code/optitrader-lab/packages/frontend/src/api/client.ts) has a generic `request<T>(path, ...)` signature that does not accept a Zod schema.
   - **Correction needed:** `client.ts` needs a typed signature:
     ```ts
     request<T>(path: string, schema: ZodType<T>, options?: RequestOptions): Promise<T>
     ```
     Phase 0 needs to update every caller in `realApi.ts` to pass the corresponding shared response schema.

6. **Error Response Shape Alignment (`@optitrader/shared`)**
   - **The issue:** [`packages/shared/src/errors.ts`](file:///home/leekwan/code/optitrader-lab/packages/shared/src/errors.ts) defines standard API errors (`ApiErrorPayload`: `error`, `code`, `details`, `timestamp`). `client.ts` in the frontend must parse backend error responses through this shared schema when `!response.ok` to avoid opaque error alerts.

---

### 3. Missing Infrastructure & Tooling Items

7. **Vite Proxy & CORS in Live Mode**
   - **The issue:** For cookies (`HttpOnly`, `SameSite=Strict`, `credentials: 'include'`) to work in local live mode without cross-origin friction, Vite proxy (`/api` -> `localhost:5000`) must be the default transport.
   - **Current state:** [`packages/frontend/src/api/client.ts`](file:///home/leekwan/code/optitrader-lab/packages/frontend/src/api/client.ts#L1) defaults to `http://localhost:5000/api` directly instead of `/api`. This bypasses the Vite dev proxy, triggering CORS and cookie restrictions on modern browsers.
   - **Correction needed:** Change default `API_URL` to `/api` (or relative path) in development when using Vite proxy.

8. **Live Smoke Script Requirements**
   - **The issue:** Phase 0 specifies *"Add a live smoke script: login → workspace → dataset upload → profile → run → results → comparison"*.
   - **Gaps:**
     - Phase 0 says nothing about how this script is run (e.g., `npm run test:smoke` or a standalone TS script under `packages/backend/src/scripts/`).
     - Is MongoDB required to be seeded, or does the smoke script create its own test user/workspace from scratch?
     - A clean teardown step (cleaning up created runs/datasets) is missing from the workflow description.

---

### Summary Checklist for Phase 0

| Area | What was missing or faulty | Required Action |
|---|---|---|
| **Shared** | `countCombinations` resides in `mockApi` | Move to `packages/shared` and import in both frontend and backend |
| **Shared** | `WorkspaceBootstrapDTO` not listed in serializers | Add shared schema & serializer `toWorkspaceBootstrapDTO` |
| **Frontend** | Static import of `mockApi` leaks into production build | Use Vite dynamic import / env-conditional bundling |
| **Frontend** | `client.ts` lacks runtime Zod schema parsing | Update `request<T>(path, schema, ...)` to validate all API responses |
| **Frontend** | Direct `http://localhost:5000/api` URL breaks cookie proxy | Standardize on `/api` relative path through Vite proxy |
| **Frontend** | "Reset demo" button is visible in live mode | Conditionally hide / disable when `apiMode !== 'mock'` |
| **Backend** | Smoke test runner undefined | Specify CLI command (`npm run smoke`) with setup, execution, and teardown |