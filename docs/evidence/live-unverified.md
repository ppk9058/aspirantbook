# LIVE-UNVERIFIED Integration Register

**Task:** G7 (corrected in the R7 remediation pass)
**Date:** 2026-10-29
**Branch:** `feat/launch-blockers`
**Purpose:** Register the third-party integrations that cannot be verified against live production APIs in CI/local environments. For each integration this document states what was verified with deterministic mocks, what was **NOT** tested live, the exact environment variable names that are actually read by the code (with `file:line`), the owner steps, and the expected observable result.

> [!IMPORTANT]
> 1. No live production credentials, tokens, or private keys were touched, committed, or exposed.
> 2. No invented IDs, domains, URLs, or email addresses are used. Where the repository does not define a value, the entry is `<OWNER TO SUPPLY>`.
> 3. Evidence convention: `path/to/test-file.ts::<exact test name>`. A claim with no such line is marked **NOT TESTED**.
> 4. The workflows in `.github/workflows/` were **NOT executed on GitHub** in this run. See `docs/evidence/raw/ci-additions-verify.txt`.

---

## Integration Matrix

| # | Integration | Primary File(s) | Status | Mocked evidence |
| :--- | :--- | :--- | :---: | :--- |
| 1 | Google OAuth (Web + Mobile) | `auth.ts`, `app/api/v1/auth/google/route.ts`, `lib/auth/google-token-verifier.ts` | `LIVE-UNVERIFIED` | `tests/unit/google-oauth-security.test.ts` (tests 1-10) |
| 2 | Razorpay Webhook | `app/api/webhooks/razorpay/route.ts`, `lib/payments/razorpay-webhook.ts` | `LIVE-UNVERIFIED` | `tests/unit/razorpay-webhook-verification.test.ts` (tests 1-8) |
| 3 | Brevo (Email Primary) | `lib/email.ts`, `lib/email/outbox-worker.ts` | `LIVE-UNVERIFIED` | `tests/unit/email-provider-abstraction.test.ts` (tests 1-2), `tests/unit/email-outbox-worker.test.ts` |
| 4 | Resend (Email Fallback) | `lib/email.ts`, `lib/email/outbox-worker.ts` | `LIVE-UNVERIFIED` | `tests/unit/email-provider-abstraction.test.ts` (tests 2-3) |
| 5 | Cloudflare Turnstile | `lib/security/turnstile.ts`, `auth.ts`, `components/security/TurnstileWidget.tsx` | `LIVE-UNVERIFIED` | `tests/unit/turnstile-verification.test.ts`, `tests/unit/turnstile-login.test.ts` |
| 6 | S3 / Cloudflare R2 Storage | `lib/aws-s3.ts`, `lib/s3.ts`, `app/api/upload/route.ts` | `LIVE-UNVERIFIED` | `tests/unit/no-local-disk-writes.test.ts::5. S3/MinIO compatible client uploads file and generates signed URL` (in-process S3-compatible server, not a MinIO container) |
| 7 | Cloudflare CF-Connecting-IP & Origin Lock | `lib/rate-limit.ts` | `LIVE-UNVERIFIED` | `tests/unit/client-ip-trust-proxy.test.ts` (15 tests) |
| 8 | Play Console Data-Deletion | `app/data-deletion/page.tsx`, `app/api/v1/data-deletion/route.ts`, `apps/mobile/src/app/settings.tsx` | `LIVE-UNVERIFIED` | `tests/unit/legal-pages-and-deletion.test.ts`, `tests/unit/data-deletion-queue.test.ts`, `tests/unit/data-deletion-remediation.test.ts`, `apps/mobile/tests/data-deletion-module.test.ts` |

---

## 1. Google OAuth (Web + Mobile Token)

