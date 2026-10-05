# PASS 9 QA Test Matrix

This matrix specifies all automated test journeys and assertions across desktop (1280x800) and mobile (390x844).

| ID | Persona | Precondition | Action | Expected | Automated By | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OTP-01** | Anonymous | Test mode on (dev) | Submit valid 10-digit mobile & 6-digit dev OTP | 200 OK + active user session | `scripts/test-step0-boot-guard.ts` | PASS |
| **OTP-02** | Anonymous | NODE_ENV=production, bypass on | Attempt app boot | Refuses to start, throws critical security error | `scripts/test-step0-boot-guard.ts` | PASS |
| **J1-01** | Anonymous | Course A published | Access course page `/courses/72nd-bpsc-prelims-current-affairs` | 200 OK, curriculum visible, no secrets leaked | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-02** | Anonymous | Course A has trial lesson | Access trial lesson `/learn/l_a_trial_step5` | 200 OK, public content accessible | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-03** | Anonymous | Course A has locked lesson | Access locked lesson `/learn/l_a_locked_step5` | 307 redirect or paywall, zero secret/video URL leak | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-04** | Anonymous | Course D in DRAFT status | Access draft page `/courses/draft-secret-course` | 404 Not Found or Access Gate | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-05** | Anonymous | Non-existent slug | Access `/courses/non-existent-course-slug-404` | 404 Not Found | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-01** | FREE | Unauthenticated | Login via mobile OTP flow | Returns valid session token | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-02** | Anonymous | Unauthenticated | Access callbackUrl open redirect vector `//evil.com` | Redirect sanitized to safe path | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-01** | FREE | Course A (Paid, ₹1999) | Access checkout `/checkout` with Course A | Displays correct title and ₹1999 price | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-02** | FREE | Valid coupon `STEP5_PERC20` | Preview coupon for Course A | Returns 200 with discount 20% (₹1599.20) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-03** | FREE | Expired coupon `STEP5_EXPIRED` | Preview coupon for Course A | Rejection with HTTP 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-01** | FREE | Course A (Paid, ₹1999) | Create order with tampered amount ₹10 | Server rejects amount tampering | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-02** | FREE | Valid order created | Call `/api/verify-payment/razorpay` with forged signature | HTTP 400 rejection | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-03** | Anonymous | None | Send webhook with forged HMAC signature | HTTP 400 rejection | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-04** | FREE | Valid order | Webhook captured x2 (replay) | Exactly 1 enrollment created (idempotent) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-01** | FREE | Course A (Paid) | Call `/api/courses/enroll` on paid course | HTTP 403 Forbidden | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-02** | FREE | Course A (Paid) | Call `/api/courses/free-enroll` on paid course | HTTP 403 Forbidden | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-03** | FREE | Free Course (₹0) | Call `/api/courses/enroll` on free course | HTTP 200 OK & enrolled | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-04** | FREE | Free Course (₹0) | Call `/api/courses/free-enroll` on free course | HTTP 200 OK & enrolled | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-05** | FREE | Course D (DRAFT) | Call `/api/courses/enroll` on draft course | HTTP 404 Not Found | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-01** | Student B | Enrolled in Course B only | Attempt to access locked lesson in Course A | Blocked / Paywall, zero video URL leak | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-01** | FREE | Test submitted by user | Access own attempt result `/api/exam/attempt/[id]/result` | HTTP 200 (Owner allowed) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-02** | Student B | Test submitted by other user | Attempt access to other's attempt result | HTTP 403 (Forbidden) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-01** | Anonymous | Public navigation | Crawl core links `/`, `/courses`, `/pricing`, `/login` | 200 OK, no 500s | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-01** | FREE | Course A | 5 parallel verify calls | Handled safely, single fulfillment | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-01** | FREE | Coupon `STEP5_PERC20` | 11 sequential preview requests from single IP | First 10 return 200, 11th returns 429 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-02** | FREE | Coupon `STEP5_PERC20` | 30 parallel preview requests from single IP | Exactly 10 return 200, 20 return 429 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-01** | FREE | Non-admin user | Attempt access to `/api/admin/run-analytics` | HTTP 401/403 Forbidden | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-01** | FREE | Profile endpoint | Attempt to mass-assign role to ADMIN | Role update ignored / forbidden | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-02** | Anonymous | None | Scan client bundles for secrets (`rzp_live`, `postgres://`) | Zero leaked secrets | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-01** | Anonymous | Desktop (1280x800) | Homepage and Course Page rendering | Zero uncaught console crashes | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-02** | Anonymous | Mobile (390x844) | Homepage and Course Page rendering | Zero uncaught console crashes, responsive layout | `scripts/run-pass9-qa-matrix.ts` | PASS |
