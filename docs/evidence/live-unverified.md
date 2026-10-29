# LIVE-UNVERIFIED Integration Register

**Task:** G7  
**Date:** 2026-10-29  
**Branch:** `feat/launch-blockers`  
**Purpose:** Comprehensive register of third-party external integrations that cannot be verified against live production APIs in CI/local test environments. Documents what was verified using deterministic mocks and test doubles, what remains unverified against live endpoints, the exact environment variable names required, step-by-step owner actions for live verification, and expected observable results.

> [!IMPORTANT]
> In accordance with the Project Rules and Safe Harbor protocols:
> 1. No live production credentials, tokens, or private keys were touched, committed, or exposed.
> 2. Zero invented IDs or fake secrets are present in this document.
> 3. All production credentials must be supplied via secure secret management (AWS SSM, Cloudflare Secrets, Doppler, or platform environment variables).

---

## Integration Matrix

| Integration | Primary File(s) | Status | Test Harness / Mocking Strategy |
| :--- | :--- | :---: | :--- |
| **1. Google OAuth (Web + Mobile)** | `auth.ts`, `app/api/v1/auth/google/route.ts`, `lib/auth/google-token-verifier.ts` | `LIVE-UNVERIFIED` | Local RS256 JWK pair generating mock OpenID Connect ID tokens; verified audience allowlisting, expiration, and email_verified guards. |
| **2. Razorpay Webhook** | `app/api/webhooks/razorpay/route.ts`, `lib/payments/razorpay-webhook.ts` | `LIVE-UNVERIFIED` | Unit test suite with HMAC-SHA256 signature generator using mock secret; verified replay window, timingSafeEqual, and deduplication. |
| **3. Brevo (Email Primary)** | `lib/email.ts`, `lib/email/outbox-worker.ts` | `LIVE-UNVERIFIED` | Global HTTP fetch interception and mock responses; verified JSON payload format, abort timeouts, and fallback triggering. |
| **4. Resend (Email Fallback)** | `lib/email.ts`, `lib/email/outbox-worker.ts` | `LIVE-UNVERIFIED` | Global HTTP fetch interception; verified Bearer token headers, payload format, and outbox persistence on double failure. |
| **5. Cloudflare Turnstile** | `lib/security/turnstile.ts`, `auth.ts`, `components/auth/LoginForm.tsx` | `LIVE-UNVERIFIED` | In-memory token verification stub and mock Cloudflare siteverify endpoint; verified credentials login failure when enabled. |
| **6. S3 / Cloudflare R2 Storage** | `lib/aws-s3.ts`, `lib/s3.ts`, `app/api/upload/route.ts` | `LIVE-UNVERIFIED` | Local MinIO S3-compatible service container; verified PutObject, GetSignedUrl presigning, and DeleteObject commands. |
| **7. Cloudflare CF-Connecting-IP & Origin Lock** | `lib/rate-limit.ts`, `lib/actions/auth.ts` | `LIVE-UNVERIFIED` | Synthetic request headers across IPv4/IPv6, malformed headers, and multi-hop X-Forwarded-For chains with TRUST_PROXY flags. |
| **8. Play Console Data-Deletion Link** | `app/data-deletion/page.tsx`, `apps/mobile/src/app/settings.tsx` | `LIVE-UNVERIFIED` | Static route rendering tests, authenticated API endpoint tests, and mobile pure logic unit test runner. |

---

## Detailed Integration Records

### 1. Google OAuth (Web + Mobile Token)

- **What was tested with mocks:**
  - Web: NextAuth Google provider registration and callback route resolution; session initialization upon mock user sign-in.
  - Mobile: `POST /api/v1/auth/google` with locally signed RS256 JWTs using an in-memory test key pair.
  - Audience filtering against `GOOGLE_CLIENT_IDS`, issuer validation (`accounts.google.com` and `https://accounts.google.com`), token expiration enforcement, and `email_verified: false` rejection (403 Forbidden).
  - Existing user email account linking vs. new user account creation in test DB.
- **What was NOT tested live:**
  - Live browser redirect flow to `https://accounts.google.com/o/oauth2/v2/auth`.
  - Live token exchange with Google OAuth2 token servers.
  - Live verification of Google ID tokens against Google's public JWKS endpoint (`https://www.googleapis.com/oauth2/v3/certs`).
  - Google Sign-In SDK on physical Android and iOS devices.
