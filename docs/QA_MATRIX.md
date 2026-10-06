# PASS 9.3 Complete QA Test Matrix (All 310 Real Cases)

| ID | Persona | Method + URL | Expected Status | Assertion / Description | Automated Script | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OTP-01** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 200` | Valid dev mobile OTP login (must contain: "success":true) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-02** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 400` | Short phone number rejected (must contain: 10-digit) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-03** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 400` | Non-numeric phone rejected (must contain: 10-digit) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-04** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 400` | Too long phone rejected (must contain: 10-digit) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-05** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 400` | Empty payload rejected (must contain: 10-digit) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-06** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 200` | New student auto-created (must contain: student) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-07** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 200` | Dev OTP any 6-digit accepted (must contain: userId) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-08** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 200` | Paid course attached does not free enroll (must contain: success) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-09** | Anonymous | `POST /api/auth/mobile-login` | `HTTP 200` | Free course attached auto-enrolls (must contain: success) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **OTP-10** | Anonymous | `GET /login` | `HTTP 200` | Login page renders (must contain: Sign In) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-01** | Anonymous | `GET /courses/72nd-bpsc-prelims-current-affairs` | `HTTP 200` | Course overview page renders without secrets (must contain: 72nd BPSC Prelims Current Affairs) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-02** | Anonymous | `GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_trial_p9` | `HTTP 307` | Trial lesson redirects anonymous to login | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-03** | Anonymous | `GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9` | `HTTP 307` | Locked lesson redirects anonymous to login | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-04** | Anonymous | `GET /courses/draft-secret-course` | `HTTP 200` | Draft course renders 404 page for anon (must contain: 404 • Page Not Found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-05** | Anonymous | `GET /courses/non-existent-course-slug-404` | `HTTP 200` | Non-existent slug renders 404 page (must contain: 404 • Page Not Found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-06** | Anonymous | `GET /courses/c_invalid!@#` | `HTTP 200` | Malformed slug renders 404 page (must contain: 404 • Page Not Found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-07** | Anonymous | `GET /api/courses/draft-secret-course/media` | `HTTP 404` | Draft course media endpoint 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-08** | Anonymous | `GET /api/courses/draft-secret-course/lesson` | `HTTP 404` | Draft course lesson endpoint 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-09** | Anonymous | `GET /api/courses/draft-secret-course/demo-slots` | `HTTP 404` | Draft course demo-slots endpoint 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-10** | Anonymous | `GET /courses` | `HTTP 307` | Courses catalog requires login | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-11** | Anonymous | `GET /search?q=bpsc` | `HTTP 200` | Search returns published courses (must contain: 72nd BPSC Prelims Current Affairs) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-12** | Anonymous | `GET /search?q=draft` | `HTTP 200` | Search excludes draft courses | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-13** | Anonymous | `GET /search` | `HTTP 200` | Search page with empty query (must contain: Search) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-14** | Anonymous | `GET /` | `HTTP 200` | Landing page loads (must contain: aspirantbook) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-15** | Anonymous | `GET /pricing` | `HTTP 200` | Pricing page loads (must contain: Pricing) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-16** | Anonymous | `GET /current-affairs-quizzes` | `HTTP 307` | Quizzes hub protected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-17** | Anonymous | `GET /books` | `HTTP 307` | Books store protected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-18** | Anonymous | `GET /pyqs` | `HTTP 307` | PYQs catalog protected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-19** | Anonymous | `GET /practice` | `HTTP 307` | Coding practice protected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-20** | Anonymous | `GET /tutorials` | `HTTP 307` | Tutorials hub protected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-21** | Anonymous | `GET /dashboard` | `HTTP 307` | Dashboard redirects anon to login | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-22** | Anonymous | `GET /profile` | `HTTP 307` | Profile redirects anon to login | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-23** | Anonymous | `GET /my-learning` | `HTTP 307` | My learning redirects anon to login | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-24** | Anonymous | `GET /test-series` | `HTTP 307` | Test series redirects anon to login | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J1-25** | Anonymous | `GET /not-found` | `HTTP 404` | Direct 404 unmapped route returns 404 (must contain: 404 • Page Not Found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-01** | FREE | `GET /login` | `HTTP 307` | Logged in user visiting /login redirects to dashboard | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-02** | FREE | `GET /login?callbackUrl=//evil.com` | `HTTP 307` | Open redirect //evil.com sanitized to safe path | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-03** | FREE | `GET /login?callbackUrl=https://evil.com` | `HTTP 307` | Open redirect https://evil.com sanitized | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-04** | FREE | `GET /login?callbackUrl=javascript:alert(1)` | `HTTP 307` | Open redirect javascript: URI sanitized | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-05** | FREE | `GET /login?callbackUrl=/\evil.com` | `HTTP 307` | Open redirect /\evil.com sanitized | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-06** | FREE | `GET /login?callbackUrl=https:%2f%2fevil.com` | `HTTP 307` | Open redirect encoded https:// sanitized | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-07** | FREE | `GET /register` | `HTTP 307` | Logged in user visiting /register redirects to dashboard | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-08** | Anonymous | `GET /register` | `HTTP 200` | Register page loads for anonymous (must contain: Create your account) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-09** | Anonymous | `GET /api/auth/csrf` | `HTTP 200` | CSRF token endpoint responds (must contain: csrfToken) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-10** | Anonymous | `GET /api/auth/session` | `HTTP 200` | Empty session for anonymous (must contain: {}) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-11** | FREE | `GET /api/auth/session` | `HTTP 200` | Active session returned for student (must contain: student_free@p9.local) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-12** | TEACHER | `GET /api/auth/session` | `HTTP 200` | Active session returned for teacher (must contain: teacher_owner@p9.local) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-13** | ADMIN | `GET /api/auth/session` | `HTTP 200` | Active session returned for admin (must contain: admin@p9.local) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-14** | Anonymous | `GET /login?callbackUrl=%2Fdashboard` | `HTTP 200` | Login preserves legitimate callbackUrl (must contain: Sign In) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-15** | Anonymous | `GET /login?callbackUrl=%2Fmy-learning` | `HTTP 200` | Login preserves /my-learning callbackUrl (must contain: Sign In) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-16** | Anonymous | `GET /login?callbackUrl=%2Fcourses%2F72nd-bpsc-prelims-current-affairs` | `HTTP 200` | Login preserves course page callbackUrl (must contain: Sign In) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-17** | Anonymous | `POST /api/auth/callback/credentials` | `HTTP 302` | Credentials callback enforces CSRF check | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-18** | Anonymous | `POST /api/auth/callback/mobile` | `HTTP 302` | Mobile callback enforces CSRF check | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-19** | Anonymous | `GET /api/auth/providers` | `HTTP 200` | Auth providers list returns JSON (must contain: credentials) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J2-20** | Anonymous | `GET /api/health` | `HTTP 200` | Health endpoint returns OK (must contain: "status":"ok") | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-01** | FREE | `GET /checkout?courseId=c_paid_72nd_p9` | `HTTP 200` | Checkout page loads for paid course (must contain: Checkout) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-02** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Valid coupon 20% discount preview (must contain: "finalPaise":159920) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-03** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Expired coupon rejected with 400 (must contain: expired) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-04** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Invalid coupon code rejected with 400 (must contain: not found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-05** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Missing coupon code rejected with 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-06** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Missing courseId rejected with 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-07** | FREE | `POST /api/checkout/course-info` | `HTTP 200` | Course info endpoint returns details (must contain: 72nd BPSC Prelims Current Affairs) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-08** | FREE | `POST /api/checkout/course-info` | `HTTP 404` | Course info endpoint 404 for missing course | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-09** | FREE | `POST /api/checkout/course-info` | `HTTP 404` | Course info endpoint 404 for draft course | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-10** | ADMIN | `POST /api/checkout/course-info` | `HTTP 200` | Course info allows admin to view draft course | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-11** | FREE | `GET /checkout` | `HTTP 200` | Empty checkout page loads gracefully (must contain: Checkout) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-12** | Anonymous | `GET /checkout?courseId=c_paid_72nd_p9` | `HTTP 200` | Anonymous can view checkout page (must contain: Checkout) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-13** | FREE | `POST /api/checkout/razorpay` | `HTTP 200` | Create Razorpay order for course (must contain: orderId) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-14** | FREE | `POST /api/checkout/razorpay` | `HTTP 400` | Create order without courseId rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-15** | FREE | `POST /api/checkout/razorpay` | `HTTP 404` | Create order with non-existent course 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-16** | FREE | `POST /api/checkout/razorpay` | `HTTP 404` | Create order with draft course 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-17** | FREE | `POST /api/checkout/razorpay` | `HTTP 200` | Create order with valid coupon discount (must contain: orderId) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-18** | FREE | `POST /api/checkout/razorpay` | `HTTP 400` | Create order with expired coupon rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-19** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon code case-insensitive and trimmed (must contain: "finalPaise":159920) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-20** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Empty coupon code rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-21** | FREE | `GET /checkout?courseId=free-general-studies` | `HTTP 200` | Checkout for free course loads (must contain: Checkout) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-22** | FREE | `GET /checkout?courseId=invalid_course_id` | `HTTP 200` | Invalid courseId in checkout loads fallback (must contain: Checkout) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-23** | FREE | `POST /api/checkout/razorpay` | `HTTP 400` | Razorpay create order on free course rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-24** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Verify payment empty payload rejected with 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J3-25** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Verify payment forged signature rejected with 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-01** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Bad signature verification rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-02** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Missing order ID rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-03** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Missing payment ID rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-04** | Anonymous | `POST /api/webhooks/razorpay` | `HTTP 400` | Forged webhook signature rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-05** | Anonymous | `POST /api/webhooks/razorpay` | `HTTP 400` | Missing webhook signature header rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-06** | Anonymous | `POST /api/webhooks/razorpay` | `HTTP 400` | Empty webhook payload rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-07** | Anonymous | `POST /api/webhooks/stripe` | `HTTP 400` | Stripe webhook missing signature rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-08** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Non-existent order in payment verification rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-09** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Negative amount in verify rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-10** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Non-numeric amount in verify rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-11** | FREE | `POST /api/checkout/razorpay` | `HTTP 400` | Client-specified tampered price ignored | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-12** | FREE | `POST /api/checkout/razorpay` | `HTTP 400` | Zero amount payment rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-13** | FREE | `POST /api/checkout/razorpay` | `HTTP 400` | Negative amount payment rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-14** | FREE | `POST /api/checkout/razorpay` | `HTTP 400` | Invalid currency rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-15** | Anonymous | `POST /api/checkout/razorpay` | `HTTP 401` | Unauthenticated checkout order creation rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-16** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Tampered payment verification fails cleanly | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-17** | FREE | `GET /checkout/cancel` | `HTTP 404` | Unknown checkout subroute 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-18** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Client injected discountValue ignored | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-19** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Client injected discountType ignored | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-20** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Client injected finalPaise ignored | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-21** | FREE | `POST /api/courses/demo/book` | `HTTP 400` | Book demo empty payload rejected with 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-22** | FREE | `POST /api/courses/demo/book` | `HTTP 400` | Book demo missing slotId rejected with 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-23** | FREE | `POST /api/courses/demo/book` | `HTTP 400` | Book demo missing courseId rejected with 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-24** | FREE | `POST /api/courses/demo/complete` | `HTTP 400` | Demo complete missing bookingId rejected with 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J4-25** | FREE | `POST /api/courses/demo/screen` | `HTTP 400` | Demo screen missing session parameters rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-01** | FREE | `POST /api/courses/enroll` | `HTTP 403` | Enroll on paid course returns 403 (must contain: paid course) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-02** | FREE | `POST /api/courses/free-enroll` | `HTTP 403` | Free-enroll on paid course returns 403 (must contain: paid course) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-03** | FREE | `POST /api/courses/enroll` | `HTTP 200` | Enroll on free course succeeds with 200 (must contain: Enrolled successfully) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-04** | FREE | `POST /api/courses/free-enroll` | `HTTP 200` | Free-enroll on free course succeeds with 200 (must contain: Enrolled successfully) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-05** | FREE | `POST /api/courses/enroll` | `HTTP 404` | Enroll on draft course returns 404 (must contain: Course not found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-06** | FREE | `POST /api/courses/free-enroll` | `HTTP 404` | Free-enroll on draft course returns 404 (must contain: Course not found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-07** | Anonymous | `POST /api/courses/enroll` | `HTTP 401` | Anonymous enroll without phone returns 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-08** | Anonymous | `POST /api/courses/free-enroll` | `HTTP 401` | Anonymous free-enroll without phone returns 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-09** | Anonymous | `POST /api/courses/enroll` | `HTTP 200` | Anonymous enroll with phone auto-creates user (must contain: Enrolled successfully) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-10** | Anonymous | `POST /api/courses/free-enroll` | `HTTP 200` | Anonymous free-enroll with phone auto-creates user (must contain: Enrolled successfully) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-11** | FREE | `POST /api/courses/enroll` | `HTTP 400` | Enroll without courseId returns 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-12** | FREE | `POST /api/courses/free-enroll` | `HTTP 400` | Free-enroll without courseId returns 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-13** | FREE | `POST /api/courses/enroll` | `HTTP 404` | Enroll on missing course returns 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-14** | FREE | `POST /api/courses/free-enroll` | `HTTP 404` | Free-enroll on missing course returns 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-15** | FREE | `POST /api/courses/enroll` | `HTTP 200` | Enroll is idempotent on second call (must contain: Enrolled successfully) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-16** | FREE | `POST /api/courses/free-enroll` | `HTTP 200` | Free-enroll is idempotent on second call (must contain: Enrolled successfully) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-17** | Anonymous | `POST /api/courses/enroll` | `HTTP 400` | Enroll with invalid phone returns 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-18** | Anonymous | `POST /api/courses/free-enroll` | `HTTP 400` | Free-enroll with invalid phone returns 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-19** | PREMIUM | `POST /api/courses/enroll` | `HTTP 200` | Premium user enrolls in free course (must contain: Enrolled successfully) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J5-20** | PREMIUM | `POST /api/courses/free-enroll` | `HTTP 200` | Premium user free-enrolls in free course (must contain: Enrolled successfully) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-01** | FREE | `GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_trial_p9` | `HTTP 200` | Enrolled/free user views trial lesson player (must contain: Lesson 1: Introduction) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-02** | FREE | `GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9` | `HTTP 307` | Unenrolled user redirected from locked lesson | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-03** | ADMIN | `GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9` | `HTTP 200` | Admin bypasses paywall to view locked lesson (must contain: Lesson 2: Secret Deep Dive) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-04** | TEACHER | `GET /courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9` | `HTTP 200` | Teacher owner views locked lesson (must contain: Lesson 2: Secret Deep Dive) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-05** | FREE | `GET /courses/draft-secret-course/learn/some-lesson` | `HTTP 404` | Learn route for draft course returns 404 for student | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-06** | ADMIN | `GET /courses/draft-secret-course/learn/some-lesson` | `HTTP 404` | Learn route for non-existent lesson in draft course 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-07** | FREE | `POST /api/courses/progress` | `HTTP 200` | Save progress on trial lesson | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-08** | FREE | `POST /api/courses/progress` | `HTTP 200` | Save watch time on trial lesson | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-09** | Anonymous | `POST /api/courses/progress` | `HTTP 401` | Anonymous cannot save lesson progress | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-10** | FREE | `POST /api/courses/progress` | `HTTP 400` | Progress missing lessonId rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-11** | FREE | `GET /api/courses/progress?courseId=72nd-bpsc-prelims-current-affairs` | `HTTP 200` | Get course progress | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-12** | Anonymous | `GET /api/courses/progress?courseId=72nd-bpsc-prelims-current-affairs` | `HTTP 401` | Anonymous get course progress returns 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-13** | FREE | `GET /api/courses/progress` | `HTTP 400` | Get progress without courseId rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-14** | FREE | `GET /learn/72nd-bpsc-prelims-current-affairs` | `HTTP 200` | Standalone learn course route loads | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-15** | FREE | `GET /learn/draft-secret-course` | `HTTP 404` | Standalone learn route 404 for draft course | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-16** | ADMIN | `GET /learn/draft-secret-course` | `HTTP 200` | Standalone learn route accessible to admin for draft | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-17** | FREE | `GET /learn/non-existent-course-slug` | `HTTP 404` | Standalone learn route 404 for missing course | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-18** | FREE | `GET /courses/72nd-bpsc-prelims-current-affairs/demo` | `HTTP 200` | Demo room route loads (must contain: Live Demo) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-19** | Anonymous | `GET /courses/72nd-bpsc-prelims-current-affairs/demo` | `HTTP 200` | Anonymous demo room loads (must contain: Live Demo) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J6-20** | FREE | `GET /courses/draft-secret-course/demo` | `HTTP 404` | Demo room for draft course returns 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-01** | FREE | `GET /test-series` | `HTTP 200` | Test series catalog loads (must contain: Test Series) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-02** | FREE | `GET /my-tests` | `HTTP 200` | My tests page loads (must contain: My Tests) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-03** | FREE | `GET /test-series/bpsc-72nd-2026` | `HTTP 200` | Test series detail page loads (must contain: 72nd BPSC) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-04** | FREE | `GET /test-series/non-existent-series` | `HTTP 404` | Non-existent series 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-05** | FREE | `GET /api/exam/series/list` | `HTTP 200` | API series list returns JSON (must contain: series) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-06** | FREE | `POST /api/exam/series/enroll` | `HTTP 400` | Enroll series missing seriesId 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-07** | Anonymous | `POST /api/exam/series/enroll` | `HTTP 401` | Anonymous series enroll 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-08** | FREE | `POST /api/exam/series/enroll` | `HTTP 200` | Enroll in free test series succeeds (must contain: success) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-09** | FREE | `POST /api/exam/series/enroll` | `HTTP 403` | Enroll in Pro test series returns 403 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-10** | FREE | `GET /api/exam/test/list?seriesId=es_bpsc_step4` | `HTTP 200` | List tests in series returns 200 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-11** | FREE | `GET /api/exam/test/list` | `HTTP 400` | List tests without seriesId returns 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-12** | FREE | `POST /api/exam/attempt/start` | `HTTP 400` | Start attempt missing testId returns 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-13** | Anonymous | `POST /api/exam/attempt/start` | `HTTP 401` | Anonymous start attempt returns 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-14** | FREE | `GET /api/exam/attempt/user-status` | `HTTP 400` | User attempt status missing testId 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-15** | Anonymous | `GET /api/exam/attempt/user-status?testId=test_1` | `HTTP 401` | Anonymous user attempt status 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-16** | FREE | `GET /api/exam/attempt/user-status?testId=test_1` | `HTTP 200` | User attempt status returns 200 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-17** | FREE | `POST /api/exam/attempt/att_1/sync` | `HTTP 400` | Sync attempt empty payload returns 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-18** | Anonymous | `POST /api/exam/attempt/att_1/sync` | `HTTP 401` | Anonymous sync attempt returns 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-19** | FREE | `POST /api/exam/attempt/att_1/submit` | `HTTP 400` | Submit attempt empty payload returns 400 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-20** | Anonymous | `POST /api/exam/attempt/att_1/submit` | `HTTP 401` | Anonymous submit attempt returns 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-21** | FREE | `GET /api/exam/attempt/att_1/result` | `HTTP 404` | Result for non-existent attempt returns 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-22** | Anonymous | `GET /api/exam/attempt/att_1/result` | `HTTP 401` | Anonymous get attempt result returns 401 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-23** | FREE | `GET /api/exam/test_1/leaderboard` | `HTTP 200` | Test leaderboard returns 200 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-24** | FREE | `GET /test-series/bpsc-72nd-2026/instructions` | `HTTP 200` | Test instructions page loads | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-25** | FREE | `GET /test-series/bpsc-72nd-2026/declaration` | `HTTP 200` | Test declaration page loads | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-26** | FREE | `GET /test-series/bpsc-72nd-2026/attempt` | `HTTP 200` | Test attempt interface loads | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-27** | FREE | `GET /test-series/bpsc-72nd-2026/result` | `HTTP 200` | Test result review page loads | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-28** | FREE | `GET /test-series/bpsc-72nd-2026/solutions` | `HTTP 200` | Test solutions page loads | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-29** | FREE | `GET /test-series/bpsc-72nd-2026/leaderboard` | `HTTP 200` | Test leaderboard view loads | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J7-30** | FREE | `GET /test-series/bpsc-72nd-2026/print` | `HTTP 200` | Test print/PDF view loads | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-01** | FREE | `GET /dashboard` | `HTTP 200` | Student dashboard loads (must contain: Student) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-02** | FREE | `GET /courses` | `HTTP 200` | Student courses catalog loads (must contain: Courses) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-03** | FREE | `GET /my-learning` | `HTTP 200` | My learning loads (must contain: My Batches) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-04** | FREE | `GET /test-series` | `HTTP 200` | Test series loads (must contain: Test Series) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-05** | FREE | `GET /my-tests` | `HTTP 200` | My tests loads (must contain: My Tests) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-06** | FREE | `GET /current-affairs-quizzes` | `HTTP 200` | Current affairs quizzes load (must contain: Current Affairs) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-07** | FREE | `GET /books` | `HTTP 200` | Bookstore loads (must contain: Books) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-08** | FREE | `GET /books/cart` | `HTTP 200` | Books cart loads (must contain: Cart) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-09** | FREE | `GET /books/orders` | `HTTP 200` | Books orders load (must contain: Orders) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-10** | FREE | `GET /pyqs` | `HTTP 200` | PYQs catalog loads (must contain: Previous Year) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-11** | FREE | `GET /practice` | `HTTP 200` | Coding practice loads (must contain: Practice) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-12** | FREE | `GET /tutorials` | `HTTP 200` | Tutorials load (must contain: Tutorials) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-13** | FREE | `GET /doubts` | `HTTP 200` | Doubts forum loads (must contain: Doubts) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-14** | FREE | `GET /profile` | `HTTP 200` | User profile loads (must contain: Profile) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-15** | FREE | `GET /settings` | `HTTP 200` | User settings load (must contain: Settings) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-16** | FREE | `GET /settings/subscription` | `HTTP 200` | Subscription settings load (must contain: Subscription) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-17** | FREE | `GET /subscription` | `HTTP 200` | Subscription billing loads (must contain: Subscription) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-18** | FREE | `GET /purchases` | `HTTP 200` | Purchase history loads (must contain: Purchase) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-19** | FREE | `GET /tracks` | `HTTP 200` | Career tracks load (must contain: Career) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-20** | FREE | `GET /tracks/skills` | `HTTP 200` | Skill tracks load (must contain: Skills) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-21** | FREE | `GET /code-along` | `HTTP 200` | Code-along hub loads (must contain: Code) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-22** | FREE | `GET /assessments` | `HTTP 200` | Assessments catalog loads (must contain: Assessment) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-23** | FREE | `GET /leaderboard` | `HTTP 200` | Global leaderboard loads (must contain: Leaderboard) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-24** | FREE | `GET /forms` | `HTTP 200` | Forms portal loads (must contain: Form) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-25** | TEACHER | `GET /teacher` | `HTTP 200` | Teacher portal loads (must contain: Teacher) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-26** | TEACHER | `GET /teacher/classes` | `HTTP 200` | Teacher classes load (must contain: Classes) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-27** | TEACHER | `GET /teacher/classes/new` | `HTTP 200` | Teacher new class loads (must contain: Create) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-28** | TEACHER | `GET /teacher/questions` | `HTTP 200` | Teacher questions load (must contain: Questions) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-29** | TEACHER | `GET /teacher/test-series` | `HTTP 200` | Teacher test series load (must contain: Test Series) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-30** | TEACHER | `GET /teacher/test-series/create` | `HTTP 200` | Teacher create test series loads (must contain: Create) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-31** | TEACHER | `GET /teacher/tests/new` | `HTTP 200` | Teacher new test loads (must contain: Test) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-32** | TEACHER | `GET /teacher/pyqs` | `HTTP 200` | Teacher PYQ hub loads (must contain: PYQ) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-33** | ADMIN | `GET /admin` | `HTTP 200` | Admin control portal loads (must contain: Admin) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-34** | ADMIN | `GET /admin/users` | `HTTP 200` | Admin user management loads (must contain: Users) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J8-35** | ADMIN | `GET /admin/audit` | `HTTP 200` | Admin audit logs load (must contain: Audit) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-01** | FREE | `POST /api/checkout/razorpay` | `HTTP 200` | Razorpay order creation (must contain: orderId) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-02** | FREE | `POST /api/checkout/razorpay` | `HTTP 400` | Order creation empty courseId | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-03** | FREE | `POST /api/checkout/razorpay` | `HTTP 404` | Order creation missing course | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-04** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Verify missing payment_id | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-05** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Verify missing order_id | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-06** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Verify missing signature | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-07** | FREE | `POST /api/verify-payment/razorpay` | `HTTP 400` | Verify invalid signature | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-08** | Anonymous | `POST /api/webhooks/razorpay` | `HTTP 400` | Webhook missing signature | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-09** | Anonymous | `POST /api/webhooks/razorpay` | `HTTP 400` | Webhook empty body | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-10** | Anonymous | `POST /api/webhooks/stripe` | `HTTP 400` | Stripe webhook empty body | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-11** | FREE | `POST /api/checkout/route` | `HTTP 404` | Unknown checkout subroute 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-12** | FREE | `POST /api/courses/free-enroll` | `HTTP 200` | Free enroll payment gateway bypass | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-13** | FREE | `POST /api/courses/free-enroll` | `HTTP 403` | Free enroll cannot bypass paid course | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-14** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview price calculation | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-15** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Coupon preview expired rejection | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-16** | FREE | `POST /api/courses/demo/complete` | `HTTP 400` | Demo complete missing parameters | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-17** | FREE | `POST /api/courses/demo/book` | `HTTP 400` | Demo book missing parameters | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-18** | Anonymous | `POST /api/checkout/razorpay` | `HTTP 401` | Anonymous cannot create order | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-19** | Anonymous | `POST /api/verify-payment/razorpay` | `HTTP 401` | Anonymous cannot verify payment | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J9-20** | FREE | `POST /api/checkout/razorpay` | `HTTP 404` | Order creation on draft course 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-01** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | 20% discount math accurate (must contain: "discountPaise":39980) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-02** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Expired coupon rejected (must contain: expired) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-03** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Non-existent coupon rejected (must contain: not found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-04** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Empty code rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-05** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Missing courseId rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-06** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Trimmed code matches (must contain: "finalPaise":159920) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-07** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Lowercase code matches (must contain: "finalPaise":159920) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-08** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 404` | Coupon preview on draft course 404 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-09** | ADMIN | `POST /api/checkout/coupon/preview` | `HTTP 200` | Admin can preview coupon on draft course | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-10** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | Coupon preview on free course rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-11** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | XSS coupon code rejected safely | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-12** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 400` | SQL injection coupon code rejected safely | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-13** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview idempotency 1 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-14** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview idempotency 2 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-15** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview idempotency 3 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-16** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview idempotency 4 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-17** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview idempotency 5 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-18** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview idempotency 6 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-19** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview idempotency 7 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J10-20** | FREE | `POST /api/checkout/coupon/preview` | `HTTP 200` | Coupon preview idempotency 8 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-01** | FREE | `POST /api/admin/run-analytics` | `HTTP 401` | Non-admin blocked from run-analytics | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-02** | TEACHER | `POST /api/admin/run-analytics` | `HTTP 401` | Teacher blocked from super admin analytics | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-03** | ADMIN | `POST /api/admin/run-analytics` | `HTTP 200` | Admin can run analytics (must contain: "success":true) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-04** | FREE | `GET /admin` | `HTTP 307` | Student redirected from /admin | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-05** | FREE | `GET /teacher` | `HTTP 307` | Student redirected from /teacher | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-06** | TEACHER | `GET /admin/users` | `HTTP 307` | Teacher redirected from super admin users | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-07** | TEACHER | `GET /admin/audit` | `HTTP 307` | Teacher redirected from super admin audit | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-08** | TEACHER | `GET /admin/courses` | `HTTP 200` | Teacher can access video courses studio (must contain: Courses) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-09** | TEACHER | `GET /admin/test-series` | `HTTP 200` | Teacher can access test series studio (must contain: Test Series) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-10** | TEACHER | `GET /admin/pyqs` | `HTTP 200` | Teacher can access PYQ studio (must contain: PYQ) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-11** | TEACHER | `GET /admin/tutorials` | `HTTP 200` | Teacher can access tutorial studio (must contain: Tutorial) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-12** | ADMIN | `GET /admin/courses` | `HTTP 200` | Admin can access courses studio (must contain: Courses) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-13** | ADMIN | `GET /admin/test-series` | `HTTP 200` | Admin can access test series studio (must contain: Test Series) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-14** | ADMIN | `GET /admin/users` | `HTTP 200` | Admin can access user management (must contain: Users) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-15** | ADMIN | `GET /admin/audit` | `HTTP 200` | Admin can access audit log (must contain: Audit) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-16** | TEACHER | `GET /teacher/classes` | `HTTP 200` | Teacher classes overview loads (must contain: Classes) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-17** | TEACHER | `GET /teacher/classes/new` | `HTTP 200` | Teacher create class form loads (must contain: Create) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-18** | TEACHER | `GET /teacher/questions` | `HTTP 200` | Teacher questions dashboard loads (must contain: Questions) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-19** | TEACHER | `GET /teacher/test-series` | `HTTP 200` | Teacher test series view loads (must contain: Test Series) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-20** | TEACHER | `GET /teacher/pyqs` | `HTTP 200` | Teacher PYQ view loads (must contain: PYQ) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-21** | TEACHER | `POST /api/teacher/classes` | `HTTP 400` | Create class empty payload rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-22** | FREE | `POST /api/teacher/classes` | `HTTP 401` | Student cannot create teacher class | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-23** | Anonymous | `POST /api/teacher/classes` | `HTTP 401` | Anonymous cannot create teacher class | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-24** | FREE | `GET /admin/settings` | `HTTP 307` | Student blocked from admin settings | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J11-25** | TEACHER | `GET /admin/settings` | `HTTP 307` | Teacher blocked from admin settings | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-01** | FREE | `POST /api/user/goal` | `HTTP 200` | User updates their own goal | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-02** | Anonymous | `POST /api/user/goal` | `HTTP 401` | Anonymous cannot update goal | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-03** | FREE | `POST /api/user/goal` | `HTTP 400` | Empty goal update rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-04** | FREE | `GET /api/goals` | `HTTP 200` | List available goals returns 200 (must contain: goals) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-05** | FREE | `GET /api/doubts` | `HTTP 200` | List doubts returns 200 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-06** | Anonymous | `POST /api/doubts` | `HTTP 401` | Anonymous cannot post doubt | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-07** | FREE | `POST /api/doubts` | `HTTP 400` | Empty doubt rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-08** | FREE | `GET /api/forms` | `HTTP 200` | Forms API returns 200 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-09** | FREE | `POST /api/forms` | `HTTP 400` | Empty form submission rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-10** | FREE | `GET /api/leaderboard` | `HTTP 200` | Leaderboard API returns 200 (must contain: users) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-11** | FREE | `GET /api/upload/presigned-url` | `HTTP 401` | Presigned URL missing auth/params rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-12** | FREE | `POST /api/upload` | `HTTP 400` | Upload without file rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-13** | FREE | `POST /api/execute` | `HTTP 400` | Code execute empty payload rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-14** | FREE | `GET /api/courses/video-courses` | `HTTP 200` | Video courses list returns 200 | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-15** | FREE | `POST /api/courses/teacher-photo-upload` | `HTTP 401` | Student cannot upload teacher photo | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-16** | TEACHER | `POST /api/courses/teacher-photo-upload` | `HTTP 400` | Teacher photo upload empty payload rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-17** | FREE | `GET /api/classroom/live-status` | `HTTP 200` | Live classroom status returns 200 (must contain: "success":true) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-18** | Anonymous | `GET /api/classroom/live-status` | `HTTP 200` | Anonymous live status returns 200 (must contain: "success":true) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-19** | FREE | `GET /api/exam/ai-parse` | `HTTP 405` | GET on AI-parse endpoint rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J12-20** | FREE | `POST /api/exam/ai-parse` | `HTTP 400` | AI-parse empty payload rejected | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-01** | Anonymous | `GET /` | `HTTP 200` | Homepage loads without errors (must contain: aspirantbook) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-02** | Anonymous | `GET /pricing` | `HTTP 200` | Pricing page loads without errors (must contain: Pricing) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-03** | Anonymous | `GET /login` | `HTTP 200` | Login page loads without errors (must contain: Sign In) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-04** | Anonymous | `GET /register` | `HTTP 200` | Register page loads without errors (must contain: Create your account) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-05** | Anonymous | `GET /courses/72nd-bpsc-prelims-current-affairs` | `HTTP 200` | Course detail page loads without errors (must contain: 72nd BPSC) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-06** | FREE | `GET /dashboard` | `HTTP 200` | Dashboard loads without errors (must contain: Student) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-07** | FREE | `GET /courses` | `HTTP 200` | Courses catalog loads without errors (must contain: Courses) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-08** | FREE | `GET /my-learning` | `HTTP 200` | My Batches loads without errors (must contain: My Batches) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-09** | FREE | `GET /test-series` | `HTTP 200` | Test Series loads without errors (must contain: Test Series) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-10** | FREE | `GET /my-tests` | `HTTP 200` | My Tests loads without errors (must contain: My Tests) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-11** | FREE | `GET /profile` | `HTTP 200` | Profile loads without errors (must contain: Profile) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-12** | FREE | `GET /settings` | `HTTP 200` | Settings loads without errors (must contain: Settings) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-13** | TEACHER | `GET /teacher` | `HTTP 200` | Teacher home loads without errors (must contain: Teacher) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-14** | ADMIN | `GET /admin` | `HTTP 200` | Admin home loads without errors (must contain: Admin) | `scripts/run-pass9-qa-matrix.ts` | PASS |
| **J13-15** | Anonymous | `GET /not-found` | `HTTP 404` | 404 page loads cleanly with return links (must contain: 404 • Page Not Found) | `scripts/run-pass9-qa-matrix.ts` | PASS |
