# CORS decision for `/api/v1`

Date: 2026-10-31
Branch: `feat/launch-blockers`
Scope: every client that can call `/api/v1`, and whether the server should emit
CORS headers.

## Client inventory (evidence)

| Client | Origin type | Calls `/api/v1`? | Evidence |
| :--- | :--- | :--- | :--- |
| Expo mobile app (Android/iOS) | native (no browser origin) | Yes, via `packages/shared/src/client.ts` | `apps/mobile/app.config.ts:38` → `platforms: ["ios", "android"]` |
| Expo web target | browser | No such target | `platforms` array contains no `"web"`; `expo-web-browser` is an in-app browser library, not a hosted web build |
| Capacitor shell | browser (WebView) | No | no `capacitor` dependency or config in `package.json` / `apps/mobile/package.json` |
| Next.js web app | same origin | No browser caller | grep for `/api/v1` in `app/`, `components/`, `lib/` returns only server-side imports (`lib/services/*`, `lib/api/v1/*`); no `fetch()` to `/api/v1` from client components |
| Third-party browser origin | browser | No known caller | no `CORS_ALLOWED_ORIGINS` usage, no cross-origin API docs consumer in repo |

Server side:

- 56 route files under `app/api/v1`; none contains `Access-Control-Allow-Origin`.
- `middleware.ts` only lists `OPTIONS` in `CSRF_SAFE_METHODS`; it never sets CORS headers.
- `next.config.js` `headers()` sets security headers only (HSTS, CSP, etc.), no CORS.
- No `OPTIONS` export exists in any `/api/v1` route.

## Decision

**Add no CORS headers.** Native mobile requests are not subject to the browser
same-origin policy, and the web app talks to `/api/v1` only from the same
origin (or server-side). Emitting `Access-Control-Allow-Origin` would only
widen the attack surface (especially with cookies/credentials) for no client.

Locked by `tests/unit/cors-policy.test.ts`:

1. static scan: no `/api/v1` route, `middleware.ts` or `next.config.*` may
   contain `Access-Control-Allow-Origin`;
2. live call to `GET /api/v1/config`: the response must not carry
   `Access-Control-Allow-Origin` (and never `*`);
3. the Expo config must not enable the `web` platform.

## If a browser client is added later

Do not add `*`. Implement an explicit allowlist from `CORS_ALLOWED_ORIGINS`
(comma-separated exact origins), handle `OPTIONS` preflight, echo only an
allowlisted `Origin`, and never combine `*` with credentials. That change
requires its own fail-before/pass-after tests and the variable name added to
`.env.example`.

## Verification

`docs/evidence/raw/r9-s3-cors-test.txt` — 3/3 pass.