**What was tested with mocks**
- Mobile `POST /api/v1/auth/google` with locally signed RS256 JWTs using an in-memory key pair.
- Audience allowlisting, issuer validation (`accounts.google.com` and `https://accounts.google.com`), expiry enforcement, and `email_verified: false` rejection.
- Web NextAuth `signIn` callback: rejects unverified email, links a verified Google account to an existing user, rejects a deactivated user.
- Evidence: `tests/unit/google-oauth-security.test.ts::1. verifyGoogleIdToken succeeds for legitimate token with email_verified=true`; `::2. Security: verifyGoogleIdToken rejects unverified email (prevents account takeover)`; `::3. Security: verifyGoogleIdToken rejects untrusted audience`; `::4. Security: verifyGoogleIdToken rejects untrusted issuer`; `::5. Security: verifyGoogleIdToken rejects expired token`; `::6. Mobile endpoint POST /api/v1/auth/google verifies token and creates session`; `::7. Mobile endpoint rejects account takeover when email is unverified`; `::8. Web signIn callback rejects unverified Google email (account takeover defense)`; `::9. Web signIn callback links verified Google account to existing user`; `::10. Web signIn callback rejects deactivated existing user`.

**What was NOT tested live**
- Live browser redirect to `https://accounts.google.com/o/oauth2/v2/auth`.
- Live token exchange with Google OAuth2 token servers.
- Live verification of Google ID tokens against Google's public JWKS endpoint (`https://www.googleapis.com/oauth2/v3/certs`).
- Google Sign-In SDK on physical Android and iOS devices.

**Exact environment variable names (read by code)**
- `GOOGLE_CLIENT_ID` — `auth.ts:345` (web client id) and `lib/auth/google-token-verifier.ts:33` (audience fallback).
- `GOOGLE_CLIENT_SECRET` — `auth.ts:346` (web client secret).
- `GOOGLE_CLIENT_IDS` — `lib/auth/google-token-verifier.ts:33` (comma-separated audience allowlist; also `lib/services/config.service.ts:9`).
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are **NOT** read anywhere in the codebase and were removed from this register.

**Exact owner steps**
1. In Google Cloud Console → APIs & Services → Credentials, configure the OAuth consent screen (`openid`, `email`, `profile`).
2. Create a **Web** OAuth client; add redirect URI `https://<your-domain>/api/auth/callback/google`.
3. Create an **Android** client with package name `com.aspirantbook.app` (verified in `apps/mobile/app.config.ts:65`) and the release keystore SHA-1.
4. Create an **iOS** client with bundle identifier `com.aspirantbook.app` (verified in `apps/mobile/app.config.ts:54`). The value `com.aspirantbook.mobile` does **not** exist in the repository.
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CLIENT_IDS` in the production environment.
6. On web, open `/login` and click **Continue with Google**; on mobile, trigger Google Sign-In.

**Expected result**
- Web: authenticated session and redirect to `/dashboard`.
- Mobile: `/api/v1/auth/google` returns a session token pair.
- A `User` row exists with the Google email and an `Account` row with `provider: "google"`.

---

## 2. Razorpay Webhook

**What was tested with mocks**
- HMAC-SHA256 signature verification over the raw body, `timingSafeEqual`, missing/wrong/tampered signature rejection.
- **5-minute (300 s) replay window** rejection and future-clock-skew rejection.
- Idempotent deduplication in `RazorpayWebhookEvent` (duplicate `x-razorpay-event-id` returns 200 without reprocessing).
- Fails closed with HTTP 500 when `RAZORPAY_WEBHOOK_SECRET` is missing.
- Evidence: `tests/unit/razorpay-webhook-verification.test.ts::1. Missing signature header fails closed with 400`; `::2. Missing RAZORPAY_WEBHOOK_SECRET fails closed with 500`; `::3. Wrong signature fails closed with 400`; `::4. Tampered body (signature for body A, sent body B) fails closed with 400`; `::5. Replay attack: event timestamp older than 5 minutes rejected with 400`; `::6. Event timestamp far in the future (>60s clock skew) rejected with 400`; `::7. Valid webhook with recent timestamp persists event and processes successfully`; `::8. Idempotency: duplicate event ID returns 200 without reprocessing`.
- The 300 s replay window is therefore **tested with mocks**, not "NOT TESTED".

**What was NOT tested live**
- End-to-end payment on Razorpay Checkout with real cards/UPI.
- Actual webhook delivery from Razorpay cloud IPs to a public `/api/webhooks/razorpay`.
- Settlement/refund processing in the live Razorpay dashboard.

**Exact environment variable names (read by code)**
- `RAZORPAY_KEY_ID` — `lib/payments/razorpay-config.ts:15`, `lib/health/health-service.ts:78`.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — `lib/payments/razorpay-config.ts:15` (checkout fallback), `app/api/books/checkout/create-order/route.ts:191`.
- `RAZORPAY_KEY_SECRET` — `lib/payments/razorpay-config.ts:28`.
- `RAZORPAY_WEBHOOK_SECRET` — `lib/payments/razorpay-webhook.ts:23`, `lib/payments/razorpay.ts:110`.

**Exact owner steps**
1. Razorpay Dashboard → Settings → Webhooks: add `https://<your-domain>/api/webhooks/razorpay`.
2. Set a webhook secret and subscribe to `payment.captured` and `order.paid`.
3. Set the four variables above in the production environment.
4. Send a test event from the dashboard, or make a small live test payment.

