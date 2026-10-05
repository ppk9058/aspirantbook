# Production Deployment Security Checklist

## 1. Authentication & OTP
- [ ] **OTP Provider Integration**: OTP verification is bypassed in dev. Before production: integrate an SMS provider (e.g. Fast2SMS / Twilio / MSG91), hash and expire OTPs, add attempt limits and rate limits, remove the bypass.
- [ ] **Disable Dev Bypass**: Ensure `ALLOW_DEV_MOBILE_LOGIN` is set to `false` or completely removed from production environment variables.
- [ ] **Boot-Time Guard**: Verify that `lib/boot-guard.ts` executes and confirms that any unconfigured provider halts startup if bypass is enabled in production.
- [ ] **NextAuth Secrets**: Ensure `AUTH_SECRET` and `NEXTAUTH_SECRET` are high-entropy (min 32 bytes) unique secrets per environment.

## 2. Database & Migrations
- [ ] **Direct Connection for Migrations**: Run `npx prisma migrate deploy` via Supabase direct connection (`DIRECT_URL`, port 5432) to bypass transaction pooler limits.
- [ ] **Automated Backups**: Enable Supabase Point-In-Time Recovery (PITR) and daily automated snapshots.

## 3. Payment Processing
- [ ] **Live Razorpay Keys**: Switch from `rzp_test_*` to `rzp_live_*` in production environment variables.
- [ ] **Webhook Secret**: Configure dedicated live webhook secret (`RAZORPAY_WEBHOOK_SECRET`) in Razorpay Dashboard.
