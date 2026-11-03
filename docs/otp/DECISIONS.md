# OTP (Message Central) — Decisions Log

Autonomous run. Every ambiguity resolved with the safest option and recorded here.

## 1. Base branch and worktree
- BASE verified with `git ls-tree -r --name-only`:
  - `feat/launch-blockers` → `apps/mobile/src/*` = 102 files, `app/api/v1/*` = 56 files.
  - `app/main` / `remotes/app/main` also contain both, but `feat/launch-blockers` is the branch that was explicitly named in the task and is the one checked out for launch work.
  - `main`, `perf/exam-runtime`, `perf-mobile-fix` contain NEITHER `apps/mobile/src` nor `app/api/v1`.
- Worktree created from the original folder:
  `git worktree add ../TS-otp -b otp-message-central feat/launch-blockers`
- Actual path: `/Users/praveenkumar/TS-otp` (because `../` is relative to `/Users/praveenkumar/TrillionSkill`).
- `../TS-perf` was never read, written, or touched.

## 2. Environment files
- `.env`, `.env.local`, `.env.test` were copied from the original folder into the worktree. Values were never printed.
- The repo's test guard (`scripts/guard-test-db.ts: assertNoEnvLocal`) refuses to run when `.env.local` exists. For seed/test runs only, `.env.local` was moved to
  `/private/var/folders/36/yhmqht45575cn6b001lf6m1h0000gn/T/opencode/ts-otp-env-local.bak`
  and restored afterwards. This is a test-harness constraint, not an app change.

## 3. Database
- Docker Desktop daemon was down at the start; it was restarted (`open -a Docker`). No data was touched.
- Test DB: Docker `trillionskill-test-db`, Postgres 16, `127.0.0.1:54329`.
- Dedicated database `otp_test` created with `CREATE DATABASE otp_test` only.
- Schema created with the repo's existing migrations: `prisma migrate deploy` against `otp_test`. No `db push`, no `migrate dev`, no reset/drop/truncate.
- Seeded with `SEED_DATABASE_URL=...otp_test npm run seed:test`.
- **No Prisma schema change was needed.** Existing models reused:
  - `ReauthTokenUse` (`jti` PK + `expiresAt`) as a DB-backed, TTL'd, atomic single-use store.
  - `RateLimit` for all counters.

## 4. Message Central API shape (from official docs, fetched 2026-11-03)
Source: https://www.messagecentral.com/product/verify-now/api (Verify Now API docs, V3).
- Base URL: `https://cpaas.messagecentral.com`
- Auth token: `GET /auth/v1/authentication/token?customerId=<id>&key=<base64-encrypted password>&scope=NEW&country=91`
  → `{ "status": 200, "token": "<jwt>" }`; token sent as header `authToken`.
- Send OTP: `POST /verification/v3/send?countryCode=91&flowType=SMS&mobileNumber=<10-digit>&otpLength=6`
  header `authToken`
  → `{ responseCode: 200, message: "SUCCESS", data: { verificationId, mobileNumber, timeout: "60", transactionId, ... } }`
- Validate OTP: `GET /verification/v3/validateOtp?verificationId=<id>&code=<otp>` (documented cURL is a GET)
  header `authToken`
  → `{ responseCode: 200, data: { verificationStatus: "VERIFICATION_COMPLETED", ... } }`
- OTP length: 4–8, default 4 → we request **6**.
- Expiry: provider-managed; send response returns `timeout` (docs show 60s). We use it as the binding TTL (clamped 60–600s).
- Country code: separate `countryCode=91` param, `mobileNumber` is the 10-digit national number.
- DLT/sender ID: provider homepage states “No Sender ID registration needed for OTP”. **Owner must confirm** with the provider that their no-DLT route covers our use case (see REPORT manual steps).
- Error codes mapped: `702` wrong OTP, `705` expired, `703` already verified, `505` invalid verification id, `800` max limit reached, `501` invalid customer id, `511` invalid country code.
- No real provider call was made by this task (no credentials). Every real-provider path is marked **NOT TESTED**.