**Expected result**
- Webhook returns HTTP 200 `{"received": true}`.
- `RazorpayWebhookEvent` row is `PROCESSED`.
- The associated enrollment is granted.

---

## 3. Brevo (Email Primary Provider)

**What was tested with mocks**
- REST `POST` to `https://api.brevo.com/v3/smtp/email` with the `api-key` header and the documented JSON payload.
- Success path, failure path, and automatic failover to Resend.
- Outbox worker retry/backoff/dead-letter and provider order (Brevo first).
- Evidence: `tests/unit/email-provider-abstraction.test.ts::1. Primary provider (Brevo) sends successfully; fallback is NOT called`; `::2. On Primary (Brevo) 500 error, automatically falls back to Resend`; `tests/unit/email-outbox-worker.test.ts::Successfully sends pending row via primary provider (Brevo) and marks SENT`; `tests/unit/email-outbox-remediation.test.ts::3. Provider order is Brevo first, then Resend when Brevo fails`.

**What was NOT tested live**
- Inbox delivery at Gmail/Outlook/Yahoo.
- Brevo account SPF/DKIM/DMARC DNS validation.
- Live quota deduction on the Brevo dashboard.

**Exact environment variable names (read by code)**
- `BREVO_API_KEY` — `lib/email.ts:45`, `lib/email/outbox-worker.ts:41`, `lib/health/health-service.ts:115`.
- `BREVO_API_URL` — `lib/email.ts:51`, `lib/email/outbox-worker.ts:47`.
- `EMAIL_FROM` — `lib/email.ts:36`, `lib/email/outbox-worker.ts:26`.

**Exact owner steps**
1. Brevo → Senders & IP → Domains: complete SPF/DKIM/DMARC validation.
2. Create a v3 API key.
3. Set `BREVO_API_KEY` and a verified `EMAIL_FROM`.
4. Trigger a password-reset email to an external inbox.

**Expected result**
- Brevo returns HTTP 201 with a `messageId`.
- The email arrives without spam warnings.
- The outbox row (if used) is `SENT` with `provider = "brevo"`.

---

## 4. Resend (Email Fallback Provider)

**What was tested with mocks**
- Activation when Brevo is unconfigured or returns an HTTP error.
- Bearer-token request to `https://api.resend.com/emails`.
- Double failure persists to `EmailOutbox` (dev/test) or leaves the row for the outbox worker.
- Outbox worker sets `provider = "resend"` on fallback success.
- Evidence: `tests/unit/email-provider-abstraction.test.ts::2. On Primary (Brevo) 500 error, automatically falls back to Resend`; `::3. When both primary and fallback fail, queues to EmailOutbox with status PENDING, attempts 1, nextRetryAt +5 min`; `tests/unit/email-outbox-worker.test.ts::Falls back to Resend when Brevo fails`.

**What was NOT tested live**
- Live HTTP transmission to Resend edge servers.
- In-flight fallback from a live Brevo 5xx outage.
- Inbox delivery / click tracking in the Resend dashboard.

**Exact environment variable names (read by code)**
- `RESEND_API_KEY` — `lib/email.ts:87`, `lib/email/outbox-worker.ts:94`, `lib/health/health-service.ts:116`.
- `RESEND_API_URL` — `lib/email.ts:94`, `lib/email/outbox-worker.ts:101`.
- `EMAIL_FROM` — `lib/email.ts:36`, `lib/email/outbox-worker.ts:26`.

