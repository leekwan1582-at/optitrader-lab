# Authentication Implementation Checklist

**Status:** core implementation complete in `packages/`; remaining production rollout and frontend/E2E test items are unchecked.  
**Design:** [`auth-plan.md`](auth-plan.md)  
**Production context:** [`production-plan.md`](production-plan.md)

This checklist covers the Option 1 migration from browser-stored Bearer JWTs to HttpOnly access + refresh cookies.

## 0. Preconditions

- [x] Auth implemented in the `packages/shared`, `packages/backend`, `packages/frontend` layout.
- [ ] Choose the same-site production strategy:
  - [x] Custom subdomains, e.g. `app.optitrader.dev` + `api.optitrader.dev`
  - [x] Reverse proxy serving `/api` from the frontend origin
- [ ] Generate two secrets of at least 32 bytes:
  - [x] `JWT_ACCESS_SECRET`
  - [x] `JWT_REFRESH_SECRET`
- [ ] Decide `COOKIE_DOMAIN` for production.
- [x] Confirm Node.js version policy (`>=24` per root `package.json`; verified on v24.22.1).
- [ ] Confirm no production traffic depends on the current localStorage session.

## 1. Shared contracts

- [x] Move auth Zod schemas into `packages/shared/src/schemas/auth.ts`.
- [x] Add `loginSchema`, `registerSchema`, `userSchema`, `workspaceSchema`, `sessionSchema`.
- [x] Add `jwtPayloadSchema` with `sub`, `email`, `name`, `workspaceName`, `sid`, `type`, `iat`, `exp`.
- [x] Remove `token` from the shared `Session` type.
- [x] Add shared error response schema and auth error codes.
- [x] Export the new schemas/types from the shared package entry point.
- [x] Remove duplicated auth/domain types from frontend and backend.
- [ ] Add shared schema tests.
- [x] Build and typecheck the shared package first.

## 2. Backend configuration

- [x] Replace `JWT_SECRET` / `JWT_EXPIRES_IN` with:
  - [x] `JWT_ACCESS_SECRET`
  - [x] `JWT_REFRESH_SECRET`
  - [x] `ACCESS_TOKEN_TTL=15m`
  - [x] `REFRESH_TOKEN_TTL=7d`
  - [x] `COOKIE_DOMAIN`
- [x] Validate both secrets are at least 32 bytes.
- [x] Validate TTL values.
- [x] Update `server/.env.example`.
- [x] Update config tests for the new variables and failure cases.
- [ ] Remove old JWT variables from deployment environments.

## 3. Refresh-token persistence

- [x] Add `RefreshToken` model:
  - [x] `_id` session id
  - [x] `userId`
  - [x] `tokenHash`
  - [x] `expiresAt`
  - [x] `revokedAt`
  - [x] `replacedBy`
  - [x] `createdAt`
  - [x] `userAgent`
  - [x] `ip`
- [x] Add unique index on `tokenHash`.
- [x] Add index on `userId`.
- [x] Add TTL index on `expiresAt`.
- [x] Add SHA-256 refresh-token hashing helper.
- [x] Add refresh rotation logic.
- [x] Add refresh-token reuse detection.
- [x] Add revoke-all-sessions helper for reuse detection and password changes.
- [x] Ensure raw refresh tokens are never stored or logged.

## 4. Backend token and auth service

- [x] Add `services/tokenService.ts`:
  - [x] Sign access JWT with pinned `HS256`.
  - [x] Verify access JWT with `algorithms: ['HS256']`.
  - [x] Generate opaque refresh tokens.
  - [x] Create, rotate and revoke refresh sessions.
- [x] Update `services/authService.ts`:
  - [x] Register/login return `{ user }`, not `{ token }`.
  - [x] Set access and refresh cookies through controller helpers.
  - [x] Revoke sessions on password change.
- [x] Add refresh/logout service functions.
- [x] Keep bcrypt at 12 rounds.
- [ ] Add login audit events.

## 5. Backend routes and cookies

- [x] Add `POST /api/auth/refresh`.
- [x] Add `POST /api/auth/logout`.
- [x] Keep `GET /api/auth/me`.
- [x] Set cookie flags:
  - [x] `HttpOnly`
  - [x] `SameSite=Strict`
  - [x] `Secure` in production
  - [x] Access path `/`
  - [x] Refresh path `/api/auth`
- [x] Clear both cookies on logout.
- [x] Return `204` for logout.
- [x] Never include a token in JSON responses.
- [x] Add login/register rate limiters.
- [x] Add auth integration tests.

## 6. Backend middleware

