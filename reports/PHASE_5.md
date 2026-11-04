# PHASE 5 — Payments, coupons and entitlements

Branch `final-verify`. All runtime checks ran in-process (or against the local
dev server on `127.0.0.1:3048`) with `127.0.0.1:54329/launch_verify`; the
harness asserts host, port and database name before connecting. No request was
sent to Razorpay or Stripe: no provider credentials are configured, so live
checkout and live webhook delivery are **NOT TESTED**.

Legend: DONE / PARTIAL / SKIPPED / NOT TESTED / FAILED / NOT FOUND.

## 5.1 Provider configuration fails closed — DONE

Raw: `reports/EVIDENCE/p5-prod-failclosed.txt`.

With `APP_ENV=development`, no `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`:

```
mode=unconfigured keyId=null isTestMode=false
PASS | getRazorpayClient throws when unconfigured (no placeholder key)
PASS | createRazorpayOrder fails loudly outside test mode (payments before=0 after=0)
```

- `getRazorpayClient` (`lib/payments/razorpay-config.ts:36-70`) throws instead of
  falling back to a placeholder secret; there is no mock-order path unless
  `APP_ENV=test` or `NODE_ENV=test` (`:30-32`).
- A failed provider call writes no `Payment` row (before/after counts equal).
- The test-only mock path is fenced twice: `validateBootSecurity` refuses
  `APP_ENV=test` with a non-local or non-`_test` database
  (`lib/boot-guard.ts:29-49`), and `lib/prisma.ts:44` runs
  `assertTestDatabase` (host `127.0.0.1`, allow-listed port, DB name ending
  `_test`) before the client is created.
- Stripe: `app/api/webhooks/stripe/route.ts:7-16` returns 500 when
  `STRIPE_WEBHOOK_SECRET` is missing; `getStripeClient` throws when
  `STRIPE_SECRET_KEY` is missing/blank. Raw:
  `reports/EVIDENCE/p5-stripe-webhook-http.txt` (`500 Webhook secret not configured`)
  and section 5.8.

## 5.2 Payment signature verification — DONE

Raw: `reports/EVIDENCE/p5-payments-proof.txt` (sections 1–2).

`verifyRazorpaySignature` = HMAC-SHA256 over `"<orderId>|<paymentId>"` with
`RAZORPAY_KEY_SECRET`, compared with `crypto.timingSafeEqual` after a length
check (`lib/payments/razorpay.ts:80-103`). `verifyRazorpayWebhookSignature`
uses `RAZORPAY_WEBHOOK_SECRET` over the raw body and never falls back to the key
secret (`:105-125`).

| case | expected | observed |
| --- | --- | --- |
| valid payment signature | true | true |
| tampered payment id | false | false |
| tampered order id | false | false |
| signature from another secret | false | false |
| short / empty / non-hex signature | false, no throw | false |
| `RAZORPAY_KEY_SECRET` missing | false | false |
| valid webhook body signature | true | true |
| body modified after signing | false | false |
| key secret used as webhook secret | false | false |
| `RAZORPAY_WEBHOOK_SECRET` missing | false | false |

## 5.3 Webhook endpoint — DONE

Raw: `reports/EVIDENCE/p5-payments-proof.txt` (section 3),
`reports/EVIDENCE/p5-enroll-http.txt` (HTTP).

Both `/api/webhooks/razorpay` (canonical) and `/api/razorpay/webhook` (legacy
alias) delegate to `handleRazorpayWebhook`
(`lib/payments/razorpay-webhook.ts:1-25`), so there is one signature check and
one fulfilment path.

| request | result |
| --- | --- |
| HTTP, no `x-razorpay-signature` (both URLs) | 400 `No signature` |
| HTTP, forged signature, no secret configured | 500 `Webhook secret not configured` |
| handler, secret unset | 500 fail closed |
| handler, invalid signature | 400 `Invalid signature` |
| handler, valid signature, `created_at` 1 h old | 400 replay window |
| handler, valid signature, unknown order | 200 `Unknown order record; enrollment skipped` |
| same event id delivered twice | 200 `duplicate: true`, second write skipped |
| handler, valid signature, wrong amount | 200 `Amount mismatch; enrollment skipped` |
| handler, valid signature, valid capture | 200, payment COMPLETED, enrolment created |
| second delivery of a captured payment (new event id) | 200, still one payment and one enrolment |

Notes (reviewed, no change):

- The webhook derives `userId`, `courseId`, `plan` and expected amount from the
  **server-side `Payment` row**, not from the payload. A payload that claimed
  `notes.courseId = fv-free-b` and `notes.userId = attacker` still enrolled the
  DB order's course for the DB order's user (proof in section 5 of the raw file).