**Exact owner steps**
1. Resend → Domains: verify DNS records.
2. Create an API key.
3. Set `RESEND_API_KEY` and either unset `BREVO_API_KEY` or point `BREVO_API_URL` at an invalid endpoint in staging.
4. Trigger a verification/reset email.

**Expected result**
- Resend returns HTTP 200/201.
- The outbox/email row records `provider = "resend"`.
- The email lands in the recipient inbox.
- The log line `Sent via Resend fallback` does **not** exist in the code and is not an acceptance criterion.

---

## 5. Cloudflare Turnstile

**What was tested with mocks**
- Flag OFF is a no-op; flag ON rejects missing/invalid tokens.
- Fail-closed 500 when `TURNSTILE_ENABLED=true` but the secret is missing.
- Credentials login blocked at the direct `authorize()` level **and** at the HTTP NextAuth callback level (CSRF handled).
- Register, forgot-password request, and contact form reject missing/invalid tokens when the flag is ON.
- Mobile v1 login is exempt (native client cannot render the web widget) but rate-limited on user+IP.
- Evidence: `tests/unit/turnstile-verification.test.ts::1. Returns success immediately when TURNSTILE_ENABLED is not true`, `::2. Contact form passes without Turnstile token when flag is OFF`, `::3. Fails closed with 500 when TURNSTILE_SECRET_KEY is missing`, `::4. Fails with 400 when token is missing or empty`, `::5. Validates token with Cloudflare and returns success when valid`, `::6. Rejects with 400 when Cloudflare reports invalid-input-response`, `::7. Rejects with 504 when Cloudflare endpoint times out`, `::8. Protected form rejects submission when TURNSTILE_ENABLED=true and token is missing`; `tests/unit/turnstile-login.test.ts::2. Fails with TurnstileError when token is missing`, `::3. Fails with TurnstileError when token is invalid`, `::5b. HTTP-level NextAuth credentials callback with valid password and NO turnstile token yields no session`, `::5c. Register server action rejects a missing Turnstile token`, `::5d. Register server action rejects an invalid Turnstile token`, `::5e. Password-reset request action rejects a missing Turnstile token`, `::5f. Contact form rejects a missing Turnstile token`, `::8. Rate-limit key includes user+IP: the same user on a different IP is counted separately`, `::9. Rate-limit key includes user+IP: a different user on the same IP is counted separately`.

**What was NOT tested live**
- Rendering/execution of the Cloudflare Turnstile iframe in a real browser — **NOT TESTED** (no widget-render test exists; the widget component only gates on the site key).
- Real browser clearance tokens evaluated by `https://challenges.cloudflare.com/turnstile/v0/siteverify`.

**Exact environment variable names (read by code)**
- `TURNSTILE_ENABLED` — `lib/security/turnstile.ts:21`.
- `TURNSTILE_SECRET_KEY` — `lib/security/turnstile.ts:33`.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — `components/security/TurnstileWidget.tsx:43`.
- `TURNSTILE_VERIFY_URL` — optional override read at `lib/security/turnstile.ts:55` (used by tests to point at a local mock).
- `TURNSTILE_TIMEOUT_MS` — optional timeout read at `lib/security/turnstile.ts:65`.

**Scope note (no over-claim)**
- `register` (`lib/actions/auth.ts:70`), `requestPasswordResetAction` (`lib/actions/auth.ts:274`), and `submitContactForm` (`lib/actions/legal.ts:122`) verify Turnstile.
- `resetPasswordAction` (the token-consuming reset form, `lib/actions/auth.ts:304`) does **not** call Turnstile. It is therefore not claimed as protected.

