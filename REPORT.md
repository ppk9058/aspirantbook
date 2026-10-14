# Master Report: Auth, Security Hardening & SEO

**Branch:** `overnight-razorpay-dropdown-color`  
**Database:** Test DB (`trillionskill_test` at `127.0.0.1:54329`)  
**Environment:** `APP_ENV=test`  
**Execution Mode:** Fully Autonomous, Non-Destructive, Additive-Only  

---

## Baseline Test Execution (BEFORE)

### 1. Dedicated Real UI Login Form Spec (`tests/e2e/ui-login.spec.ts`)
```text
Running 2 tests using 1 worker
     1 …I form submits credentials, waits for hydration, and establishes session
  ✓  1 …ubmits credentials, waits for hydration, and establishes session (16.0s)
     2 …I form submits credentials, waits for hydration, and establishes session
  ✓  2 …ubmits credentials, waits for hydration, and establishes session (13.6s)
  2 passed (39.7s)
```

### 2. Profile Dropdown & Ranking Access Specs (`profile-dropdown.spec.ts`, `ranking-access.spec.ts`)
```text
Running 18 tests using 1 worker
  ✓   1 Profile dropdown (Task B) › PD-01: Guest on /books sees login button; no dropdown (1.1s)
  ✓   2 Student opens dropdown: sees My Profile, Settings, Sign Out, does NOT see My Purchase (8.3s)
  ✓   3 Logged-in student on /dashboard opens dropdown: sees My Purchase intact (3.0s)
  ✓   4 /books and /dashboard (Task B) › PD-04: Works on 375px mobile viewport (2.3s)
  ✓   5 Deduplicates attempts to first score, and resolves ties deterministically (3.0s)
  ✓   6 Matches leaderboard rank identically for every student including real tie (4.5s)
  ✓   7 Guest on /leaderboard, solutions or result: receives login gate and no data leaks (14.2s)
  ✓   8 Privileged (TEACHER/ADMIN) result page displays 'Preview attempt: rank not counted' (2.6s)
  ✓   9 Public API route yields canonical rank, and questions route does not reveal answers (5.5s)
  ✓  10 [Mobile] Profile dropdown (Task B) › PD-01: Guest on /books sees login button; no dropdown (802ms)
  ✓  11 [Mobile] Student opens dropdown: sees My Profile, Settings, Sign Out (1.8s)
  ✓  12 [Mobile] Logged-in student on /dashboard opens dropdown: sees My Purchase intact (179ms)
  ✓  13 [Mobile] /books and /dashboard (Task B) › PD-04: Works on 375px mobile viewport (1.6s)
  ✓  14 [Mobile] Deduplicates attempts to first score, and resolves ties deterministically (662ms)
  ✓  15 [Mobile] Matches leaderboard rank identically for every student including real tie (1.5s)
  ✓  16 [Mobile] Guest on /leaderboard, solutions or result: receives login gate and no data leaks (3.6s)
  ✓  17 [Mobile] Privileged (TEACHER/ADMIN) result page displays 'Preview attempt: rank not counted' (4.5s)
  ✓  18 [Mobile] Public API route yields canonical rank, and questions route does not reveal answers (2.2s)
  18 passed (1.1m)
```

### 3. Baseline TypeScript (`npx tsc --noEmit`)
- Total legacy errors: 75 errors in 17 files.
- Relevant baseline errors noted:
  - `lib/actions/admin/users.ts:185`: Type '"MANUAL"' not assignable to 'PaymentProvider'.
  - `lib/actions/user/profile.ts`: 10 errors due to referencing non-existent fields (`bio`, `avatarUrl`, `notificationPrefs`, `privacySettings`).

### 4. Baseline Lint (`npm run lint`)
- 0 errors, existing warnings only (`next/image`, hook dependencies).

---

## Step 1: Current Auth Audit & Architecture Map