- `/api/razorpay/webhook` is not in `CSRF_EXEMPT_PREFIXES`
  (`middleware.ts:11-17`), but real provider callbacks carry no session cookie
  and the origin guard only applies to cookie-bearing requests, so this is not a
  functional block. It also means a browser request with a session is
  origin-checked before the signature check — defence in depth.
- On an unexpected handler error the event row is deleted so the provider can
  retry (`razorpay-webhook.ts:196-203`).

## 5.4 Price integrity — DONE

Raw: `reports/EVIDENCE/p5-payments-proof.txt` (section 4).

The order amount is always computed from the database
(`lib/actions/payment/razorpay.ts:69-120`, `:205-224`); a client `amount` is only
compared, never used.

| case | result |
| --- | --- |
| ₹1999 course, client sends `amount: 1` | rejected `Tampered amount detected` |
| ₹1999 course, client sends `amount: 1999` | order amount = 199900 paise (DB price) |
| ₹1999 course, client sends no amount | order amount = 199900 paise |
| free course (`price 0`, `isPremium false`) | rejected `Cannot create payment order for free course` |
| DRAFT course | rejected `Course not found for payment order` |
| already-enrolled user | rejected `User is already enrolled in this course` |
| premium course with `price 0` (`fv-pub-a`) | order amount follows the stored price (0); data issue, not a bypass (see HUMAN DECISIONS) |

## 5.5 Coupons — DONE

Raw: `reports/EVIDENCE/p5-payments-proof.txt` (sections 4b–5).

Coupon validation and reservation happen inside a transaction with
`SELECT … FOR UPDATE` on the coupon row
(`lib/actions/payment/razorpay.ts:120-199`); the SQL uses bind parameters.

| case | result |
| --- | --- |
| 10% coupon on ₹1999 (cap ₹500) | order 179910 paise; original 199900, discount 19990 |
| reservation row | `RESERVED`, expires in 30 min |
| same user reuses `perUserLimit = 1` coupon | `Invalid or expired coupon` |
| unknown coupon code | `Invalid or expired coupon` |
| capture webhook | reservation becomes `REDEEMED` |
| `payment.failed` webhook | payment `FAILED`, reservation `RELEASED` |

## 5.6 Fulfilment and entitlements — DONE

Raw: `reports/EVIDENCE/p5-payments-proof.txt` (sections 5–8).

`fulfilPaymentOrder` (`lib/payments/fulfilment.ts`) locks the `Payment` row
`FOR UPDATE`, asserts ownership/course/amount/currency, is idempotent on replay,
and fulfils either a course enrolment or a subscription in one transaction.

| assertion | result |
| --- | --- |
| another user fulfils the order | 403 `Order ownership mismatch` |
| course swapped against the stored order | 400 `Order course mismatch` |
| lower amount supplied at verify time (100 paise) | 400 `Amount mismatch` |
| unknown order | 404 `not found` |
| course capture | `Enrollment` created once, `Payment` COMPLETED, `amountMinor = 179910` |
| replay with a new event id | no second payment, no second enrolment |
| MONTHLY capture | `Subscription` ACTIVE with future `endDate`, user role `PREMIUM` |
| replay of the subscription capture | still exactly one subscription |
| `payment.failed` | pending payment `FAILED`, coupon `RELEASED` |

## 5.7 Enrolment routes — DONE

Raw: `reports/EVIDENCE/p5-enroll-http.txt`, `reports/EVIDENCE/p5-series-enroll.txt`.

`/api/courses/enroll` and `/api/courses/free-enroll` are the same handler
(`app/api/courses/free-enroll/route.ts:1`):

| request | result |
| --- | --- |
| anonymous, free course, no phone | 401 |
| signed-in FREE, paid course | 403 `requiresPayment: true` |
| signed-in FREE, premium course with `price 0` | 403 `requiresPayment: true` |
| signed-in FREE, DRAFT course | 404 |
| signed-in FREE, free course (1st) | 200, one enrolment |
| signed-in FREE, free course (2nd, other URL) | 200, still one enrolment |
| anonymous + phone number | 200, creates a FREE user and enrols (documented flow, see HUMAN DECISIONS) |

`/api/exam/series/enroll` entitlement gate
(`app/api/exam/series/enroll/route.ts:46-90`):

| request | result |
| --- | --- |
| anonymous | 401 |
| FREE user, `enrollType: FREE` on a PRO series | 403 |
| FREE user, `PASS` without payment/subscription | 402 |
| FREE user, `PURCHASED` without payment/subscription | 402 |
| PREMIUM user, `PURCHASED` | 200 |

## 5.8 Entitlement decisions — DONE

Raw: `reports/EVIDENCE/p5-entitlements.txt` (13/13 pass).