**Exact owner steps**
1. Cloudflare Dashboard → Turnstile → add a widget for production/staging domains.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_ENABLED=true`.
3. Open `/login` in an incognito window and complete the challenge.

**Expected result**
- The widget renders and completes.
- Login succeeds only with a valid token; missing/invalid tokens show a human-readable error.

---

## 6. S3 / Cloudflare R2 Storage

**What was tested with mocks**
- S3 client instantiation with explicit credentials; presigned `PutObject` URL generation; upload/read/delete against an **in-process S3-compatible HTTP server**.
- Strict input validation (traversal paths, mime types, size limits) and fail-closed behaviour without credentials.
- Evidence: `tests/unit/no-local-disk-writes.test.ts::5. S3/MinIO compatible client uploads file and generates signed URL`.

**What was NOT tested live / NOT TESTED**
- A real MinIO container — **NOT TESTED** (the suite uses an in-process HTTP server; the earlier "MinIO container" claim was inaccurate).
- Direct PUT of large binaries from a browser to AWS S3 or Cloudflare R2.
- Bucket CORS, lifecycle, public-access-block, CloudFront/custom-domain CDN.

**Exact environment variable names (read by code)**
- `AWS_ACCESS_KEY_ID` or `S3_ACCESS_KEY` — `lib/aws-s3.ts:18`, `lib/s3.ts:22`.
- `AWS_SECRET_ACCESS_KEY` or `S3_SECRET_KEY` — `lib/aws-s3.ts:19`, `lib/s3.ts:23`.
- `AWS_S3_BUCKET_NAME` or `AWS_S3_BUCKET` or `S3_BUCKET` — `lib/aws-s3.ts:20`, `lib/s3.ts:30-32`.
- `AWS_REGION` or `S3_REGION` — `lib/aws-s3.ts:35`, `lib/s3.ts:18`.
- `AWS_ENDPOINT` or `S3_ENDPOINT` — `lib/aws-s3.ts:28`, `lib/s3.ts:11`.
- `AWS_S3_FORCE_PATH_STYLE` or `S3_FORCE_PATH_STYLE` — `lib/aws-s3.ts:30-31`, `lib/s3.ts:13-14`.
- `AWS_CLOUDFRONT_DOMAIN` — `lib/aws-s3.ts:107`.
- Every "or" alternate above is read by code in at least one of the two live modules (`lib/aws-s3.ts`, `lib/s3.ts`).

**Exact owner steps**
1. Create a bucket in AWS S3 or Cloudflare R2.
2. Apply a CORS policy allowing `PUT`/`GET` from `https://<your-domain>`.
3. Create credentials with object read/write.
4. Set the variables above.
5. Upload a course thumbnail from the admin panel.

**Expected result**
- The client receives a presigned URL from `/api/upload/presigned-url`.
- The binary PUT succeeds (HTTP 200) and the asset URL resolves in `<img>` tags.

---

## 7. Cloudflare CF-Connecting-IP & Origin Lock

**What was tested with mocks**
- With `TRUST_PROXY=false`, all forwarding headers are ignored (fail-closed).
- With `TRUST_PROXY=true`, `CF-Connecting-IP` is validated with `net.isIP`, malformed/long inputs are rejected, and the right-most `X-Forwarded-For` hop is selected using `TRUST_PROXY_HOPS`.
- Evidence: `tests/unit/client-ip-trust-proxy.test.ts` — all 15 named tests: `::accepts valid IPv4 addresses`, `::accepts valid IPv6 addresses in canonical form`, `::normalizes bracketed and port-annotated IPs`, `::extracts IPv4 from IPv4-mapped IPv6`, `::rejects malicious or invalid strings`, `::ignores spoofed X-Forwarded-For headers`, `::ignores CF-Connecting-IP header`, `::ignores X-Real-IP header`, `::returns 127.0.0.1 when no request is passed`, `::prioritizes valid CF-Connecting-IP over other headers`, `::rejects malicious CF-Connecting-IP and falls back safely`, `::extracts right-most trusted hop of X-Forwarded-For with TRUST_PROXY_HOPS=1`, `::extracts Nth hop from right when TRUST_PROXY_HOPS > 1`, `::falls back to X-Real-IP if X-Forwarded-For is missing`, `::handles standard Request object and Next.js { headers } container`.

**What was NOT tested live**
- Live Cloudflare edge proxying to origin.
- Origin firewall blocking direct TCP connections.
- Cloudflare Authenticated Origin Pulls (mTLS).

**Exact environment variable names (read by code)**
- `TRUST_PROXY` — `lib/rate-limit.ts:83`.
- `TRUST_PROXY_HOPS` — `lib/rate-limit.ts:102`.