- **Exact environment variable names:**
  - `GOOGLE_CLIENT_ID` (Web client ID)
  - `GOOGLE_CLIENT_SECRET` (Web client secret)
  - `GOOGLE_CLIENT_IDS` (Comma-separated allowlist of valid audience IDs: Web + Android + iOS)
  - `AUTH_GOOGLE_ID` (Alternative NextAuth web client ID)
  - `AUTH_GOOGLE_SECRET` (Alternative NextAuth web client secret)
- **Exact owner steps to verify live:**
  1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
     - Configure OAuth Consent Screen with scopes `openid`, `email`, `profile`.
     - Create Web Application credentials; add authorized redirect URI `https://<your-domain>/api/auth/callback/google`.
     - Create Android credentials with package name `com.aspirantbook.mobile` and release keystore SHA-1 fingerprint.
     - Create iOS credentials with bundle identifier `com.aspirantbook.mobile`.
  2. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CLIENT_IDS` in production environment settings.
  3. Navigate to `https://<your-domain>/login` on desktop and click **Continue with Google**.
  4. Select a Google account and authorize the application.
  5. On mobile build, trigger Google Sign-In button and verify token dispatch to `/api/v1/auth/google`.
- **Expected result:**
  - User is successfully authenticated and redirected to `/dashboard` (or mobile home screen).
  - A `User` record exists with matching `email` and an `Account` record with `provider: "google"`.

---

### 2. Razorpay Webhook

- **What was tested with mocks:**
  - Signature verification using `crypto.createHmac("sha256", secret)` over raw request body text.
  - Timing attack defense via `crypto.timingSafeEqual`.
  - Replay attack rejection for webhooks with timestamps older than 300 seconds.
  - Idempotent deduplication in `RazorpayWebhookEvent` (duplicate `x-razorpay-event-id` returns 200 without reprocessing).
  - Fails closed with HTTP 500 when `RAZORPAY_WEBHOOK_SECRET` is missing.
- **What was NOT tested live:**
  - End-to-end payment creation on Razorpay Checkout live modal with real cards / UPI.
  - Actual delivery of webhook payload from Razorpay cloud IP servers to public `/api/webhooks/razorpay`.
  - Settlement processing and refunds via live Razorpay dashboard.