`checkTestAccess` (`lib/auth/entitlements.ts:20-110`) against a PRO test:

| principal | decision |
| --- | --- |
| anonymous | LOCKED |
| FREE, no subscription / enrolment | LOCKED |
| ADMIN | ADMIN_OVERRIDE |
| TEACHER | TEACHER_ACCESS |
| FREE + ACTIVE subscription | SUBSCRIPTION_ACTIVE |
| FREE + expired subscription only | LOCKED |
| FREE series enrolment (`enrollType FREE`) | LOCKED |
| PURCHASED series enrolment | PURCHASED |
| PURCHASED but expired `expiresAt` | LOCKED |

Stripe (`lib/payments/stripe.ts`): missing key → `isStripeConfigured()` false and
`getStripeClient()` throws; blank key treated as missing; a dummy key builds an
offline client without an API call.

## 5.9 Findings (not fixed)

1. **Dead “free premium upgrade” server action.**
   `lib/actions/user/subscription.ts:9-66` (`upgradeSubscription`) creates an
   ACTIVE `Subscription`, a COMPLETED `Payment` and sets `role: PREMIUM` with no
   payment verification. Grep finds **no importer** (only its own definition),
   so Next never registers it as a client-callable action — it is unreachable
   today. It is still a latent trap: wiring it to any UI would grant free
   premium. Recommended action: delete (needs approval; no files were deleted
   in this run).
2. **Stale unused plan constants.** `lib/payments/razorpay.ts:16-19` still says
   `MONTHLY: 1499, YEARLY: 14999`, while the live action charges ₹499 / ₹4,999
   (`lib/actions/payment/razorpay.ts:216-218`) and the UI shows ₹499 / ₹4,999.
   `RAZORPAY_PLANS` has no readers, so it does not affect billing; it should be
   removed or corrected before anyone imports it.
3. **Phone-only enrolment without OTP.**
   `app/api/courses/enroll/route.ts:44-75` creates a `FREE` user for any valid
   10-digit `phoneNumber` without an OTP. It grants no session and only free
   courses, and the repo's own QA matrix expects it (`lib/testing/qa-matrix-definitions.ts:159-160`).
   It does let an anonymous caller pre-create a row for someone else's phone
   number. Low impact; behaviour change belongs to the product owner.
4. **Premium course with a zero price.** `fv-pub-a` is `isPremium=true` with
   `price=0` (legacy data). The action prices it from the DB (0), so checkout
   would create a ₹0 order; real Razorpay rejects amounts below 100 paise. This
   is a data-quality issue; no code change.
5. **Teacher access is broader than the comment says.**
   `checkTestAccess` returns `TEACHER_ACCESS` for every TEACHER before the
   `test.createdById === userId` branch (`lib/auth/entitlements.ts:30-31` vs
   `:58-60`). Staff-only impact; documented, not changed.

## 5.10 Doc correction — DONE

`docs/verify-launch/REPORT.md:150` listed
`MESSAGECENTRAL_CUSTOMER_ID`, `MESSAGECENTRAL_AUTH_TOKEN` and
`MESSAGECENTRAL_SENDER_ID`. The code reads `MESSAGE_CENTRAL_CUSTOMER_ID` and
`MESSAGE_CENTRAL_AUTH_KEY`
(`lib/services/sms-otp/message-central.adapter.ts:43-44`,
`lib/boot-guard.ts:102-103`); the sender is configured in the provider dashboard,
not through an env var. The checklist line was corrected.

## HUMAN DECISIONS

1. Delete the dead `upgradeSubscription` action (`lib/actions/user/subscription.ts`).
2. Remove or correct `RAZORPAY_PLANS` in `lib/payments/razorpay.ts:16-19`.
3. Keep or remove OTP-less phone enrolment (`app/api/courses/enroll/route.ts`).
4. Fix or archive the `price=0` premium course fixture/legacy rows in production data.
5. Real Razorpay/Stripe checkout, captures, refunds and dashboard-delivered
   webhooks remain NOT TESTED (no provider credentials in this environment).

## Status summary

| item | status |
| --- | --- |
| Provider config fail-closed (Razorpay/Stripe) | DONE |
| Payment signature + webhook signature matrix | DONE |
| Webhook guards, replay window, idempotency | DONE |
| Server-authoritative pricing | DONE |
| Coupon validation, reservation, redeem/release | DONE |
| Course + subscription fulfilment | DONE |
| Ownership/course/amount assertions | DONE |
| Free vs paid enrolment routes | DONE |
| Test-series entitlement decisions | DONE |
| Real provider checkout/capture | NOT TESTED |
| Dead mock `upgradeSubscription` | NOT FOUND as reachable (dead code, HUMAN DECISION) |
