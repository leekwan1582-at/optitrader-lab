# Authentication Plan — HttpOnly Cookie Sessions

**Status:** implemented in `packages/shared`, `packages/backend` and `packages/frontend`. Remaining follow-ups: frontend/E2E auth tests, password-reset/email-verification delivery, and production staging validation.

This document replaces the earlier “Bearer JWT in the browser” decision. The browser uses **HttpOnly access and refresh cookies**; JavaScript never receives or stores a JWT.

Related documents:

- [Production plan](production-plan.md)
- [Technical design](design_v01.md)
- [Implementation checklist](auth-implementation-checklist.md)
- [Frontend package](../packages/frontend/readme.md)
- [Backend package](../packages/backend/readme.md)

## 1. Decision

| Area | Decision |
|---|---|
| Browser authentication | HttpOnly access + refresh cookies |
| API authentication | Cookies sent with `credentials: 'include'` |
| Access token | JWT, 15 minutes, `HttpOnly`, `SameSite=Strict`, `Secure` in production |
| Refresh token | Opaque random token, 7 days, rotated on every refresh |
| Refresh-token storage | HMAC-SHA256 hash in MongoDB; never store the raw token |
| CSRF protection | `SameSite=Strict` + `Origin`/`Referer` check on mutations |
| Token storage in JS | Forbidden: no `localStorage`, `sessionStorage`, Context or Redux token |
| API clients | Cookie-authenticated; optional non-browser Bearer support is deferred |

## 2. Goals

- Remove JWT/session data from browser storage.
- Keep owner-scoped authorization on every dataset, profile and run query.
- Support logout and refresh-token revocation.
- Detect refresh-token reuse and revoke the session family.
- Work with the Vite dev proxy and a same-site production deployment.
- Pass the existing ESLint rule:

```text
no-restricted-globals: localStorage, sessionStorage
```

## 3. Non-goals for this change

- OAuth/social login.
- Multi-factor authentication.
- Email verification and password-reset delivery.
- WebSocket authentication runtime.
- Mobile-native clients.

These can follow after the cookie-session migration.

## 4. Token and cookie model

### Access token

- Type: JWT, algorithm `HS256` pinned in `sign` and `verify`.
- Lifetime: 15 minutes.
- Cookie: `ot_access`.
- Path: `/`.
- Payload:

```ts
{
  sub: string,            // user id
  email: string,
  name: string,
  workspaceName: string,
  sid: string,            // refresh-session id
  type: 'access',
  iat,
  exp
}
```

### Refresh token

- Type: opaque random value (32+ bytes, base64url).
- Lifetime: 7 days.
- Cookie: `ot_refresh`.
- Path: `/api/auth` so it is only sent to auth endpoints.
- Stored as an HMAC-SHA256 hash in MongoDB using `JWT_REFRESH_SECRET`.

### Cookie flags

```ts
{
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/',                 // access
  domain: config.cookieDomain, // optional; required for same-site subdomains
}
```

Refresh cookie uses `path: '/api/auth'`.

### Environment variables

```env
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
COOKIE_DOMAIN=
```

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be at least 32 bytes.
- `COOKIE_DOMAIN` is omitted in development.
- Production same-site subdomains use `COOKIE_DOMAIN=.optitrader.dev`.
- Remove `JWT_SECRET` and `JWT_EXPIRES_IN` after migration.

## 5. Refresh-token data model

Collection: `refreshtokens`

```ts
{
  _id: string,          // session id, used as access-token `sid`
  userId: string,
  tokenHash: string,    // SHA-256 of the opaque token
  expiresAt: Date,
  revokedAt?: Date,
  replacedBy?: string,
  createdAt: Date,
  userAgent?: string,
  ip?: string
}
```

Indexes:

- unique index on `tokenHash`
- index on `userId`
- TTL index on `expiresAt`

## 6. Request flows

### Register/login

1. Validate email/password with the shared Zod schemas.
2. Hash or verify the password with bcrypt (12 rounds).
3. Create the user/workspace if needed.
4. Create a refresh session:
   - generate an opaque refresh token
   - store its hash and expiry
   - set `sid`