- [x] Add `cookie-parser` dependency.
- [x] Update `requireAuth` to read `ot_access` from cookies.
- [x] Pin JWT verification algorithm.
- [x] Validate the JWT payload with the shared schema.
- [x] Add Origin/Referer check for `POST`, `PUT`, `PATCH`, `DELETE`.
- [x] Reject mismatched origins with `403 FORBIDDEN_ORIGIN`.
- [x] Keep CORS credentials enabled with an exact `CLIENT_URL`.
- [x] Ensure every dataset/profile/run query remains owner-scoped.
- [x] Ensure error responses use the shared error shape.

## 7. Frontend auth state

- [x] Remove `localStorage` session helpers.
- [x] Remove `sessionStorage` usage.
- [x] Remove all `token` fields from `AppContext`.
- [x] Hold only `user` in memory.
- [x] Add `refreshSession()` bootstrap flow.
- [x] On boot: call `/auth/refresh`, then `/auth/me`, then workspace bootstrap.
- [x] On failed refresh: show `/login`.
- [x] On login: store `{ user }` only.
- [x] On logout: call `/auth/logout`, clear state, redirect.
- [x] Update mock mode to keep its session in memory only.
- [x] Confirm reload in mock mode returns to login.

## 8. Frontend API client

- [x] Add `credentials: 'include'` to every request.
- [x] Remove the `Authorization` header option.
- [x] Remove `token` parameters from `ApiClient`, `realApi`, `mockApi` and context actions.
- [x] Add one central 401 → refresh → retry path.
- [x] Do not retry `/auth/refresh` itself.
- [x] Clear auth state when refresh fails.
- [ ] Validate response bodies against shared Zod schemas.
- [x] Confirm no component reads or forwards a token.

## 9. Development and deployment configuration

- [x] Add Vite proxy: `/api` → `http://localhost:5000`.
- [x] Set `VITE_API_URL=/api` in development.
- [x] Use exact `CLIENT_URL` in CORS.
- [ ] Configure same-site custom subdomains or reverse proxy in production.
- [ ] Set `COOKIE_DOMAIN` for the parent domain when using subdomains.
- [ ] Verify `Secure` cookies over HTTPS.
- [x] Document the production cookie-domain requirement.
- [ ] Verify Render/Railway request timeout exceeds the Python engine timeout.

## 10. Tests

### Backend

- [x] Login sets both cookies with correct flags.
- [x] Login response has no token.
- [x] `/auth/me` works with access cookie.
- [x] `/auth/me` returns 401 without access cookie.
- [x] Refresh rotates the refresh token.
- [x] Old refresh token is rejected after rotation.
- [x] Refresh-token reuse revokes all user sessions.
- [x] Logout revokes the refresh session and clears cookies.
- [ ] Expired access token can be refreshed.
- [x] Invalid Origin on a mutation returns 403.
- [ ] Login/register rate limits return 429.
- [ ] Password change revokes existing sessions.
- [x] Production cookies are `Secure`, `HttpOnly`, `SameSite=Strict`.
- [x] Cookie-auth test uses a cookie-aware Supertest agent.

### Frontend

- [x] No `localStorage` or `sessionStorage` auth usage.
- [x] App bootstrap calls `/auth/refresh`.
- [x] 401 triggers exactly one refresh and retry.
- [x] Failed refresh clears state.
- [x] Logout clears state.
- [x] Mock mode works without persisted tokens.
- [ ] Page-level tests run `vitest-axe`.

### End-to-end

- [ ] Playwright: login → dashboard → refresh browser → still signed in.
- [ ] Playwright: logout → protected route redirects to login.
- [ ] Playwright: expired access token recovers through refresh.

### Commands

```bash
npm run lint
npm run typecheck
npm run build
npm test
pytest -v
```

## 11. Documentation

- [x] Update `auth-plan.md` status to implemented.
- [x] Update `production-plan.md` auth section and environment variables.
- [x] Update root `readme.md` auth and quick-start notes.
- [x] Update server/client `.env.example`.
- [ ] Update deployment runbook with cookie-domain requirements.
- [x] Remove stale references to Bearer tokens and localStorage.

## 12. Rollout and rollback

- [ ] Deploy to staging with HTTPS and the production cookie domain.
- [ ] Verify cookies are set and sent.
- [ ] Verify refresh rotation and logout revocation.
- [ ] Monitor 401, 403 and refresh failure rates.
- [ ] Confirm old localStorage sessions are ignored after deployment.
- [ ] Document rollback: redeploy previous version and invalidate refresh sessions if needed.
- [ ] Keep a short observation window before removing old auth code paths.

## 13. Definition of done

- [x] No JWT or refresh token is accessible to frontend JavaScript.
- [x] No auth data in `localStorage` or `sessionStorage`.
- [x] Access and refresh cookies use the required flags.
- [x] Refresh rotation, reuse detection and logout revocation are tested.
- [x] Origin checks protect state-changing requests.
- [x] Owner scoping is preserved.
- [x] Lint, typecheck, builds, backend tests, bridge tests and pytest pass.
- [ ] Staging smoke test passes with cookies.
- [x] Documentation is updated and consistent.