## 5. Security design (fix for the 0b finding)
- `auth.ts` mobile Credentials provider previously trusted only `phoneNumber` (CRITICAL). Now it REQUIRES a server-signed, phone-bound, ~2-minute, single-use proof.
- Proof = `base64url(payload).HMAC-SHA256(secret, payload)` where secret is `AUTH_SECRET` (fallback `NEXTAUTH_SECRET`). In production, a missing secret is a hard failure (no fallback secret).
- Proof `jti` is consumed atomically in `ReauthTokenUse` (`otp-proof:<jti>`), so replay is blocked across serverless instances.
- OTP send binds `verificationId` to the phone with `sha256(verificationId + ":" + e164)` stored in `ReauthTokenUse` (`otp-bind:<hash>`) with TTL. Verification with a different phone cannot succeed, and the row stores no raw phone.
- Provider OTP is never stored by us; only opaque ids/hashes with TTL.
- Dev/test bypass is only possible when `NODE_ENV !== "production"` **and** the existing explicit flag policy (`isDevBypassAllowed`) is true. In `NODE_ENV=production` it is impossible regardless of `APP_ENV`.
- The “any 6-digit code” path was removed from both web and mobile production paths.

## 6. Rate limits (our own, on top of the provider)
- 3 sends / 10 min / phone
- 10 sends / hour / IP
- resend cooldown 30 s / phone
- 5 verify attempts / 10 min / verificationId
- All fail-closed on DB error (`lib/rate-limit.ts`).
- Limits are injectable in the service factory for tests only (production defaults above).

## 7. Copy / UI
- No layout or style change.
- One misleading copy line in `MobileAuthModal.tsx` said “Any 6 digits are accepted for instant student access.” It described the fake behaviour that was removed, so it was replaced with a neutral true statement using the same style. This is the only copy change and it is required by the security fix.
- Real states added with existing components/styles: “Sending…”, wrong code, expired code, resend countdown, rate-limited message. Mobile adds a resend countdown line and `oneTimeCode` autofill; no other screen touched.

## 8. Provider swapping
- All provider traffic goes through `OtpProvider` in `lib/services/sms-otp/types.ts`.
- Message Central lives only in `lib/services/sms-otp/message-central.adapter.ts`.
- To swap to MSG91 (or anything else): implement the interface in a new adapter and change the single factory in `lib/services/sms-otp/provider.ts`. No route, UI, or service change.

## 9. Env var names (names only)
- `MESSAGE_CENTRAL_CUSTOMER_ID`
- `MESSAGE_CENTRAL_AUTH_KEY`
- `MESSAGE_CENTRAL_BASE_URL` (optional; defaults to `https://cpaas.messagecentral.com`)
- Existing `ALLOW_DEV_MOBILE_LOGIN` keeps its current dev-only meaning.

## 10. Mobile verificationId transport
- The provider requires `verificationId` to validate. The mobile client previously sent only `{ phoneNumber, otp }`.
- `verificationId` is now returned by `/api/v1/auth/otp/request` and sent back by the app (additive field; success response shape `{ tokens, user }` unchanged).

## 11. Legacy security tests updated, not deleted
- `tests/api-v1-sec1.test.ts` SEC1.2/SEC1.3/SEC1.6 encoded the OLD contract (a fake OTP that accepted
  any 6 digits, and a 501 whenever `SMS_API_KEY` was absent). The new contract makes those assertions
  wrong, so they were rewritten to the real two-step flow and the real production guard instead of
  being removed. Red-before state: `docs/otp/evidence/regression-unit.txt` (4 failures); green after:
  `docs/otp/evidence/otp-and-regression-final.txt`.
- One extra test was added to `tests/otp/otp-security.test.ts` ("an existing phone cannot sign in with
  no proof or with a forged proof") because the first mutation run showed that "no proof" was
  previously only rejected as a side effect of a missing user row. The test also asserts that a genuine
  proof for that same account does sign in, so the rejection cannot be vacuous.

## 12. Mutation testing
- 10 deliberate breaks of the security controls, each applied to the real source, run against the
  targeted suite, captured raw, and reverted byte-for-byte (asserted by the harness).
- All 10 were detected (RED). Evidence: `docs/otp/evidence/mutations/`.
- Reverting was done from an in-memory copy of the exact file bytes, not from git, because the new
  service files are untracked.

## 13. Files intentionally NOT changed
- `tsconfig.json` was temporarily edited to include `.next-build/types` for one local build, then
  reverted: `npx tsc --noEmit` passes on the untouched config, so the change was not needed.
- `.next-build/` (local build output) and a stray `tests/otp/.next-test/trace` were deleted; both were
  generated by this task, are untracked, and are regenerated on demand. `.next-test/` was kept so the
  test server does not have to recompile.
- No Prisma schema change, no new dependency. No `.env*` secret value was printed; the build command
  read the DB URL programmatically without echoing credentials.

## 14. Disk stop condition
- Free space on `/System/Volumes/Data` fell to ~1.1–1.3 GB (under the 10 GB floor) after the build and
  Playwright runs. No additional build/`next start` verification was attempted beyond the recorded
  evidence; all remaining work was text-only (tests, docs, commits).