**Exact owner steps**
1. Allow inbound 80/443 only from Cloudflare IP ranges.
2. Enable the Cloudflare proxy (orange cloud).
3. Set `TRUST_PROXY=true` and `TRUST_PROXY_HOPS=1`.
4. Curl the origin IP directly (must be dropped) and visit via the Cloudflare domain.

**Expected result**
- Direct origin access is dropped.
- Proxied traffic logs the real client IP in `AuditLog` and rate-limit keys.

---

## 8. Play Console Data-Deletion

**What was tested with mocks**
- Public `/data-deletion` page renders instructions and a form (no login required to view).
- Authenticated `POST /api/v1/data-deletion` creates a request, is idempotent for a second call (same id, one active row), does not leak across users, and allows a new request after `COMPLETED`.
- Authenticated `GET /api/v1/data-deletion` returns the current status.
- Admin queue list/get/patch returns 401 unauthenticated and 403 for non-admin; every valid transition writes exactly one `AuditLog` row and an invalid transition writes none.
- Mobile Settings now submits the request through `submitMobileDeletionRequest` (`/api/v1/data-deletion`), loads the current status with `fetchMobileDeletionStatus`, and renders the status label via `formatDeletionStatus`. It no longer calls `api.deleteMe` (immediate delete) and it is not an external-link-only flow. The public `/data-deletion` link remains available as an additional path.
- Evidence: `tests/unit/legal-pages-and-deletion.test.ts::1. Rejects missing or invalid email address`, `::2. Rejects request without typing DELETE confirmation`, `::3. Successfully records data deletion request in DB and links userId if user exists`, `::4. Rejects incomplete contact form fields`, `::5. Successfully records contact message in form submission storage`; `tests/unit/data-deletion-queue.test.ts::Authenticated student request creates initial record`; `tests/unit/data-deletion-remediation.test.ts::a) posting the same deletion request twice returns the SAME id and leaves exactly one active row`, `::b) idempotency does not leak across users (one user's pending request is not reused for another)`, `::c) a COMPLETED request allows a new request (ASSUMPTION: only PENDING/IN_REVIEW are active)`, `::d) every admin transition writes exactly one AuditLog row; an invalid transition writes none`, `::e) every queue route returns 401 unauthenticated and 403 for non-admin (routes enumerated from disk)`, `::f) the authenticated status route returns 401 unauthenticated`; `apps/mobile/tests/data-deletion-module.test.ts::1. Constructs valid public data-deletion web URL`, `::2. Correctly formats and classifies all 4 deletion statuses`, `::3. submitMobileDeletionRequest calls /api/v1/data-deletion with payload`, `::4. fetchMobileDeletionStatus calls /api/v1/data-deletion GET`, `::5. Already-pending request is surfaced as existing (isExisting=true)`, `::6. API error is returned as a visible error string, not swallowed`, `::7. Unknown status falls back to a neutral label instead of crashing`, `::8. Settings screen really calls the authenticated deletion API and displays request status`.

**What was NOT tested live**
- Google Play Console Data Safety review submission and crawler verification.
- End-to-end deletion inside an installed Play Store APK.

**Exact environment variable names (read by code)**
- `NEXT_PUBLIC_APP_URL` — server-side base URL, e.g. `lib/actions/auth.ts:116`.
- `EXPO_PUBLIC_APP_URL` — mobile public deletion URL builder, `apps/mobile/src/lib/data-deletion.ts:20`.
- `NEXTAUTH_URL` — fallback base URL, e.g. `lib/actions/auth.ts:116`.

**Exact owner steps**
1. Play Console → Policy and programs → App content → Data safety.
2. Under **Delete account URL**, enter `https://<your-domain>/data-deletion` (the code default canonical domain is `aspirantbook.com`; the owner must confirm the production domain).
3. Verify the URL is publicly reachable without login.
4. Submit the release for review.

**Expected result**
- The crawler receives HTTP 200 with visible deletion instructions.
- The Data Safety account-deletion requirement is marked **Compliant**.
- In-app: Settings → Security shows "Deletion request: Pending Review" (or the current status) after submission.