| Auth Flow | Status | Reason & Exact Findings |
| :--- | :--- | :--- |
| **Credentials Login** | Partial / Fragile | Form in `components/auth/LoginForm.tsx` submits via `signIn("credentials")`. Email is not trimmed/lowercased. Does not observe `callbackUrl` query param (hardcodes redirect to `/dashboard`, `/admin`, or `/teacher`). Lacks rate-limiting (no lockout after repeated failed attempts). |
| **Mobile OTP Login** | Dev/Test Bypass Only | Implemented in `components/auth/MobileAuthModal.tsx` & `app/api/auth/mobile-login/route.ts`. Only enabled in dev/test via `ALLOW_DEV_MOBILE_LOGIN=true` or local test DB. In production, SMS gateway is not yet integrated. |
| **Social Login (Google)** | Broken / Stub | Button in `components/auth/LoginForm.tsx` and `RegisterForm.tsx` triggers browser `alert()`. No provider configured in NextAuth (`auth.ts`). |
| **Registration** | Partial / Insecure | Server action `register` in `lib/actions/auth.ts`. Only takes `name, email, password`. Does not normalize email. Lacks phone & goal fields. Weak password policy (min 6 chars, no common password blocklist). No email verification token or email sent. No rate limiting on registration endpoint. |
| **Forgot Password** | Missing / Broken | Link in `LoginForm.tsx` is `<a href="#">Forgot password?</a>`. Route `/forgot-password` does not exist. No token generation, DB model, or email delivery. |
| **Reset Password** | Missing | Route `/reset-password` does not exist. No token validation, expiry check, single-use invalidation, or session revocation logic exists. |
| **Email Verification** | Missing | `User` table lacks `emailVerified`. No verification token model. No verification banner, resend endpoint, or checkout purchase gate. |
| **Logout** | Partial | Calls `signOut()`. Does not invalidate sessions on other devices. No `sessionVersion` or `tokenVersion` on `User` to revoke active JWT tokens when password/role changes or user requests "log out all devices". |
| **Session Handling (NextAuth v5)** | Functional | JWT strategy. `auth.ts` jwt callback stores `id, role, phoneNumber, subscriptionStatus, lastRoleSync`. Syncs role from database periodically (every 5 mins). Lacks tokenVersion check for revocation. |
| **Role Checks** | Functional | Roles: `FREE`, `PREMIUM`, `TEACHER`, `ADMIN`. Enforced in middleware for `/admin` and `/teacher`. Inconsistent enforcement across some API routes (some lack server-side auth or IDOR checks). |
| **Middleware Route Protection** | Functional | In `middleware.ts`, protects `/admin`, `/teacher`, `/profile`, `/settings`, `/subscription`, `/purchases`, `/learn`, `/assessments`, etc. Sanitizes return paths using `sanitizeReturnPath`. |
| **Admin User Management** | Partial / Has Errors | In `lib/actions/admin/users.ts` and `app/admin/users/`. Has TypeScript compilation error (`provider: "MANUAL"`). Missing audit logging, deactivate/block functionality, last-admin protection, and CSV export. |

### Mobile Dev Bypass Conditions & Production Confirmation
In `auth.ts` and `app/api/auth/mobile-login/route.ts`:
```ts
const isProduction = process.env.NODE_ENV === "production"
let isLocalTestDb = false
try {
    const dbUrl = process.env.DATABASE_URL || ""
    const parsed = new URL(dbUrl)
    isLocalTestDb = (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.pathname.endsWith("_test")
} catch {
    isLocalTestDb = false
}
const isDevBypassEnabled =
    (!isProduction && process.env.ALLOW_DEV_MOBILE_LOGIN === "true") ||
    (process.env.APP_ENV === "test" && isLocalTestDb)
```
**Safety Guarantee:**
1. In production (`NODE_ENV=production`), `!isProduction` evaluates to `false`.
2. Even if `APP_ENV=test` were accidentally set in production, `isLocalTestDb` strictly inspects `DATABASE_URL` hostname (`127.0.0.1` / `localhost`) and ensures the database name ends with `_test`.
3. In Step 7, we will add an unconditional override: if `process.env.NODE_ENV === "production"` or database is not local test, the bypass is strictly disabled (`return null` / 503).

---

## Step 2: Login Hardening & Reliability

### What was broken
1. Credentials login did not trim or lowercase email addresses, causing login failure if user entered mixed-case or whitespace.
2. `callbackUrl` was completely ignored: after login, users were always redirected to hardcoded routes (`/dashboard`, `/admin`, or `/teacher`), dropping the learner's intended destination and failing open-redirect defense requirements.
3. No rate limiting or lockout existed: an attacker could attempt unlimited password guesses.
4. Guest checkout and login modal did not offer credentials authentication, only mobile OTP.
5. Error messages did not cleanly differentiate between standard invalid credentials, temporary lockouts, and deactivated accounts.

### What changed
1. **Email Normalization:** Implemented `email.trim().toLowerCase()` consistently across `auth.ts`, `LoginForm.tsx`, and `RegisterForm.tsx`.
2. **Lockout & Rate Limiting (`lib/auth/rate-limiter.ts`):**
   - Configured atomic PostgreSQL-backed lockout tracking in the `RateLimit` table and user record (`failedLoginAttempts`, `lockedUntil`).
   - Threshold: Max 5 failed attempts per `email + IP` in a 15-minute window (900 seconds).
   - Once locked, returns `account_locked` error code and user-facing alert: *"Too many failed attempts. Your account has been temporarily locked for 15 minutes. Please try again later or reset your password."*
   - Successful credentials authentication clears the failure counters and lockout state immediately.
