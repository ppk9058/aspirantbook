# Launch & Deployment Checklist (Pass 8)

## 1. Database Migration
- Migration file: `prisma/manual-sql/20261005_coupons.sql`
- Additive only:
  - New table `Coupon`
  - New table `CouponRedemption` with unique index on `paymentId`
  - Added nullable columns to `Payment`: `couponId`, `couponCode`, `originalAmount`, `discountAmount`
  - Indexes created for fast lookup and concurrency isolation:
    - `Coupon(code)`
    - `Coupon(courseId)`
    - `CouponRedemption(couponId)`
    - `CouponRedemption(userId)`
    - `CouponRedemption(status, expiresAt)`
    - `Payment(couponId)`
- Dev DB status: Migration executed and verified against `DIRECT_URL`.
- Prod Deployment Step:
  ```bash
  # Run additive SQL against production DB
  psql "$DATABASE_URL" -f prisma/manual-sql/20261005_coupons.sql
  # Or via prisma migrate deploy if integrated into migration history
  ```

## 2. Environment Variables
Ensure the following variables are defined in the production hosting environment (.env / Vercel):
- `DATABASE_URL`: Production connection pooled connection string.
- `DIRECT_URL`: Direct PostgreSQL connection string for Prisma migrations.
- `RAZORPAY_KEY_ID`: Live Razorpay Key (`rzp_live_...`).
- `RAZORPAY_KEY_SECRET`: Live Razorpay Key Secret.
- `RAZORPAY_WEBHOOK_SECRET`: Secret configured in Razorpay Webhooks dashboard.
- `NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL`: Set to `true` (maintains mobile shell below 1024px).

## 3. Deprecated Endpoints (HTTP 410 Gone)
- `/api/checkout/razorpay` -> Permanently returns HTTP 410 Gone.
- `/api/checkout` -> Permanently returns HTTP 410 Gone.
- Both routes recommend `/api/checkout/coupon/preview` and `createRazorpayOrder` server action (`lib/actions/payment/razorpay.ts`).

## 4. Security & Access Control Hardening
- **Lock Leakage**: Unpaid viewers on `/courses/[slug]` receive sanitized course DTO with trial video and attachments stripped (`videoUrl: null`, `attachmentUrl: null`). Trial video preview is preserved only when loaded directly in the trial lesson player (`/courses/[slug]/learn/[lessonId]`).
- **Draft Course Gate**: Draft courses return strict 404 for non-admin viewers across public pages, checkout, and API routes.
- **Razorpay Order Tampering**: `createRazorpayOrder` enforces strict server-side price lookup and validation. If `clientAmount` doesn't match `expectedPaise = finalPriceInRupees * 100`, the transaction is aborted with an error.
- **Coupon Concurrency**: High-concurrency coupon redemption uses `SELECT ... FOR UPDATE` row locks within a database transaction, guaranteeing `maxRedemptions` limits cannot be breached by parallel requests.
- **Paise Precision**: All discount and payment arithmetic is rounded down (`Math.floor`) in integer paise to avoid rounding discrepancies. Any coupon reducing final price below ₹1.00 (100 paise) is rejected.

## 5. Branch Tracking & Release Rule
- Main tracked upstream: `origin/trillionskill-standalone`
- Local `main` must always be pushed with explicit refspec:
  ```bash
  git push origin main:trillionskill-standalone
  ```
- **NEVER** push to `origin/main` (pinned to initial release commit `89c29690647f38c601f4b86399fe993f1a4d97ec`).
