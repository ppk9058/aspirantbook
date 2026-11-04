# PHASE 2 — Auth + OTP (real requests, local server 3048)

- DB assertion printed on every run: **127.0.0.1:54329/launch_verify** (server) and **127.0.0.1:54329/launch_verify_test** (node:test).
- Server: `npx next dev --hostname 127.0.0.1 --port 3048`, `NODE_ENV=development`, `APP_ENV=development`, `ALLOW_DEV_MOBILE_LOGIN=true`, `TRUST_PROXY=true`, dev OTP adapter (code `123456`) — the only way to get a deterministic provider locally; no real SMS.
- Raw evidence: `reports/EVIDENCE/p2-*.txt`

## 2.1 Send

| Case | Result | Evidence |
|---|---|---|
| valid `98765***` | **PASS** HTTP 200 `{"success":true,"step":"otp","verificationId":"dev_…","expiresIn":300,"resendAfter":30,"devBypass":true}` — **no OTP code in body** | `p2-send-bodies.txt` |
| invalid `12345` | **PASS** HTTP 400 "valid 10-digit…" | `p2-send-bodies.txt` |
| invalid `+1415…` | **PASS** HTTP 400 "Only Indian (+91)…" | `p2-send-bodies.txt` |
| rate limit | **PASS** sends 1–3 HTTP 200, send 4 HTTP **429** `"Too many verification codes requested for this number"` (real limit 3 / 10 min; cooldown 30 s) | `p2-rate-limit.txt` |

## 2.2 Verify

| Case | Result | Evidence |
|---|---|---|
| wrong 6-digit `000000` | **PASS** HTTP 401 | `p2-verify-attempts.txt` |
| attempts 1–5 wrong | 401 each; attempt **6 → HTTP 429** (5 attempts / 10 min; not 423) | `p2-verify-attempts.txt` |
| expired code (binding `expiresAt` set to UTC past) | **PASS** HTTP 401 "Invalid or expired verification code" | `p2-expired3.txt` |
| correct code | **PASS** HTTP 200, proof returned **once**; immediate replay → HTTP 401 "already been used" | `p2-verify-correct.txt` |

Note: after max attempts the binding row is **not deleted** — the limiter blocks the verificationId for the rest of the 10-minute window (`service.ts:321-336`). "Session destroyed" is not what the code does.

## 2.3 NextAuth `mobile` provider proof gating (HTTP `/api/auth/callback/mobile`)

| Case | HTTP / redirect | Session cookie | Result |
|---|---|---|---|
| (a) phone only, no proof | 302 → `/login?error=CredentialsSignin` | NO | **PASS** |
| (b) forged random proof | 302 → error | NO | **PASS** |
| (c) tampered payload, original signature | 302 → error | NO | **PASS** |
| (d) valid proof for phone A + phone B | 302 → error | NO | **PASS** |
| (e) expired proof (`ttl=-1s`) | 302 → error | NO | **PASS** |
| (f) valid proof first use | 302 → `/` | **YES** | **PASS** |
| (g) same proof second use | 302 → error | NO | **PASS** |

Evidence: `p2-nextauth-matrix.txt`, `p2-nextauth-expired.txt`, `p2-nextauth-valid.txt`. The v1 path (`/api/v1/auth/otp/verify`) also rejects a replay with 401 (`p2-v1-otp.txt`).

## 2.4 Old fake OTP

- `999999` with a valid verificationId → **401**. 4-digit → **401**. `123456` with a bogus verificationId → **401** (`p2-fake-otp.txt`).
- Hardcoded `123456` in code: `lib/services/sms-otp/dev.adapter.ts:18` and `app/api/v1/auth/reauth/route.ts:64` (only reachable after `isDevBypassAllowed()`, which is false in production; see 2.5). `lib/auth/password-policy.ts` hits are a weak-password blocklist, not OTP.
- Production-mode refusal (in-process, `NODE_ENV=production`, dev flags set) — `reports/EVIDENCE/p2-prod-proof.txt`:
```
TEST_OVERRIDE_BLOCKED_IN_PROD: true
DEV_BYPASS_ALLOWED_IN_PROD: false
DEV_ADAPTER_SEND_THREW_IN_PROD: true
DEMO_ROLE_ENABLED_IN_PROD: false
RESOLVE_DEMO_ADMIN_IN_PROD: undefined
DEV_BYPASS_FN_IN_PROD_APPENV_TEST: false
OTP_SEND_WITH_PROVIDER_UNCONFIGURED_PROD: {"ok":false,"code":"not_configured",...}
```
- Live HTTP, demo mode off: `GET /api/admin/books` with `Cookie: ts_demo_role=ADMIN` and no session → **401**; `GET/POST /api/auth/role` → **404** (`p2-demo-cookie.txt`). The P0 "raw cookie" concern does not reproduce.
- `/api/test/health` with `APP_ENV=development` → **404** (`p2-test-health.txt`).

## 2.5 Provider fail-closed

- `getOtpProvider()` returns `null` when Message Central is unconfigured and dev bypass is off; no fallback (only two adapters exist: `dev.adapter.ts`, `message-central.adapter.ts`).
- `otpService.sendOtp()` → `{ok:false, code:"not_configured"}` in production (above).
- Status codes: web `POST /api/auth/mobile-login` maps `not_configured` → **503** (`route.ts:71-77`); v1 `POST /api/v1/auth/otp/request` maps it to **501** (`request/route.ts:37-41`); v1 verify → **501** (`verify/route.ts:55-60`). Inconsistent v1 status (observation, not changed without a contract decision).

## 2.6 Rate-limit backend / restart survival

- Backend is Postgres (`RateLimit`). After the 3/10-min limit was hit, a **fresh process** reading the same key returned:
```
DB rows for key: [{"key":"otp:send:phone:d6f8…","count":4,"windowStart":"…"}]
FRESH PROCESS checkRateLimit: {"allowed":false,"count":5,"limit":3,"windowSeconds":600,"remainingSeconds":46}
```
**PASS** — limits survive process restart; `REDIS_URL` unset (log: `[Redis] REDIS_URL is not set…`). Not in-memory (`p2-ratelimit-persist.txt`).

## 2.7 PII in logs

`grep -c "9876500" reports/EVIDENCE/p2-server.log` → **0**; `grep -c "123456"` → **0**. **PASS** (`p2-server.log`).

## 2.8 Password login / lockout / session revoke

- Seeded 5 users on the local DB only (`reports/EVIDENCE/seed-rbac.ts`, ids in `p3-seed.txt`).
- Correct password login works for FREE/PREMIUM/TEACHER/ADMIN (sessions show real role) — `p2-password-login.txt`.
- 5 wrong passwords, then the **correct** password → `302 /login?error=CredentialsSignin&code=account_locked` (5 / 15 min) — **PASS** (`p2-lockout.txt`).
- `sessionVersion` bump (`+1`): the JWT returns `null` on the next session read; the callback syncs every **10 s** in production/development and 200 ms when `APP_ENV=test` (`auth.ts:383-388`). In this run the sync interval had elapsed, so the old JWT was rejected immediately — **PASS** (`p2-sessionversion.txt`).

## 2.9 Mobile refresh rotation

- Login → refresh rotates the token. Reusing the **old** refresh token → **401 "Token reuse detected. All sessions revoked…"**. The rotated token is then also rejected — **PASS** (`p2-refresh-rotation.txt`).

## Findings

- **P2-F1 (low, consistency):** v1 unconfigured-provider status is 501 vs web 503.
- **P2-F2 (low, doc):** "max attempts destroys the session" is not true; the verificationId is throttled for the window.
- No auth bypass found in this phase.