3. **Open-Redirect Protection & Target Routing:**
   - In `LoginForm.tsx`, extracted `callbackUrl` from search parameters.
   - Sanitized via `sanitizeReturnPath(callbackUrl, "")`, rejecting external URLs (e.g. `https://evil.com`), protocol-relative links (`//evil.com`), and backslash injections.
   - If clean internal URL is provided, navigates directly to destination; otherwise uses role landing page (`/admin`, `/teacher`, or `/dashboard`).
4. **Shared Modal & Popup Login:**
   - Added mode tabs to `MobileAuthModal.tsx` ("Mobile OTP" and "Email & Password").
   - Integrated `<LoginForm isModal={true} />` inside `MobileAuthModal` so guest checkout, course cards, and full `/login` page share identical credentials logic, error handling, and redirection.
5. **Session Flags & Security:**
   - NextAuth JWT strategy configured with 30-day maxAge, `httpOnly: true`, `sameSite: "lax"`, and `secure` in production.

### Files Touched
- `lib/auth/rate-limiter.ts` (new)
- `auth.ts`
- `auth.config.ts`
- `types/next-auth.d.ts`
- `components/auth/LoginForm.tsx`
- `components/auth/MobileAuthModal.tsx`
- `app/(auth)/login/page.tsx`
- `tests/e2e/login-hardening.spec.ts` (new)

### Tests Added & Proof
- `tests/e2e/login-hardening.spec.ts`:
  1. `Email normalization: mixed-case and leading/trailing whitespace logs in reliably` (Passed desktop & mobile)
  2. `Show/hide password toggles visibility correctly` (Passed desktop & mobile)
  3. `Open redirect prevention: evil callbackUrl rejected, safe callbackUrl respected` (Passed desktop & mobile)
  4. `Rate-limiting & Lockout: 5 failed attempts locks account for 15 minutes with clear error` (Passed desktop & mobile)
- Dedicated baseline `tests/e2e/ui-login.spec.ts`: Passed (2 passed, 23.4s).

---

## Step 3: Registration and Email Verification

### What was broken
1. Passwords accepted in registration had no policy validation beyond length >= 6. Weak/common passwords like `password123` were accepted.
2. Email verification was entirely non-existent: no verification tokens, no outbox mechanism for dev/test, and no email verification page.
3. Phone number and target exam/goal inputs were missing from registration form.
4. Duplicate phone numbers and duplicate accounts were not handled with clear messages.
5. Unverified users had no visual indicator or banner informing them about their unverified status.
6. Server-side purchase flow lacked verification guardrails.

### What changed
1. **Password Policy (`lib/auth/password-policy.ts`):**
   - Minimum 8 characters required.
   - Enforced common-passwords blocklist checking (rejects `password123`, `admin123`, `qwerty123`, etc.).
   - Secure Bcrypt cost 12 hashing.
2. **Cryptographic Tokens & Email Outbox (`lib/auth/tokens.ts`, `lib/email.ts`):**
   - Cryptographically random 32-byte tokens generated via `crypto.randomBytes(32).toString("hex")`.
   - Stored in test DB as SHA-256 hash (`EmailVerificationToken`) with 24-hour expiry and single-use flag. Prior active tokens are invalidated.
   - Provider interface in `lib/email.ts`: in dev & test environments, emails are appended to `logs/dev-email-outbox.jsonl` (gitignored), enabling deterministic test reading.
3. **Registration Form & Action (`components/auth/RegisterForm.tsx`, `lib/actions/auth.ts`):**
   - Added fields for full name, normalized email (trim, lowercase), password (min 8 chars with visual strength indicator), optional 10-digit phone, and target goal selection (`UPSC`, `SSC`, `CODING_TECH`, etc.).
   - Client and server validation with Zod.
   - Protected with IP rate limiting (Postgres-backed `RateLimit` table).
   - Prevents duplicate accounts (case-insensitive email and unique phone).
4. **Email Verification Page (`app/(auth)/verify-email/page.tsx`):**
   - Validates `token` query parameter, activates user account by marking `emailVerified: new Date()`, and consumes token.
   - Handles invalid, expired, and reused tokens with friendly error states.
   - Includes `<ResendVerificationForm />` with rate limiting (max 3 per hour per email/IP) and safe generic responses against email enumeration.
5. **Dashboard Unverified Email Banner (`components/auth/UnverifiedEmailBanner.tsx`):**
   - Embedded directly in `DashboardShell.tsx`.
   - Displays clear reminder if authenticated user has `!emailVerified`, with one-click "Resend verification link" button and dismiss button.