5. Sign the access JWT with `sid`.
6. Set `ot_access` and `ot_refresh` cookies.
7. Return `{ user }` only. **Never return the token.**

### Protected request

1. `requireAuth` reads `ot_access` from cookies.
2. Verify with `algorithms: ['HS256']`.
3. Validate the payload with the shared `jwtPayloadSchema`.
4. Attach `request.user`.
5. If missing/invalid, return `401`.

### Refresh

1. Read `ot_refresh`.
2. Hash it and find the session.
3. Reject if missing, revoked or expired.
4. Rotate:
   - revoke the old session
   - create a new refresh session
   - issue a new access JWT
5. If a revoked token is reused, revoke all sessions for that user.
6. Set both cookies again and return `{ user }`.

### Logout

1. Read and HMAC-hash `ot_refresh`.
2. Revoke the session.
3. Clear both cookies.
4. Return `204`.

Logout is idempotent: if the refresh cookie is absent, still clear cookies and return success.

### Password change

Revoke all refresh sessions for the user, then issue a new session or require re-login.

## 7. CSRF and CORS

- `SameSite=Strict` on both cookies.
- `originCheck` middleware on `POST`, `PUT`, `PATCH`, `DELETE`:
  - compare `Origin` (or `Referer`) to `CLIENT_URL`
  - reject mismatch with `403 FORBIDDEN_ORIGIN`
- CORS uses the exact `CLIENT_URL` with `credentials: true`.
- Do not use wildcard CORS with credentials.

### Development

Use a Vite proxy so the browser sees one origin:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:5000',
  },
}
```

Set:

```env
VITE_API_URL=/api
```

### Production

`SameSite=Strict` requires a same-site deployment. Use either:

1. Custom subdomains under one parent domain:

   ```text
   app.optitrader.dev
   api.optitrader.dev
   COOKIE_DOMAIN=.optitrader.dev
   ```

2. A reverse proxy that serves `/api` from the same origin as the frontend.

Unrelated domains such as `app.vercel.app` calling `api.onrender.com` are cross-site and would require `SameSite=None`, which violates this plan.

## 8. Shared contracts

Implemented in `packages/shared`:

```text
src/schemas/auth.ts
```

Include:

- `loginSchema`
- `registerSchema`
- `userSchema`
- `workspaceSchema`
- `sessionSchema = { user }`
- `jwtPayloadSchema`
- `errorResponseSchema` / error codes

Remove `token` from the shared `Session` type.

Suggested error codes:

```text
INVALID_CREDENTIALS
EMAIL_IN_USE
UNAUTHORIZED
TOKEN_EXPIRED
REFRESH_INVALID
REFRESH_REUSED
FORBIDDEN_ORIGIN
RATE_LIMITED
```

## 9. Backend changes

| File / area | Change |
|---|---|
| `config.ts` | Add access/refresh secrets, TTLs, cookie domain; remove old JWT vars |
| `models/RefreshToken.ts` | New model and indexes |
| `services/authService.ts` | Issue/rotate/revoke sessions; return user only |
| `services/tokenService.ts` | New: sign access JWT, create/hash/rotate refresh tokens |
| `middleware/auth.ts` | Read access cookie; verify HS256; validate payload |
| `middleware/originCheck.ts` | New: Origin/Referer check for mutations |
| `middleware/rateLimit.ts` | Add login/register limiters |
| `controllers/authController.ts` | Set/clear cookies; add refresh/logout |
| `routes/authRoutes.ts` | Add `/refresh`, `/logout`; rate-limit login/register |
| `app.ts` | Add `cookie-parser`; mount origin check on mutations |
| `serializers/` | Return shared DTOs, never raw Mongoose documents |
| `.env.example` | New auth variables |

`cookie-parser` must be added as a backend dependency.

## 10. Frontend changes

| File / area | Change |
|---|---|
| `context/AppContext.tsx` | Remove localStorage/session; hold `user` in memory only |
| `api/client.ts` | Add `credentials: 'include'`; remove Authorization header |
| `api/types.ts` | Remove all `token` parameters |
| `api/realApi.ts` | Remove `authOptions(token)` and token arguments |
| `api/mockApi.ts` | Return `{ user }`; keep mock session in memory |
| `pages/LoginPage.tsx` | Handle `{ user }`; no token |
| `components/AppLayout.tsx` | Logout calls `POST /auth/logout` |
| `vite.config.ts` | Add `/api` dev proxy |
| `.env.example` | `VITE_API_URL=/api` in development |

### App bootstrap

1. Call `POST /auth/refresh` with `credentials: 'include'`.
2. If successful, load workspace data.
3. If it fails with 401, show the login page.

### Central refresh retry

In the API wrapper:

```text
request → 401
  → if not /auth/refresh: call /auth/refresh once
  → retry original request
  → if refresh fails: clear user state, propagate 401