- **Exact environment variable names:**
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
- **Exact owner steps to verify live:**
  1. Log into [Razorpay Dashboard](https://dashboard.razorpay.com/) (Settings -> Webhooks).
  2. Add webhook URL `https://<your-domain>/api/webhooks/razorpay`.
  3. Enter a secure secret string and configure events: `payment.captured`, `order.paid`.
  4. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in environment variables.
  5. Perform a small live test payment (e.g. ₹1) or use Razorpay Webhook Test feature to send a test event payload.
- **Expected result:**
  - Webhook returns HTTP 200 `{"received": true}`.
  - Database contains an entry in `RazorpayWebhookEvent` marked `status: "PROCESSED"`.
  - Associated course/subscription enrollment is granted to the paying user.

---

### 3. Brevo (Email Primary Provider)

- **What was tested with mocks:**
  - REST API request creation targeting `https://api.brevo.com/v3/smtp/email`.
  - Custom header injection (`api-key`).
  - Formatting of sender and recipient objects in JSON payload.
  - Successful dispatch mock returning `{ messageId: "..." }`.
  - Network failure / non-200 HTTP response triggering automatic failover to Resend.
- **What was NOT tested live:**
  - Delivery to real inbox domains (Gmail, Outlook, Yahoo).
  - Brevo account domain SPF, DKIM, and DMARC DNS record verification.
  - Live transactional quota deduction on Brevo dashboard.
- **Exact environment variable names:**
  - `BREVO_API_KEY`
  - `EMAIL_FROM` (e.g. `AspirantBook <no-reply@aspirantbook.com>`)
  - `BREVO_API_URL` (Optional override; defaults to `https://api.brevo.com/v3/smtp/email`)
- **Exact owner steps to verify live:**
  1. Log into [Brevo](https://app.brevo.com/) -> Senders & IP -> Domains.
  2. Complete DNS domain validation (TXT records for SPF, DKIM, DMARC).
  3. Generate an API Key (v3) under SMTP & API -> API Keys.
  4. Configure `BREVO_API_KEY` and verified `EMAIL_FROM` on server.
  5. Trigger a live password reset email from `https://<your-domain>/forgot-password` to an external inbox.
- **Expected result:**
  - Brevo API returns HTTP 201 Created with a valid messageId.
  - Recipient inbox receives the email with proper styling and sender name.
  - Email contains zero spam warning banners thanks to aligned DKIM/SPF.

---

### 4. Resend (Email Fallback Provider)

- **What was tested with mocks:**
  - Automatic activation when `BREVO_API_KEY` is missing or when Brevo returns an HTTP error.
  - REST API request targeting `https://api.resend.com/emails` with `Authorization: Bearer ...`.
  - Successful dispatch mock returning `{ id: "..." }`.
  - Double-failure handling: persisting email to `EmailOutbox` table when both Brevo and Resend fail.
- **What was NOT tested live:**
  - Live HTTP transmission to Resend cloud edge servers.
  - In-flight fallback from live Brevo 5xx outage to Resend.
  - Inbox delivery and click tracking via Resend dashboard.
- **Exact environment variable names:**
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `RESEND_API_URL` (Optional override; defaults to `https://api.resend.com/emails`)
- **Exact owner steps to verify live:**
  1. Log into [Resend](https://resend.com/domains) and verify domain DNS records.
  2. Create an API Key in Resend dashboard.
  3. Set `RESEND_API_KEY` and unset `BREVO_API_KEY` (or point `BREVO_API_URL` to an invalid endpoint) in a test staging environment.
  4. Trigger a notification or verification email.
- **Expected result:**
  - Resend logs show an outbound email with HTTP 200/201.
  - The email lands in the recipient inbox.
  - Server logs confirm: `Sent via Resend fallback`.

---

### 5. Cloudflare Turnstile

- **What was tested with mocks:**
  - Feature flag gating via `TURNSTILE_ENABLED="true"` vs. `"false"`.
  - Fail-closed behavior: 500 Internal Error if enabled and `TURNSTILE_SECRET_KEY` is missing.
  - Validation failure: rejection of missing or invalid tokens on login, register, reset, and contact endpoints.
  - Bypassing NextAuth authorize endpoint directly without a valid Turnstile token fails.
  - Client component widget conditional rendering when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is present.
- **What was NOT tested live:**
  - Rendering and execution of `https://challenges.cloudflare.com/turnstile/v0/api.js` iframe challenge in live browser.
  - Real browser clearance tokens evaluated by Cloudflare's backend verification endpoint (`https://challenges.cloudflare.com/turnstile/v0/siteverify`).
- **Exact environment variable names:**
  - `TURNSTILE_ENABLED` (`"true"` | `"false"`)
  - `TURNSTILE_SECRET_KEY` (Cloudflare server-side secret key)
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Cloudflare public widget sitekey)
- **Exact owner steps to verify live:**
  1. In [Cloudflare Dashboard](https://dash.cloudflare.com/) -> Turnstile, add a new widget.
  2. Select Managed or Non-interactive mode; add your production and staging domains.
  3. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_ENABLED=true` in environment settings.
  4. Open `https://<your-domain>/login` in an Incognito browser window.
  5. Verify the Turnstile checkbox/widget renders, solves, and enables login submission.
- **Expected result:**
  - Cloudflare widget completes challenge with a checkmark.
  - Form submission passes server-side verification and logs the user in.
  - Submitting invalid/expired tokens results in a human-friendly "Security verification failed" message.

---

### 6. S3 / Cloudflare R2 Storage

- **What was tested with mocks:**
  - S3Client SDK instantiation with explicit credentials.
  - Presigned upload URL generation (`getSignedUrl` for `PutObjectCommand`).
  - Read/delete operations against a local MinIO test container.
  - Strict input validation rejecting traversal paths, invalid mime types, or files exceeding max size limits.
  - Fail-closed error throwing when required S3 credentials are missing.
- **What was NOT tested live:**
  - Direct PUT of large binary objects (e.g. 50MB PDFs or videos) from client browser to AWS S3 or Cloudflare R2 bucket.
  - Bucket CORS policies (`AllowedOrigins`, `AllowedHeaders`, `AllowedMethods: ["PUT"]`).
  - Bucket lifecycle policies, public access blocking, and CloudFront / custom domain CDN distribution.
- **Exact environment variable names:**
  - `AWS_ACCESS_KEY_ID` (or `S3_ACCESS_KEY`)
  - `AWS_SECRET_ACCESS_KEY` (or `S3_SECRET_KEY`)
  - `AWS_S3_BUCKET_NAME` (or `AWS_S3_BUCKET` or `S3_BUCKET`)
  - `AWS_REGION` (or `S3_REGION`, e.g. `auto` for Cloudflare R2 or `us-east-1` for AWS)
  - `AWS_ENDPOINT` (or `S3_ENDPOINT`, required for Cloudflare R2: `https://<accountid>.r2.cloudflarestorage.com`)
  - `AWS_S3_FORCE_PATH_STYLE` (or `S3_FORCE_PATH_STYLE`)
- **Exact owner steps to verify live:**
  1. In AWS Console (S3) or Cloudflare Dashboard (R2), create an object bucket.
  2. Apply CORS policy allowing `PUT`, `GET` from `https://<your-domain>`.
  3. Create an IAM User / R2 API Token with `ObjectRead` and `ObjectWrite` permissions.
  4. Set the exact environment variables in production.
  5. In the admin panel, upload a course thumbnail or avatar image.
- **Expected result:**
  - Client retrieves presigned URL from `/api/upload/presigned-url`.
  - Browser successfully uploads binary payload directly to bucket (HTTP 200).
  - Stored asset URL is saved in database and resolves properly in `<img>` tags.

---

### 7. Cloudflare CF-Connecting-IP & Origin Lock

- **What was tested with mocks:**
  - `getClientIp` resolver rejecting forwarded headers when `TRUST_PROXY !== "true"`.
  - When `TRUST_PROXY === "true"`:
    - Validating IPv4 and IPv6 formatting via `net.isIP`.
    - Rejecting malformed strings, directory traversals, and excessively long inputs (>256 chars).
    - Parsing right-most hop of `X-Forwarded-For` using `TRUST_PROXY_HOPS=1`.
- **What was NOT tested live:**
  - Live Cloudflare edge proxying live traffic to origin server.
  - Origin firewall blocking direct TCP connections from non-Cloudflare IP addresses.
  - Cloudflare Authenticated Origin Pulls (AOP) mTLS certificate validation.
- **Exact environment variable names:**
  - `TRUST_PROXY` (`"true"` | `"false"`)
  - `TRUST_PROXY_HOPS` (Integer string, default `"1"`)
- **Exact owner steps to verify live:**
  1. On origin host/firewall (AWS Security Group, UFW, or DigitalOcean Cloud Firewall), allow inbound ports 80/443 **ONLY** from Cloudflare IP ranges:
     - `https://www.cloudflare.com/ips-v4`
     - `https://www.cloudflare.com/ips-v6`
  2. Enable Cloudflare Proxy (orange cloud) on your DNS A/AAAA records.
  3. Set `TRUST_PROXY=true` and `TRUST_PROXY_HOPS=1` in the application environment.
  4. From an external machine, curl the origin IP directly on port 443 (e.g. `curl -k https://<origin-ip>`).
  5. Visit the site via the Cloudflare domain and check the server access logs or `/api/health`.
- **Expected result:**
  - Direct connection to the origin IP times out or is dropped by the firewall.
  - Legitimate domain traffic passes through Cloudflare and logs the exact client IP in `AuditLog` and rate-limiting keys, with zero spoofing capability.

---

### 8. Play Console Data-Deletion Link

- **What was tested with mocks:**
  - Public `/data-deletion` page renders with step-by-step instructions, account deletion form, and email fallback.
  - Authenticated `POST /api/v1/data-deletion` endpoint creates or returns existing active `DataDeletionRequest` (idempotent).
  - Mobile app `settings.tsx` link opening external browser to `/data-deletion`.
  - Mobile pure helper module `apps/mobile/src/lib/data-deletion.ts` tested with node test runner.
  - Admin management queue (`/admin/data-deletion`) allows reviewing and transitioning request states.
- **What was NOT tested live:**
  - Google Play Console Data Safety review submission and automated crawler verification.
  - End-to-end user initiating deletion inside the installed Android release APK from Google Play Store.
- **Exact environment variable names:**
  - `NEXT_PUBLIC_APP_URL` (or canonical brand domain URL, e.g. `https://aspirantbook.com`)
- **Exact owner steps to verify live:**
  1. Log into [Google Play Console](https://play.google.com/console).
  2. Navigate to **Policy and programs** -> **App content** -> **Data safety**.
  3. Under **Delete account URL**, enter: `https://<your-domain>/data-deletion`.
  4. Verify the link is publicly accessible without requiring user login to view instructions.
  5. Submit app release for review.
- **Expected result:**
  - Google Play policy automated crawler accesses `https://<your-domain>/data-deletion`, receiving HTTP 200 OK with visible deletion instructions.
  - Google Play Data Safety compliance status marks Account Deletion requirement as **Compliant**.