6. **Purchase Guard (`lib/actions/payment/razorpay.ts`):**
   - Added `REQUIRE_EMAIL_VERIFICATION_FOR_PURCHASE` config check (defaulting to `false` for backwards compatibility). When enabled, blocks unverified users from order creation.

### Files Touched
- `lib/auth/password-policy.ts` (new)
- `lib/auth/tokens.ts` (new)
- `lib/email.ts` (new)
- `lib/actions/auth.ts`
- `components/auth/RegisterForm.tsx`
- `components/auth/ResendVerificationForm.tsx` (new)
- `components/auth/UnverifiedEmailBanner.tsx` (new)
- `components/layout/DashboardShell.tsx`
- `app/(auth)/verify-email/page.tsx` (new)
- `lib/actions/payment/razorpay.ts`
- `tests/e2e/registration.spec.ts` (new)

### Tests Added & Proof
- `tests/e2e/registration.spec.ts`:
  1. `Rejects short password (< 8 chars) with clear policy error` (Passed desktop & mobile)
  2. `Rejects common easily guessed password with clear error` (Passed desktop & mobile)
  3. `Successfully registers new user, writes verification email to dev outbox, and redirects` (Passed desktop & mobile)
  4. `Duplicate registration with same email is rejected with clear message` (Passed desktop & mobile)
  5. `Unverified user sees verification banner in dashboard with resend functionality` (Passed desktop & mobile)
- Total: 10 passed in 35.6s.

---

## Step 4: Forgot Password and Reset Password

### What was broken
1. The "Forgot password?" link on the login screen did not have an active page (`/forgot-password` returned a 404).
2. No token generation or storage model existed for password resets.
3. No email dispatcher or reset password confirmation page existed (`/reset-password` returned a 404).
4. No protection existed against user enumeration via password reset requests.
5. No invalidation of existing active sessions occurred upon password change, allowing compromised sessions to persist indefinitely.

### What changed
1. **Cryptographic Reset Tokens (`lib/auth/tokens.ts`):**
   - Generated using `crypto.randomBytes(32).toString("hex")`.
   - Stored in the database as SHA-256 hashes (`PasswordResetToken` table).
   - 30-minute expiry window (`RESET_TOKEN_EXPIRY_MS = 1800000`).
   - Single-use flag (`used: true`); requesting a new token automatically invalidates any existing unused tokens for that email.
2. **Email Notification Service (`lib/email.ts`):**
   - Outbox mechanism in dev and test: writes to `logs/dev-email-outbox.jsonl` (gitignored) with token and link for automated E2E verification.
   - Provider interface configured for Resend via HTTPS fetch in production environments.
   - Automatically sends a security notification ("Your password was changed") when reset succeeds.
3. **Forgot Password Flow (`app/(auth)/forgot-password/page.tsx`, `components/auth/ForgotPasswordForm.tsx`):**
   - Rate-limited per IP (5/hour) and per email (3/hour) via PostgreSQL `RateLimit` table.
   - Strictly uniform generic response: *"If an account with that email exists, we have sent a password reset link to your inbox."* completely prevents user enumeration.
4. **Reset Password Flow (`app/(auth)/reset-password/page.tsx`, `components/auth/ResetPasswordForm.tsx`):**
   - Validates `token` query param before rendering form; invalid, expired, or previously used tokens display an explicit alert with a link to request a new reset.
   - Enforces password policy: minimum 8 characters, common-passwords blocklist.
   - On submission, hashes password with Bcrypt (cost 12), consumes token atomically, increments user's `sessionVersion` (invalidating all sessions across all devices), and clears any lockout counters.
   - Displays success state and redirects to `/login`.

### Files Touched
- `lib/actions/auth.ts`
- `components/auth/ForgotPasswordForm.tsx` (new)
- `components/auth/ResetPasswordForm.tsx` (new)
- `app/(auth)/forgot-password/page.tsx` (new)
- `app/(auth)/reset-password/page.tsx` (new)
- `tests/e2e/forgot-reset-password.spec.ts` (new)

### Tests Added & Proof
- `tests/e2e/forgot-reset-password.spec.ts`:
  1. `Forgot password link navigates from login page to /forgot-password` (Passed desktop & mobile)
  2. `Non-existent email returns identical success response (anti-enumeration)` (Passed desktop & mobile)
  3. `Full flow: request reset, read token from dev outbox, reset password, verify login` (Passed desktop & mobile)
  4. `Invalid reset token displays invalid link error` (Passed desktop & mobile)
  5. `Reset password enforces password policy (rejects weak/short password)` (Passed desktop & mobile)
- Total: 10 passed in 43.8s.