```

Do not retry `/auth/refresh` itself.

### Mock mode

- Keep the mock user in memory only.
- A page reload returns to the login screen.
- Do not persist mock sessions in browser storage.

## 11. Tests

### Backend

- Login sets both cookies with the correct flags.
- Login response contains `{ user }`, not a token.
- `/auth/me` succeeds with the access cookie and fails without it.
- Refresh rotates the refresh token and invalidates the old one.
- Refresh-token reuse revokes all user sessions.
- Logout revokes the session and clears cookies.
- Protected mutation with an invalid `Origin` returns 403.
- Expired access token can be refreshed.
- Password change revokes existing sessions.
- Login/register rate limits return 429.
- Access and refresh cookies are `HttpOnly`, `SameSite=Strict`, and `Secure` in production.

### Frontend

- No `localStorage` or `sessionStorage` usage.
- App bootstrap calls `/auth/refresh`.
- A 401 triggers one refresh and retry.
- Logout clears user state.
- Mock mode works without persisted tokens.
- Page-level tests run `vitest-axe`.

### Commands

```bash
npm run lint
npm run typecheck
npm run build
npm test
pytest -v
```

## 12. Implementation summary

The cookie-auth implementation is now in the package layout:

- shared auth/domain/error/WS contracts
- backend cookie auth, refresh model, rotation, reuse detection and Origin checks
- frontend cookie requests, refresh bootstrap and removal of browser token storage
- backend auth/config/bridge tests and updated environment examples

Remaining follow-ups are tracked in [`auth-implementation-checklist.md`](auth-implementation-checklist.md).

## 13. Migration sequence

1. Add shared auth schemas/types; remove `token` from `Session`.
2. Add backend config, `RefreshToken` model and token service.
3. Add cookie authentication, refresh/logout routes and Origin check.
4. Add auth integration tests.
5. Remove localStorage/token handling from frontend.
6. Add `credentials: 'include'`, refresh retry and Vite proxy.
7. Update env examples and docs.
8. Run full checks and browser smoke tests.

## 14. Acceptance criteria

- No JWT or refresh token is accessible to frontend JavaScript.
- No `localStorage`/`sessionStorage` auth usage remains.
- Login, refresh, logout and `/auth/me` work with cookies.
- Refresh rotation and reuse detection are covered by tests.
- Mutations reject mismatched Origins.
- Lint, typecheck, builds, backend tests, bridge tests and pytest pass.
- Dev works through the Vite proxy.
- Production uses same-site subdomains or a reverse proxy.

## 15. Risks

| Risk | Mitigation |
|---|---|
| Cross-site Vercel/Render domains break Strict cookies | Use same-site subdomains or reverse proxy |
| Refresh race from multiple tabs | Serialize refresh in the client or allow a short rotation grace window |
| Cookie/CORS misconfiguration | Exact `CLIENT_URL`, `credentials: true`, integration tests |
| Stolen refresh token | Rotation, reuse detection, revocation, short access lifetime |
| XSS can still make authenticated requests | CSP, React escaping, no token in JS, dependency scanning |
| Long-lived sessions | 7-day refresh expiry and explicit revocation on password change |
