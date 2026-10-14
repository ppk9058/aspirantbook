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
