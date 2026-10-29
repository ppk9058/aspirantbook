# Google OAuth & Mobile Token Security Documentation (Task B1)

**Date:** 2026-10-29  
**Branch:** `feat/launch-blockers`  
**Status:** **PROVEN** (5x consecutive passing test suite in `docs/evidence/raw/google-oauth-5x.txt`)  

---

## 1. Owner Configuration & Credentials Guide

To activate real Google OAuth in staging and production, the project owner must configure credentials in Google Cloud Console and set the corresponding environment variables.

### 1.1 Required Environment Variables

| Variable Name | Purpose | Example Value |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | Primary Web OAuth 2.0 Client ID | `1234567890-web.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Primary Web OAuth 2.0 Client Secret | `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx` |
| `GOOGLE_CLIENT_IDS` | Comma-separated allowlist of valid audience IDs (Web + Mobile) | `1234567890-web.apps.googleusercontent.com,1234567890-android.apps.googleusercontent.com,1234567890-ios.apps.googleusercontent.com` |

> **Security Note:** In production, do NOT commit secrets to git or `.env` files. Set them directly in your container environment or secret manager (e.g. AWS SSM / Doppler / Cloudflare Secrets).

---

## 2. Google Cloud Console Setup

1. **OAuth Consent Screen**:
   - User Type: External
   - Scopes: `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`
2. **Web Application Client**:
   - **Authorized JavaScript origins**:
     - `https://trillionskill.com`
     - `https://aspirantbook.com`
     - `http://localhost:3000` (Local dev)
   - **Authorized redirect URIs**:
     - `https://trillionskill.com/api/auth/callback/google`
     - `https://aspirantbook.com/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`
3. **Android Client (Mobile)**:
   - Package Name: `com.aspirantbook.mobile`
   - SHA-1 Certificate Fingerprint: Release keystore SHA-1
4. **iOS Client (Mobile)**:
   - Bundle Identifier: `com.aspirantbook.mobile`

---

## 3. Security Hardening & Defenses

1. **Strict Account Takeover Defense**:
   - Both Web (`signIn` callback in `auth.ts`) and Mobile (`verifyGoogleIdToken` in `lib/auth/google-token-verifier.ts`) strictly verify that Google reports `email_verified: true`.
   - If an attacker creates an unverified Google account claiming a victim's email address, sign-in is immediately aborted (returns 403 Forbidden on mobile, `false` on web).
   - `allowDangerousEmailAccountLinking: false` is strictly set in NextAuth configuration.
2. **Token Verification**:
   - Audience check: Token `aud` must match one of the authorized client IDs in `GOOGLE_CLIENT_IDS`.
   - Issuer check: Token `iss` must be `https://accounts.google.com` or `accounts.google.com`.
   - Expiry check: Expired tokens are rejected.
   - Deactivated accounts: If `user.isActive === false`, sign-in is rejected with 403 Forbidden.
3. **Idempotent Account Linking**:
   - If an existing user created via credentials/email signs in with a verified Google account, their `User` record is safely linked to an `Account` record with provider `google`, without duplicating user entities or resetting existing credentials.
