import * as fs from "fs";

export interface TestCaseDef {
  id: string;
  persona: string;
  method: string;
  url: string;
  expectedStatus: number;
  expectedBodySnippet?: string;
  forbiddenBodySnippet?: string;
  bodyPayload?: any;
  customHeaders?: Record<string, string>;
  description: string;
}

export function buildAllTestCases(): TestCaseDef[] {
  const cases: TestCaseDef[] = [];

  // OTP (10 cases)
  const otpDefs: TestCaseDef[] = [
    { id: "OTP-01", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 200, expectedBodySnippet: '"success":true', bodyPayload: { phoneNumber: "9876543210", otp: "123456" }, description: "Valid dev mobile OTP login" },
    { id: "OTP-02", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 400, expectedBodySnippet: "10-digit", bodyPayload: { phoneNumber: "98765", otp: "123456" }, description: "Short phone number rejected" },
    { id: "OTP-03", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 400, expectedBodySnippet: "10-digit", bodyPayload: { phoneNumber: "abcdefghij", otp: "123456" }, description: "Non-numeric phone rejected" },
    { id: "OTP-04", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 400, expectedBodySnippet: "10-digit", bodyPayload: { phoneNumber: "9876543210123", otp: "123456" }, description: "Too long phone rejected" },
    { id: "OTP-05", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 400, expectedBodySnippet: "10-digit", bodyPayload: {}, description: "Empty payload rejected" },
    { id: "OTP-06", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 200, expectedBodySnippet: "student", bodyPayload: { phoneNumber: "9876543211", otp: "123456" }, description: "New student auto-created" },
    { id: "OTP-07", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 200, expectedBodySnippet: "userId", bodyPayload: { phoneNumber: "9876543212", otp: "000000" }, description: "Dev OTP any 6-digit accepted" },
    { id: "OTP-08", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 200, expectedBodySnippet: "success", bodyPayload: { phoneNumber: "9876543210", courseId: "72nd-bpsc-prelims-current-affairs" }, description: "Paid course attached does not free enroll" },
    { id: "OTP-09", persona: "Anonymous", method: "POST", url: "/api/auth/mobile-login", expectedStatus: 200, expectedBodySnippet: "success", bodyPayload: { phoneNumber: "9876543213", courseId: "free-general-studies" }, description: "Free course attached auto-enrolls" },
    { id: "OTP-10", persona: "Anonymous", method: "GET", url: "/login", expectedStatus: 200, expectedBodySnippet: "Sign In", description: "Login page renders" },
  ];
  cases.push(...otpDefs);

  // J1 Anonymous browse (25 cases)
  const j1Defs: TestCaseDef[] = [
    { id: "J1-01", persona: "Anonymous", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs", expectedStatus: 200, expectedBodySnippet: "72nd BPSC Prelims Current Affairs", forbiddenBodySnippet: "super-secret-video-stream.m3u8", description: "Course overview page renders without secrets" },
    { id: "J1-02", persona: "Anonymous", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_trial_p9", expectedStatus: 307, description: "Trial lesson redirects anonymous to login" },
    { id: "J1-03", persona: "Anonymous", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9", expectedStatus: 307, forbiddenBodySnippet: "super-secret-video-stream.m3u8", description: "Locked lesson redirects anonymous to login" },
    { id: "J1-04", persona: "Anonymous", method: "GET", url: "/courses/draft-secret-course", expectedStatus: 404, expectedBodySnippet: "404", forbiddenBodySnippet: "Unreleased Draft Course", description: "Draft course returns HTTP 404" },
    { id: "J1-05", persona: "Anonymous", method: "GET", url: "/courses/non-existent-course-slug-404", expectedStatus: 404, expectedBodySnippet: "404", description: "Non-existent slug returns HTTP 404" },
    { id: "J1-06", persona: "Anonymous", method: "GET", url: "/courses/c_invalid!@#", expectedStatus: 404, expectedBodySnippet: "404", description: "Malformed slug returns HTTP 404" },
    { id: "J1-07", persona: "Anonymous", method: "GET", url: "/api/courses/draft-secret-course/media", expectedStatus: 404, description: "Draft course media endpoint 404" },
    { id: "J1-08", persona: "Anonymous", method: "GET", url: "/api/courses/draft-secret-course/lesson", expectedStatus: 404, description: "Draft course lesson endpoint 404" },
    { id: "J1-09", persona: "Anonymous", method: "GET", url: "/api/courses/draft-secret-course/demo-slots", expectedStatus: 404, description: "Draft course demo-slots endpoint 404" },
    { id: "J1-10", persona: "Anonymous", method: "GET", url: "/courses", expectedStatus: 200, description: "Courses catalog open for guest browsing (HTTP 200)" },
    { id: "J1-11", persona: "Anonymous", method: "GET", url: "/search?q=bpsc", expectedStatus: 200, expectedBodySnippet: "72nd BPSC Prelims Current Affairs", description: "Search returns published courses" },
    { id: "J1-12", persona: "Anonymous", method: "GET", url: "/search?q=draft", expectedStatus: 200, forbiddenBodySnippet: "Unreleased Draft Course", description: "Search excludes draft courses" },
    { id: "J1-13", persona: "Anonymous", method: "GET", url: "/search", expectedStatus: 200, expectedBodySnippet: "Search", description: "Search page with empty query" },
    { id: "J1-14", persona: "Anonymous", method: "GET", url: "/", expectedStatus: 200, expectedBodySnippet: "aspirantbook", description: "Landing page loads" },
    { id: "J1-15", persona: "Anonymous", method: "GET", url: "/pricing", expectedStatus: 200, expectedBodySnippet: "Pricing", description: "Pricing page loads" },
    { id: "J1-16", persona: "Anonymous", method: "GET", url: "/current-affairs-quizzes", expectedStatus: 200, description: "Current affairs & quizzes open for guest browsing (HTTP 200)" },
    { id: "J1-17", persona: "Anonymous", method: "GET", url: "/books", expectedStatus: 200, description: "Online bookstore open for guest browsing (HTTP 200)" },
    { id: "J1-18", persona: "Anonymous", method: "GET", url: "/pyqs", expectedStatus: 200, description: "PYQs catalog open for guest browsing (HTTP 200)" },
    { id: "J1-19", persona: "Anonymous", method: "GET", url: "/practice", expectedStatus: 200, description: "Coding practice open for guest browsing (HTTP 200)" },
    { id: "J1-20", persona: "Anonymous", method: "GET", url: "/tutorials", expectedStatus: 200, description: "Tutorials hub open for guest browsing (HTTP 200)" },
    { id: "J1-21", persona: "Anonymous", method: "GET", url: "/dashboard", expectedStatus: 200, description: "Dashboard open for guest browsing with login prompt (HTTP 200)" },
    { id: "J1-22", persona: "Anonymous", method: "GET", url: "/profile", expectedStatus: 307, description: "Profile redirects anon to login" },
    { id: "J1-23", persona: "Anonymous", method: "GET", url: "/my-learning", expectedStatus: 200, description: "My learning open for guest browsing with login prompt (HTTP 200)" },
    { id: "J1-24", persona: "Anonymous", method: "GET", url: "/test-series", expectedStatus: 200, description: "Test series open for guest browsing (HTTP 200)" },
    { id: "J1-25", persona: "Anonymous", method: "GET", url: "/not-found", expectedStatus: 404, expectedBodySnippet: "404 • Page Not Found", description: "Direct 404 unmapped route returns 404" },
  ];
  cases.push(...j1Defs);

  // J2 Auth UX & Callbacks (20 cases)
  const j2Defs: TestCaseDef[] = [
    { id: "J2-01", persona: "FREE", method: "GET", url: "/login", expectedStatus: 307, description: "Logged in user visiting /login redirects to dashboard" },
    { id: "J2-02", persona: "FREE", method: "GET", url: "/login?callbackUrl=//evil.com", expectedStatus: 307, description: "Open redirect //evil.com sanitized to safe path" },
    { id: "J2-03", persona: "FREE", method: "GET", url: "/login?callbackUrl=https://evil.com", expectedStatus: 307, description: "Open redirect https://evil.com sanitized" },
    { id: "J2-04", persona: "FREE", method: "GET", url: "/login?callbackUrl=javascript:alert(1)", expectedStatus: 307, description: "Open redirect javascript: URI sanitized" },
    { id: "J2-05", persona: "FREE", method: "GET", url: "/login?callbackUrl=/\\evil.com", expectedStatus: 307, description: "Open redirect /\\evil.com sanitized" },
    { id: "J2-06", persona: "FREE", method: "GET", url: "/login?callbackUrl=https:%2f%2fevil.com", expectedStatus: 307, description: "Open redirect encoded https:// sanitized" },
    { id: "J2-07", persona: "FREE", method: "GET", url: "/register", expectedStatus: 307, description: "Logged in user visiting /register redirects to dashboard" },
    { id: "J2-08", persona: "Anonymous", method: "GET", url: "/register", expectedStatus: 200, expectedBodySnippet: "Create your account", description: "Register page loads for anonymous" },
    { id: "J2-09", persona: "Anonymous", method: "GET", url: "/api/auth/csrf", expectedStatus: 200, expectedBodySnippet: "csrfToken", description: "CSRF token endpoint responds" },
    { id: "J2-10", persona: "Anonymous", method: "GET", url: "/api/auth/session", expectedStatus: 200, expectedBodySnippet: "null", description: "Empty session for anonymous" },
    { id: "J2-11", persona: "FREE", method: "GET", url: "/api/auth/session", expectedStatus: 200, expectedBodySnippet: "student_free@p9.local", description: "Active session returned for student" },
    { id: "J2-12", persona: "TEACHER", method: "GET", url: "/api/auth/session", expectedStatus: 200, expectedBodySnippet: "teacher_owner@p9.local", description: "Active session returned for teacher" },
    { id: "J2-13", persona: "ADMIN", method: "GET", url: "/api/auth/session", expectedStatus: 200, expectedBodySnippet: "admin@p9.local", description: "Active session returned for admin" },
    { id: "J2-14", persona: "Anonymous", method: "GET", url: "/login?callbackUrl=%2Fdashboard", expectedStatus: 200, expectedBodySnippet: "Sign In", description: "Login preserves legitimate callbackUrl" },
    { id: "J2-15", persona: "Anonymous", method: "GET", url: "/login?callbackUrl=%2Fmy-learning", expectedStatus: 200, expectedBodySnippet: "Sign In", description: "Login preserves /my-learning callbackUrl" },
    { id: "J2-16", persona: "Anonymous", method: "GET", url: "/login?callbackUrl=%2Fcourses%2F72nd-bpsc-prelims-current-affairs", expectedStatus: 200, expectedBodySnippet: "Sign In", description: "Login preserves course page callbackUrl" },
    { id: "J2-17", persona: "Anonymous", method: "POST", url: "/api/auth/callback/credentials", expectedStatus: 302, description: "Credentials callback enforces CSRF check" },
    { id: "J2-18", persona: "Anonymous", method: "POST", url: "/api/auth/callback/mobile", expectedStatus: 302, description: "Mobile callback enforces CSRF check" },
    { id: "J2-19", persona: "Anonymous", method: "GET", url: "/api/auth/providers", expectedStatus: 200, expectedBodySnippet: "credentials", description: "Auth providers list returns JSON" },
    { id: "J2-20", persona: "Anonymous", method: "GET", url: "/api/health", expectedStatus: 200, expectedBodySnippet: '"status":"ok"', description: "Health endpoint returns OK" },
  ];
  cases.push(...j2Defs);

  // J3 BUY happy path & checkout (25 cases)
  const j3Defs: TestCaseDef[] = [
    { id: "J3-01", persona: "FREE", method: "GET", url: "/checkout?courseId=c_paid_72nd_p9", expectedStatus: 200, description: "Checkout page loads for paid course" },
    { id: "J3-02", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"finalPaise":159920', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_PERC20" }, description: "Valid coupon 20% discount preview" },
    { id: "J3-03", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, expectedBodySnippet: "expired", bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_EXPIRED" }, description: "Expired coupon rejected with 400" },
    { id: "J3-04", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, expectedBodySnippet: "Invalid or expired coupon", bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "NON_EXISTENT_COUPON" }, description: "Invalid coupon code rejected with 400" },
    { id: "J3-05", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs" }, description: "Missing coupon code rejected with 400" },
    { id: "J3-06", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { code: "STEP5_PERC20" }, description: "Missing courseId rejected with 400" },
    { id: "J3-07", persona: "FREE", method: "GET", url: "/api/checkout/course-info?id=72nd-bpsc-prelims-current-affairs", expectedStatus: 200, expectedBodySnippet: "72nd BPSC", description: "Course info endpoint returns details" },
    { id: "J3-08", persona: "FREE", method: "GET", url: "/api/checkout/course-info?id=non_existent_course", expectedStatus: 404, description: "Course info endpoint 404 for missing course" },
    { id: "J3-09", persona: "FREE", method: "GET", url: "/api/checkout/course-info?id=draft-secret-course", expectedStatus: 404, description: "Course info endpoint 404 for draft course" },
    { id: "J3-10", persona: "ADMIN", method: "GET", url: "/api/checkout/course-info?id=draft-secret-course", expectedStatus: 200, description: "Course info allows admin to view draft course" },
    { id: "J3-11", persona: "FREE", method: "GET", url: "/checkout", expectedStatus: 200, description: "Empty checkout page loads gracefully" },
    { id: "J3-12", persona: "Anonymous", method: "GET", url: "/checkout?courseId=c_paid_72nd_p9", expectedStatus: 200, description: "Anonymous can view checkout page" },
    { id: "J3-13", persona: "FREE", method: "POST", url: "/checkout", expectedStatus: 200, expectedBodySnippet: '"orderId":"order_', customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: [{ courseId: "72nd-bpsc-prelims-current-affairs" }], description: "Server action creates course order for student" },
    { id: "J3-14", persona: "FREE", method: "POST", url: "/checkout", expectedStatus: 200, expectedBodySnippet: '"orderId":"order_', customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: ["MONTHLY"], description: "Server action creates monthly subscription order" },
    { id: "J3-15", persona: "FREE", method: "POST", url: "/checkout", expectedStatus: 200, expectedBodySnippet: '"orderId":"order_', customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: ["YEARLY"], description: "Server action creates yearly subscription order" },
    { id: "J3-16", persona: "PREMIUM", method: "POST", url: "/checkout", expectedStatus: 200, expectedBodySnippet: '"orderId":"order_', customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: [{ courseId: "72nd-bpsc-prelims-current-affairs", couponCode: "STEP5_FLAT500" }], description: "Server action creates order with FLAT500 coupon" },
    { id: "J3-17", persona: "TEACHER", method: "POST", url: "/checkout", expectedStatus: 200, expectedBodySnippet: '"orderId":"order_', customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: ["MONTHLY"], description: "Teacher persona creates test order" },
    { id: "J3-18", persona: "ADMIN", method: "POST", url: "/checkout", expectedStatus: 200, expectedBodySnippet: '"orderId":"order_', customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: ["MONTHLY"], description: "Admin persona creates test order" },
    { id: "J3-19", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"finalPaise":159920', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "  step5_perc20  " }, description: "Coupon code case-insensitive and trimmed" },
    { id: "J3-20", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "" }, description: "Empty coupon code rejected" },
    { id: "J3-21", persona: "FREE", method: "GET", url: "/checkout?courseId=free-general-studies", expectedStatus: 200, description: "Checkout for free course loads" },
    { id: "J3-22", persona: "FREE", method: "GET", url: "/checkout?courseId=invalid_course_id", expectedStatus: 200, description: "Invalid courseId in checkout loads fallback" },
    { id: "J3-23", persona: "FREE", method: "POST", url: "/api/checkout/razorpay", expectedStatus: 410, description: "Deprecated REST order endpoint returns 410" },
    { id: "J3-24", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: {}, description: "Verify payment empty payload rejected with 400" },
    { id: "J3-25", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "fake_order", razorpay_payment_id: "fake_pay", razorpay_signature: "bad_sig" }, description: "Verify payment forged signature rejected with 400" },
  ];
  cases.push(...j3Defs);

  // J4 Payment failure & Webhooks (25 cases)
  const j4Defs: TestCaseDef[] = [
    { id: "J4-01", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_p9_valid_1", razorpay_payment_id: "pay_p9_valid_1", razorpay_signature: "invalid_sig" }, description: "Bad signature verification rejected" },
    { id: "J4-02", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "", razorpay_payment_id: "pay_1" }, description: "Missing order ID rejected" },
    { id: "J4-03", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_1", razorpay_payment_id: "" }, description: "Missing payment ID rejected" },
    { id: "J4-04", persona: "Anonymous", method: "POST", url: "/api/webhooks/razorpay", expectedStatus: 400, customHeaders: { "x-razorpay-signature": "bad_sig" }, bodyPayload: { event: "payment.captured" }, description: "Forged webhook signature rejected" },
    { id: "J4-05", persona: "Anonymous", method: "POST", url: "/api/webhooks/razorpay", expectedStatus: 400, bodyPayload: { event: "payment.failed" }, description: "Missing webhook signature header on payment.failed rejected" },
    { id: "J4-06", persona: "Anonymous", method: "POST", url: "/api/webhooks/razorpay", expectedStatus: 400, customHeaders: { "x-razorpay-signature": "bad" }, bodyPayload: {}, description: "Empty webhook payload rejected" },
    { id: "J4-07", persona: "Anonymous", method: "POST", url: "/api/webhooks/stripe", expectedStatus: 400, bodyPayload: {}, description: "Stripe webhook missing signature rejected" },
    { id: "J4-08", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_non_existent", razorpay_payment_id: "pay_1", razorpay_signature: "sig_1" }, description: "Non-existent order in payment verification rejected" },
    { id: "J4-09", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig", amount: -100 }, description: "Negative amount in verify rejected" },
    { id: "J4-10", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig", amount: "tampered" }, description: "Non-numeric amount in verify rejected" },
    { id: "J4-11", persona: "FREE", method: "POST", url: "/checkout", expectedStatus: 500, customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: [{ courseId: "non_existent_course_404" }], description: "Server action rejects missing course" },
    { id: "J4-12", persona: "FREE", method: "POST", url: "/checkout", expectedStatus: 500, customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: [{ courseId: "draft-secret-course" }], description: "Server action rejects draft course for student" },
    { id: "J4-13", persona: "FREE", method: "POST", url: "/checkout", expectedStatus: 500, customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: [{ courseId: "free-general-studies" }], description: "Server action rejects free course" },
    { id: "J4-14", persona: "FREE", method: "POST", url: "/checkout", expectedStatus: 500, customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: [{ courseId: "72nd-bpsc-prelims-current-affairs", couponCode: "STEP5_EXPIRED" }], description: "Server action rejects expired coupon" },
    { id: "J4-15", persona: "Anonymous", method: "POST", url: "/checkout", expectedStatus: 500, customHeaders: { "Next-Action": "400bb25523ed3fd00de26424b1fd586bf53fbbfd13", "Accept": "text/x-component" }, bodyPayload: [{ courseId: "72nd-bpsc-prelims-current-affairs" }], description: "Server action rejects anonymous order creation" },
    { id: "J4-16", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_p9_valid_1", razorpay_payment_id: "pay_p9_valid_1", razorpay_signature: "sig" }, description: "Tampered payment verification fails cleanly" },
    { id: "J4-17", persona: "FREE", method: "GET", url: "/checkout/cancel", expectedStatus: 404, description: "Unknown checkout subroute 404" },
    { id: "J4-18", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_PERC20", discountValue: 99 }, description: "Client injected discountValue ignored" },
    { id: "J4-19", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_PERC20", discountType: "FLAT" }, description: "Client injected discountType ignored" },
    { id: "J4-20", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_PERC20", finalPaise: 100 }, description: "Client injected finalPaise ignored" },
    { id: "J4-21", persona: "FREE", method: "POST", url: "/api/courses/demo/book", expectedStatus: 400, bodyPayload: {}, description: "Book demo empty payload rejected with 400" },
    { id: "J4-22", persona: "FREE", method: "POST", url: "/api/courses/demo/book", expectedStatus: 400, bodyPayload: { courseId: "c_paid_72nd_p9" }, description: "Book demo missing slotId rejected with 400" },
    { id: "J4-23", persona: "FREE", method: "POST", url: "/api/courses/demo/book", expectedStatus: 400, bodyPayload: { slotId: "slot_1" }, description: "Book demo missing courseId rejected with 400" },
    { id: "J4-24", persona: "FREE", method: "POST", url: "/api/courses/demo/complete", expectedStatus: 400, bodyPayload: {}, description: "Demo complete missing bookingId rejected with 400" },
    { id: "J4-25", persona: "TEACHER", method: "POST", url: "/api/courses/demo/screen", expectedStatus: 400, bodyPayload: {}, description: "Demo screen missing session parameters rejected" },
  ];
  cases.push(...j4Defs);

  // J5 Free enroll (20 cases)
  const j5Defs: TestCaseDef[] = [
    { id: "J5-01", persona: "FREE", method: "POST", url: "/api/courses/enroll", expectedStatus: 403, expectedBodySnippet: "paid course", bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs" }, description: "Enroll on paid course returns 403" },
    { id: "J5-02", persona: "FREE", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 403, expectedBodySnippet: "paid course", bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs" }, description: "Free-enroll on paid course returns 403" },
    { id: "J5-03", persona: "FREE", method: "POST", url: "/api/courses/enroll", expectedStatus: 200, expectedBodySnippet: "Enrolled successfully", bodyPayload: { courseId: "free-general-studies" }, description: "Enroll on free course succeeds with 200" },
    { id: "J5-04", persona: "FREE", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 200, expectedBodySnippet: "Enrolled successfully", bodyPayload: { courseId: "free-general-studies" }, description: "Free-enroll on free course succeeds with 200" },
    { id: "J5-05", persona: "FREE", method: "POST", url: "/api/courses/enroll", expectedStatus: 404, expectedBodySnippet: "Course not found", bodyPayload: { courseId: "draft-secret-course" }, description: "Enroll on draft course returns 404" },
    { id: "J5-06", persona: "FREE", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 404, expectedBodySnippet: "Course not found", bodyPayload: { courseId: "draft-secret-course" }, description: "Free-enroll on draft course returns 404" },
    { id: "J5-07", persona: "Anonymous", method: "POST", url: "/api/courses/enroll", expectedStatus: 401, bodyPayload: { courseId: "free-general-studies" }, description: "Anonymous enroll without phone returns 401" },
    { id: "J5-08", persona: "Anonymous", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 401, bodyPayload: { courseId: "free-general-studies" }, description: "Anonymous free-enroll without phone returns 401" },
    { id: "J5-09", persona: "Anonymous", method: "POST", url: "/api/courses/enroll", expectedStatus: 200, expectedBodySnippet: "Enrolled successfully", bodyPayload: { courseId: "free-general-studies", phoneNumber: "9876543220" }, description: "Anonymous enroll with phone auto-creates user" },
    { id: "J5-10", persona: "Anonymous", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 200, expectedBodySnippet: "Enrolled successfully", bodyPayload: { courseId: "free-general-studies", phoneNumber: "9876543221" }, description: "Anonymous free-enroll with phone auto-creates user" },
    { id: "J5-11", persona: "FREE", method: "POST", url: "/api/courses/enroll", expectedStatus: 400, bodyPayload: {}, description: "Enroll without courseId returns 400" },
    { id: "J5-12", persona: "FREE", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 400, bodyPayload: {}, description: "Free-enroll without courseId returns 400" },
    { id: "J5-13", persona: "FREE", method: "POST", url: "/api/courses/enroll", expectedStatus: 404, bodyPayload: { courseId: "non_existent_course" }, description: "Enroll on missing course returns 404" },
    { id: "J5-14", persona: "FREE", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 404, bodyPayload: { courseId: "non_existent_course" }, description: "Free-enroll on missing course returns 404" },
    { id: "J5-15", persona: "FREE", method: "POST", url: "/api/courses/enroll", expectedStatus: 200, expectedBodySnippet: "Enrolled successfully", bodyPayload: { courseId: "free-general-studies", idempotencyKey: "idem_enroll_1" }, description: "Enroll is idempotent on second call" },
    { id: "J5-16", persona: "FREE", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 200, expectedBodySnippet: "Enrolled successfully", bodyPayload: { courseId: "free-general-studies", idempotencyKey: "idem_free_enroll_1" }, description: "Free-enroll is idempotent on second call" },
    { id: "J5-17", persona: "Anonymous", method: "POST", url: "/api/courses/enroll", expectedStatus: 400, bodyPayload: { courseId: "free-general-studies", phoneNumber: "123" }, description: "Enroll with invalid phone returns 400" },
    { id: "J5-18", persona: "Anonymous", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 400, bodyPayload: { courseId: "free-general-studies", phoneNumber: "invalid_phone" }, description: "Free-enroll with invalid phone returns 400" },
    { id: "J5-19", persona: "PREMIUM", method: "POST", url: "/api/courses/enroll", expectedStatus: 200, expectedBodySnippet: "Enrolled successfully", bodyPayload: { courseId: "free-general-studies" }, description: "Premium user enrolls in free course" },
    { id: "J5-20", persona: "PREMIUM", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 200, expectedBodySnippet: "Enrolled successfully", bodyPayload: { courseId: "free-general-studies" }, description: "Premium user free-enrolls in free course" },
  ];
  cases.push(...j5Defs);

  // J6 Learning & Lessons (20 cases)
  const j6Defs: TestCaseDef[] = [
    { id: "J6-01", persona: "FREE", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_trial_p9", expectedStatus: 200, description: "Enrolled/free user views trial lesson player" },
    { id: "J6-02", persona: "FREE", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9", expectedStatus: 307, description: "Unenrolled user redirected away from locked lesson" },
    { id: "J6-03", persona: "ADMIN", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9", expectedStatus: 200, description: "Admin bypasses paywall to view locked lesson" },
    { id: "J6-04", persona: "TEACHER", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9", expectedStatus: 200, description: "Teacher owner views locked lesson" },
    { id: "J6-05", persona: "FREE", method: "GET", url: "/courses/draft-secret-course/learn/some-lesson", expectedStatus: 404, expectedBodySnippet: "404", description: "Learn route for draft course returns HTTP 404" },
    { id: "J6-06", persona: "ADMIN", method: "GET", url: "/courses/draft-secret-course/learn/some-lesson", expectedStatus: 404, expectedBodySnippet: "404", description: "Learn route for non-existent lesson in draft course returns HTTP 404" },
    { id: "J6-07", persona: "FREE", method: "POST", url: "/api/courses/progress", expectedStatus: 200, bodyPayload: { lessonId: "l_a_trial_p9", timeSpent: 60, completed: true }, description: "Save progress on trial lesson" },
    { id: "J6-08", persona: "FREE", method: "POST", url: "/api/courses/progress", expectedStatus: 200, bodyPayload: { lessonId: "l_a_trial_p9", timeSpent: 120 }, description: "Save watch time on trial lesson" },
    { id: "J6-09", persona: "Anonymous", method: "POST", url: "/api/courses/progress", expectedStatus: 401, bodyPayload: { lessonId: "l_a_trial_p9" }, description: "Anonymous cannot save lesson progress" },
    { id: "J6-10", persona: "FREE", method: "POST", url: "/api/courses/progress", expectedStatus: 400, bodyPayload: {}, description: "Progress missing lessonId rejected" },
    { id: "J6-11", persona: "FREE", method: "GET", url: "/api/courses/progress?courseId=72nd-bpsc-prelims-current-affairs", expectedStatus: 405, description: "GET progress not supported (POST only)" },
    { id: "J6-12", persona: "Anonymous", method: "GET", url: "/api/courses/progress?courseId=72nd-bpsc-prelims-current-affairs", expectedStatus: 405, description: "GET progress not supported (POST only)" },
    { id: "J6-13", persona: "FREE", method: "GET", url: "/api/courses/progress", expectedStatus: 405, description: "GET progress not supported (POST only)" },
    { id: "J6-14", persona: "FREE", method: "GET", url: "/learn/72nd-bpsc-prelims-current-affairs", expectedStatus: 307, description: "Standalone learn route redirects to first lesson" },
    { id: "J6-15", persona: "FREE", method: "GET", url: "/learn/draft-secret-course", expectedStatus: 404, expectedBodySnippet: "404", description: "Standalone learn route returns 404 for draft course" },
    { id: "J6-16", persona: "ADMIN", method: "GET", url: "/learn/draft-secret-course", expectedStatus: 307, description: "Admin accessing learn draft redirects to first lesson" },
    { id: "J6-17", persona: "FREE", method: "GET", url: "/learn/non-existent-course-slug", expectedStatus: 404, expectedBodySnippet: "404", description: "Standalone learn route returns 404 for missing course" },
    { id: "J6-18", persona: "FREE", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs/demo", expectedStatus: 200, expectedBodySnippet: "Demo", description: "Demo room route loads" },
    { id: "J6-19", persona: "Anonymous", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs/demo", expectedStatus: 200, expectedBodySnippet: "Demo", description: "Anonymous demo room loads" },
    { id: "J6-20", persona: "FREE", method: "GET", url: "/courses/draft-secret-course/demo", expectedStatus: 404, expectedBodySnippet: "404", description: "Demo room for draft course returns HTTP 404" },
  ];
  cases.push(...j6Defs);

  // J7 Tests & Reports (30 cases)
  const j7Defs: TestCaseDef[] = [
    { id: "J7-01", persona: "FREE", method: "GET", url: "/test-series", expectedStatus: 200, expectedBodySnippet: "Test Series", description: "Test series catalog loads" },
    { id: "J7-02", persona: "FREE", method: "GET", url: "/my-tests", expectedStatus: 200, expectedBodySnippet: "My Tests", description: "My tests page loads" },
    { id: "J7-03", persona: "FREE", method: "GET", url: "/test-series/bpsc-72nd-2026", expectedStatus: 200, description: "Test series detail page loads" },
    { id: "J7-04", persona: "FREE", method: "GET", url: "/test-series/non-existent-series", expectedStatus: 404, expectedBodySnippet: "404", description: "Non-existent series returns HTTP 404" },
    { id: "J7-05", persona: "FREE", method: "GET", url: "/api/exam/series/list", expectedStatus: 200, expectedBodySnippet: "series", description: "API series list returns JSON" },
    { id: "J7-06", persona: "FREE", method: "POST", url: "/api/exam/series/enroll", expectedStatus: 400, bodyPayload: {}, description: "Enroll series missing seriesId 400" },
    { id: "J7-07", persona: "Anonymous", method: "POST", url: "/api/exam/series/enroll", expectedStatus: 401, bodyPayload: { seriesId: "es_bpsc_step4" }, description: "Anonymous series enroll 401" },
    { id: "J7-08", persona: "FREE", method: "POST", url: "/api/exam/series/enroll", expectedStatus: 200, expectedBodySnippet: "success", bodyPayload: { seriesId: "es_bpsc_step4" }, description: "Enroll in free test series succeeds" },
    { id: "J7-09", persona: "FREE", method: "POST", url: "/api/exam/series/enroll", expectedStatus: 403, bodyPayload: { seriesId: "es_upsc_seed" }, description: "Enroll in Pro test series returns 403" },
    { id: "J7-10", persona: "FREE", method: "GET", url: "/api/exam/test/list?seriesId=es_bpsc_step4", expectedStatus: 200, description: "List tests in series returns 200" },
    { id: "J7-11", persona: "FREE", method: "GET", url: "/api/exam/test/list", expectedStatus: 200, description: "List all published tests when seriesId omitted" },
    { id: "J7-12", persona: "FREE", method: "POST", url: "/api/exam/attempt/start", expectedStatus: 400, bodyPayload: {}, description: "Start attempt missing testId returns 400" },
    { id: "J7-13", persona: "Anonymous", method: "POST", url: "/api/exam/attempt/start", expectedStatus: 401, bodyPayload: { testId: "test_integrity_free_p9" }, description: "Anonymous start attempt returns 401" },
    { id: "J7-14", persona: "FREE", method: "GET", url: "/api/exam/attempt/user-status", expectedStatus: 200, description: "User attempt status returns empty data when testId omitted" },
    { id: "J7-15", persona: "Anonymous", method: "GET", url: "/api/exam/attempt/user-status?testId=test_integrity_free_p9", expectedStatus: 200, description: "Anonymous user attempt status returns empty list" },
    { id: "J7-16", persona: "FREE", method: "GET", url: "/api/exam/attempt/user-status?testId=test_integrity_free_p9", expectedStatus: 200, description: "User attempt status returns 200" },
    { id: "J7-17", persona: "FREE", method: "POST", url: "/api/exam/attempt/att_nonexistent_12345/sync", expectedStatus: 404, bodyPayload: {}, description: "Sync non-existent attempt returns 404" },
    { id: "J7-18", persona: "Anonymous", method: "POST", url: "/api/exam/attempt/att_nonexistent_12345/sync", expectedStatus: 401, bodyPayload: { answers: [] }, description: "Anonymous sync attempt returns 401" },
    { id: "J7-19", persona: "FREE", method: "POST", url: "/api/exam/attempt/att_nonexistent_12345/submit", expectedStatus: 404, bodyPayload: {}, description: "Submit non-existent attempt returns 404" },
    { id: "J7-20", persona: "Anonymous", method: "POST", url: "/api/exam/attempt/att_nonexistent_12345/submit", expectedStatus: 401, bodyPayload: { answers: [] }, description: "Anonymous submit attempt returns 401" },
    { id: "J7-21", persona: "FREE", method: "GET", url: "/api/exam/attempt/att_nonexistent_12345/result", expectedStatus: 404, description: "Result for non-existent attempt returns 404" },
    { id: "J7-22", persona: "Anonymous", method: "GET", url: "/api/exam/attempt/att_nonexistent_12345/result", expectedStatus: 401, description: "Anonymous get attempt result returns 401" },
    { id: "J7-23", persona: "FREE", method: "GET", url: "/api/exam/test_nonexistent_12345/leaderboard", expectedStatus: 404, description: "Non-existent test leaderboard returns 404" },
    { id: "J7-24", persona: "FREE", method: "GET", url: "/test-series/bpsc-72nd-2026/instructions", expectedStatus: 200, description: "Test instructions page loads" },
    { id: "J7-25", persona: "FREE", method: "GET", url: "/test-series/bpsc-72nd-2026/declaration", expectedStatus: 200, description: "Test declaration page loads" },
    { id: "J7-26", persona: "FREE", method: "GET", url: "/test-series/bpsc-72nd-2026/attempt", expectedStatus: 200, description: "Test attempt interface loads" },
    { id: "J7-27", persona: "FREE", method: "GET", url: "/test-series/bpsc-72nd-2026/result", expectedStatus: 200, description: "Test result review page loads" },
    { id: "J7-28", persona: "FREE", method: "GET", url: "/test-series/bpsc-72nd-2026/solutions", expectedStatus: 200, description: "Test solutions page loads" },
    { id: "J7-29", persona: "FREE", method: "GET", url: "/test-series/bpsc-72nd-2026/leaderboard", expectedStatus: 200, description: "Test leaderboard view loads" },
    { id: "J7-30", persona: "FREE", method: "GET", url: "/test-series/bpsc-72nd-2026/print", expectedStatus: 200, description: "Test print/PDF view loads" },
  ];
  cases.push(...j7Defs);

  // J8 Navigation Crawl (35 cases)
  const j8Defs: TestCaseDef[] = [
    { id: "J8-01", persona: "FREE", method: "GET", url: "/dashboard", expectedStatus: 200, expectedBodySnippet: "Student", description: "Student dashboard loads" },
    { id: "J8-02", persona: "FREE", method: "GET", url: "/courses", expectedStatus: 200, expectedBodySnippet: "Courses", description: "Student courses catalog loads" },
    { id: "J8-03", persona: "FREE", method: "GET", url: "/my-learning", expectedStatus: 200, expectedBodySnippet: "My Batches", description: "My learning loads" },
    { id: "J8-04", persona: "FREE", method: "GET", url: "/test-series?view=grid", expectedStatus: 200, expectedBodySnippet: "Test Series", description: "Test series grid view loads" },
    { id: "J8-05", persona: "FREE", method: "GET", url: "/my-tests?tab=active", expectedStatus: 200, expectedBodySnippet: "My Tests", description: "My tests active tab loads" },
    { id: "J8-06", persona: "FREE", method: "GET", url: "/current-affairs-quizzes", expectedStatus: 200, expectedBodySnippet: "Current Affairs", description: "Current affairs quizzes load" },
    { id: "J8-07", persona: "FREE", method: "GET", url: "/books", expectedStatus: 200, expectedBodySnippet: "Books", description: "Bookstore loads" },
    { id: "J8-08", persona: "FREE", method: "GET", url: "/books/cart", expectedStatus: 200, expectedBodySnippet: "Cart", description: "Books cart loads" },
    { id: "J8-09", persona: "FREE", method: "GET", url: "/books/orders", expectedStatus: 200, expectedBodySnippet: "Orders", description: "Books orders load" },
    { id: "J8-10", persona: "FREE", method: "GET", url: "/pyqs", expectedStatus: 200, expectedBodySnippet: "Previous Year", description: "PYQs catalog loads" },
    { id: "J8-11", persona: "FREE", method: "GET", url: "/practice", expectedStatus: 200, expectedBodySnippet: "Practice", description: "Coding practice loads" },
    { id: "J8-12", persona: "FREE", method: "GET", url: "/tutorials", expectedStatus: 200, expectedBodySnippet: "Tutorials", description: "Tutorials load" },
    { id: "J8-13", persona: "FREE", method: "GET", url: "/doubts", expectedStatus: 200, expectedBodySnippet: "Doubts", description: "Doubts forum loads" },
    { id: "J8-14", persona: "FREE", method: "GET", url: "/profile", expectedStatus: 200, expectedBodySnippet: "Profile", description: "User profile loads" },
    { id: "J8-15", persona: "FREE", method: "GET", url: "/settings", expectedStatus: 200, expectedBodySnippet: "Settings", description: "User settings load" },
    { id: "J8-16", persona: "FREE", method: "GET", url: "/settings/subscription", expectedStatus: 200, expectedBodySnippet: "Subscription", description: "Subscription settings load" },
    { id: "J8-17", persona: "FREE", method: "GET", url: "/subscription", expectedStatus: 200, expectedBodySnippet: "Subscription", description: "Subscription billing loads" },
    { id: "J8-18", persona: "FREE", method: "GET", url: "/purchases", expectedStatus: 200, expectedBodySnippet: "Purchase", description: "Purchase history loads" },
    { id: "J8-19", persona: "FREE", method: "GET", url: "/tracks", expectedStatus: 200, expectedBodySnippet: "Career", description: "Career tracks load" },
    { id: "J8-20", persona: "FREE", method: "GET", url: "/tracks/skills", expectedStatus: 200, description: "Skill tracks load" },
    { id: "J8-21", persona: "FREE", method: "GET", url: "/code-along", expectedStatus: 200, expectedBodySnippet: "Code", description: "Code-along hub loads" },
    { id: "J8-22", persona: "FREE", method: "GET", url: "/assessments", expectedStatus: 307, description: "Assessments catalog redirects to practice" },
    { id: "J8-23", persona: "FREE", method: "GET", url: "/leaderboard", expectedStatus: 200, expectedBodySnippet: "Leaderboard", description: "Global leaderboard loads" },
    { id: "J8-24", persona: "FREE", method: "GET", url: "/forms", expectedStatus: 200, expectedBodySnippet: "Form", description: "Forms portal loads" },
    { id: "J8-25", persona: "TEACHER", method: "GET", url: "/teacher", expectedStatus: 200, expectedBodySnippet: "Teacher", description: "Teacher portal loads" },
    { id: "J8-26", persona: "TEACHER", method: "GET", url: "/teacher/classes", expectedStatus: 200, expectedBodySnippet: "Classes", description: "Teacher classes load" },
    { id: "J8-27", persona: "TEACHER", method: "GET", url: "/teacher/classes/new", expectedStatus: 200, description: "Teacher new class loads" },
    { id: "J8-28", persona: "TEACHER", method: "GET", url: "/teacher/questions", expectedStatus: 200, expectedBodySnippet: "Questions", description: "Teacher questions load" },
    { id: "J8-29", persona: "TEACHER", method: "GET", url: "/teacher/test-series", expectedStatus: 200, expectedBodySnippet: "Test Series", description: "Teacher test series load" },
    { id: "J8-30", persona: "TEACHER", method: "GET", url: "/teacher/test-series/create", expectedStatus: 200, expectedBodySnippet: "Create", description: "Teacher create test series loads" },
    { id: "J8-31", persona: "TEACHER", method: "GET", url: "/teacher/tests/new", expectedStatus: 200, expectedBodySnippet: "Test", description: "Teacher new test loads" },
    { id: "J8-32", persona: "TEACHER", method: "GET", url: "/teacher/pyqs", expectedStatus: 307, description: "Teacher PYQ hub redirects to admin pyqs" },
    { id: "J8-33", persona: "ADMIN", method: "GET", url: "/admin", expectedStatus: 307, description: "Admin root route redirects to dashboard" },
    { id: "J8-34", persona: "ADMIN", method: "GET", url: "/admin/users", expectedStatus: 200, expectedBodySnippet: "Users", description: "Admin user management loads" },
    { id: "J8-35", persona: "ADMIN", method: "GET", url: "/admin/audit", expectedStatus: 200, expectedBodySnippet: "Audit", description: "Admin audit logs load" },
  ];
  cases.push(...j8Defs);

  // J9 Payment API Matrix (20 cases)
  const j9Defs: TestCaseDef[] = [
    { id: "J9-01", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"finalPaise":149900', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP4_FLAT500" }, description: "Coupon preview STEP4_FLAT500 calculation" },
    { id: "J9-02", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"finalPaise":99950', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP4_MAX1" }, description: "Coupon preview STEP4_MAX1 calculation" },
    { id: "J9-03", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"finalPaise":179910', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "CFKTEST" }, description: "Coupon preview CFKTEST 10% calculation" },
    { id: "J9-04", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_1" }, description: "Verify missing payment_id" },
    { id: "J9-05", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_payment_id: "pay_1" }, description: "Verify missing order_id" },
    { id: "J9-06", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1" }, description: "Verify missing signature" },
    { id: "J9-07", persona: "FREE", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 400, bodyPayload: { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "invalid_sig" }, description: "Verify invalid signature" },
    { id: "J9-08", persona: "Anonymous", method: "POST", url: "/api/webhooks/razorpay", expectedStatus: 400, customHeaders: { "x-razorpay-signature": "sig" }, bodyPayload: { event: "payment.captured", dummyField: "fresh_test_908" }, description: "Webhook missing proper signature on payment.captured" },
    { id: "J9-09", persona: "Anonymous", method: "POST", url: "/api/webhooks/razorpay", expectedStatus: 400, customHeaders: { "x-razorpay-signature": "sig" }, bodyPayload: { dummy: "empty_payload_check" }, description: "Webhook missing event parameter" },
    { id: "J9-10", persona: "Anonymous", method: "POST", url: "/api/webhooks/stripe", expectedStatus: 400, bodyPayload: { type: "payment_intent.succeeded" }, description: "Stripe webhook missing stripe signature header" },
    { id: "J9-11", persona: "FREE", method: "POST", url: "/api/checkout/route", expectedStatus: 404, description: "Unknown checkout subroute 404" },
    { id: "J9-12", persona: "FREE", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 200, bodyPayload: { courseId: "free-general-studies", trackingRef: "campaign_summer_2026" }, description: "Free enroll payment gateway bypass with tracking" },
    { id: "J9-13", persona: "FREE", method: "POST", url: "/api/courses/free-enroll", expectedStatus: 403, bodyPayload: { courseId: "c_paid_72nd_step4" }, description: "Free enroll cannot bypass paid course" },
    { id: "J9-14", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "c_paid_72nd_step4", code: "STEP5_PERC20" }, description: "Coupon preview price calculation" },
    { id: "J9-15", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "c_paid_72nd_step4", code: "STEP5_EXPIRED" }, description: "Coupon preview expired rejection" },
    { id: "J9-16", persona: "FREE", method: "POST", url: "/api/courses/demo/complete", expectedStatus: 400, bodyPayload: { dummyField: "param_check" }, description: "Demo complete missing parameters" },
    { id: "J9-17", persona: "FREE", method: "POST", url: "/api/courses/demo/book", expectedStatus: 400, bodyPayload: { dummyField: "param_check" }, description: "Demo book missing parameters" },
    { id: "J9-18", persona: "Anonymous", method: "POST", url: "/api/checkout/razorpay", expectedStatus: 410, bodyPayload: { source: "anonymous_checkout" }, description: "Deprecated REST order endpoint returns 410" },
    { id: "J9-19", persona: "Anonymous", method: "POST", url: "/api/verify-payment/razorpay", expectedStatus: 401, bodyPayload: { razorpay_order_id: "order_1" }, description: "Anonymous cannot verify payment" },
    { id: "J9-20", persona: "FREE", method: "POST", url: "/api/checkout/razorpay", expectedStatus: 410, bodyPayload: { source: "free_checkout" }, description: "Deprecated REST order endpoint returns 410" },
  ];
  cases.push(...j9Defs);

  // J10 Coupons end to end (20 cases)
  const j10Defs: TestCaseDef[] = [
    { id: "J10-01", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"discountPaise":50000', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_FLAT500" }, description: "FLAT500 discount math accurate" },
    { id: "J10-02", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"discountPaise":99950', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_MAX1" }, description: "50% max1 discount math accurate" },
    { id: "J10-03", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, expectedBodySnippet: "Invalid or expired coupon", bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "INVALID_CODE" }, description: "Non-existent coupon rejected" },
    { id: "J10-04", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "   " }, description: "Whitespace-only code rejected" },
    { id: "J10-05", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { code: "STEP5_FLAT500" }, description: "Missing courseId rejected" },
    { id: "J10-06", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"finalPaise":159920', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "  STEP5_PERC20  " }, description: "Trimmed code matches" },
    { id: "J10-07", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, expectedBodySnippet: '"finalPaise":159920', bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "step5_perc20" }, description: "Lowercase code matches" },
    { id: "J10-08", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 404, bodyPayload: { courseId: "c_draft_secret_step4", code: "STEP5_PERC20" }, description: "Coupon preview on draft course 404" },
    { id: "J10-09", persona: "ADMIN", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "c_draft_secret_step4", code: "STEP5_PERC20" }, description: "Admin can preview coupon on draft course" },
    { id: "J10-10", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "free-general-studies", code: "STEP5_PERC20" }, description: "Coupon preview on free course rejected" },
    { id: "J10-11", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "<script>alert(1)</script>" }, description: "XSS coupon code rejected safely" },
    { id: "J10-12", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "' OR 1=1 --" }, description: "SQL injection coupon code rejected safely" },
    { id: "J10-13", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP4_PERC20" }, description: "Coupon preview STEP4_PERC20" },
    { id: "J10-14", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "  step4_flat500  " }, description: "Coupon preview STEP4_FLAT500 trimmed and case-insensitive" },
    { id: "J10-15", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "step4_max1" }, description: "Coupon preview STEP4_MAX1 lowercase" },
    { id: "J10-16", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP4_EXPIRED" }, description: "Coupon preview STEP4_EXPIRED" },
    { id: "J10-17", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "LIMITED_ONE_PASS95" }, description: "Coupon preview LIMITED_ONE_PASS95" },
    { id: "J10-18", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "LIMITED_ONE_PASS96" }, description: "Coupon preview LIMITED_ONE_PASS96" },
    { id: "J10-19", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 400, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "EXPIRED_TEST_COUPON" }, description: "Coupon preview EXPIRED_TEST_COUPON" },
    { id: "J10-20", persona: "FREE", method: "POST", url: "/api/checkout/coupon/preview", expectedStatus: 200, bodyPayload: { courseId: "72nd-bpsc-prelims-current-affairs", code: "cfktest" }, description: "Coupon preview CFKTEST lowercase" },
  ];
  cases.push(...j10Defs);

  // J11 Teacher & Admin flows (25 cases)
  const j11Defs: TestCaseDef[] = [
    { id: "J11-01", persona: "FREE", method: "POST", url: "/api/admin/run-analytics", expectedStatus: 403, description: "Non-admin blocked from run-analytics" },
    { id: "J11-02", persona: "TEACHER", method: "POST", url: "/api/admin/run-analytics", expectedStatus: 403, description: "Teacher blocked from super admin analytics" },
    { id: "J11-03", persona: "ADMIN", method: "POST", url: "/api/admin/run-analytics", expectedStatus: 200, expectedBodySnippet: '"success":true', description: "Admin can run analytics" },
    { id: "J11-04", persona: "FREE", method: "GET", url: "/admin", expectedStatus: 307, description: "Student redirected from /admin" },
    { id: "J11-05", persona: "FREE", method: "GET", url: "/teacher", expectedStatus: 307, description: "Student redirected from /teacher" },
    { id: "J11-06", persona: "TEACHER", method: "GET", url: "/admin/users", expectedStatus: 307, description: "Teacher redirected from super admin users" },
    { id: "J11-07", persona: "TEACHER", method: "GET", url: "/admin/audit", expectedStatus: 307, description: "Teacher redirected from super admin audit" },
    { id: "J11-08", persona: "TEACHER", method: "GET", url: "/admin/courses", expectedStatus: 200, expectedBodySnippet: "Courses", description: "Teacher can access video courses studio" },
    { id: "J11-09", persona: "TEACHER", method: "GET", url: "/admin/test-series", expectedStatus: 200, expectedBodySnippet: "Test Series", description: "Teacher can access test series studio" },
    { id: "J11-10", persona: "TEACHER", method: "GET", url: "/admin/pyqs", expectedStatus: 200, expectedBodySnippet: "PYQ", description: "Teacher can access PYQ studio" },
    { id: "J11-11", persona: "TEACHER", method: "GET", url: "/admin/tutorials", expectedStatus: 200, expectedBodySnippet: "Tutorial", description: "Teacher can access tutorial studio" },
    { id: "J11-12", persona: "ADMIN", method: "GET", url: "/admin/courses", expectedStatus: 200, expectedBodySnippet: "Courses", description: "Admin can access courses studio" },
    { id: "J11-13", persona: "ADMIN", method: "GET", url: "/admin/test-series", expectedStatus: 200, expectedBodySnippet: "Test Series", description: "Admin can access test series studio" },
    { id: "J11-14", persona: "ADMIN", method: "GET", url: "/admin/users?search=test", expectedStatus: 200, expectedBodySnippet: "Users", description: "Admin can filter user management by search" },
    { id: "J11-15", persona: "ADMIN", method: "GET", url: "/admin/audit?action=LOGIN", expectedStatus: 200, expectedBodySnippet: "Audit", description: "Admin can filter audit log by action" },
    { id: "J11-16", persona: "TEACHER", method: "GET", url: "/teacher/classes?page=1", expectedStatus: 200, expectedBodySnippet: "Classes", description: "Teacher classes overview loads page 1" },
    { id: "J11-17", persona: "TEACHER", method: "GET", url: "/teacher/classes/new?type=live", expectedStatus: 200, description: "Teacher create live class form loads" },
    { id: "J11-18", persona: "TEACHER", method: "GET", url: "/teacher/questions?difficulty=EASY", expectedStatus: 200, expectedBodySnippet: "Questions", description: "Teacher questions filtered by difficulty" },
    { id: "J11-19", persona: "TEACHER", method: "GET", url: "/teacher/test-series?status=all", expectedStatus: 200, expectedBodySnippet: "Test Series", description: "Teacher test series view filtered by status" },
    { id: "J11-20", persona: "TEACHER", method: "GET", url: "/teacher/pyqs?year=2024", expectedStatus: 307, description: "Teacher PYQ year filter redirects to admin pyqs" },
    { id: "J11-21", persona: "TEACHER", method: "POST", url: "/api/teacher/classes", expectedStatus: 400, bodyPayload: {}, description: "Create class empty payload rejected" },
    { id: "J11-22", persona: "FREE", method: "POST", url: "/api/teacher/classes", expectedStatus: 403, bodyPayload: { title: "Class" }, description: "Student cannot create teacher class" },
    { id: "J11-23", persona: "Anonymous", method: "POST", url: "/api/teacher/classes", expectedStatus: 401, bodyPayload: { title: "Class" }, description: "Anonymous cannot create teacher class" },
    { id: "J11-24", persona: "FREE", method: "GET", url: "/admin/settings", expectedStatus: 307, description: "Student blocked from admin settings" },
    { id: "J11-25", persona: "TEACHER", method: "GET", url: "/admin/settings", expectedStatus: 307, description: "Teacher blocked from admin settings" },
  ];
  cases.push(...j11Defs);

  // J12 Security Sweep (20 cases)
  const j12Defs: TestCaseDef[] = [
    { id: "J12-01", persona: "FREE", method: "POST", url: "/api/user/goal", expectedStatus: 200, bodyPayload: { goalId: "upsc" }, description: "User updates their own goal" },
    { id: "J12-02", persona: "Anonymous", method: "POST", url: "/api/user/goal", expectedStatus: 401, bodyPayload: { goalId: "upsc" }, description: "Anonymous cannot update goal" },
    { id: "J12-03", persona: "FREE", method: "POST", url: "/api/user/goal", expectedStatus: 400, bodyPayload: {}, description: "Empty goal update rejected" },
    { id: "J12-04", persona: "FREE", method: "GET", url: "/api/goals", expectedStatus: 200, expectedBodySnippet: "goals", description: "List available goals returns 200" },
    { id: "J12-05", persona: "FREE", method: "GET", url: "/api/doubts", expectedStatus: 200, description: "List doubts returns 200" },
    { id: "J12-06", persona: "Anonymous", method: "POST", url: "/api/doubts", expectedStatus: 401, bodyPayload: { question: "Help?" }, description: "Anonymous cannot post doubt" },
    { id: "J12-07", persona: "FREE", method: "POST", url: "/api/doubts", expectedStatus: 400, bodyPayload: {}, description: "Empty doubt rejected" },
    { id: "J12-08", persona: "FREE", method: "GET", url: "/api/forms", expectedStatus: 200, description: "Forms API returns 200" },
    { id: "J12-09", persona: "FREE", method: "POST", url: "/api/forms", expectedStatus: 400, bodyPayload: {}, description: "Empty form submission rejected" },
    { id: "J12-10", persona: "FREE", method: "GET", url: "/api/leaderboard", expectedStatus: 200, expectedBodySnippet: "leaderboard", description: "Leaderboard API returns 200" },
    { id: "J12-11", persona: "FREE", method: "GET", url: "/api/upload/presigned-url", expectedStatus: 405, description: "GET method not allowed on presigned-url" },
    { id: "J12-12", persona: "FREE", method: "POST", url: "/api/upload", expectedStatus: 400, bodyPayload: {}, description: "Upload without file rejected" },
    { id: "J12-13", persona: "FREE", method: "POST", url: "/api/execute", expectedStatus: 400, bodyPayload: {}, description: "Code execute empty payload rejected" },
    { id: "J12-14", persona: "FREE", method: "GET", url: "/api/courses/video-courses", expectedStatus: 200, description: "Video courses list returns 200" },
    { id: "J12-15", persona: "FREE", method: "POST", url: "/api/courses/teacher-photo-upload", expectedStatus: 403, bodyPayload: {}, description: "Student cannot upload teacher photo" },
    { id: "J12-16", persona: "TEACHER", method: "POST", url: "/api/courses/teacher-photo-upload", expectedStatus: 400, bodyPayload: {}, description: "Teacher photo upload empty payload rejected" },
    { id: "J12-17", persona: "FREE", method: "GET", url: "/api/classroom/live-status", expectedStatus: 200, expectedBodySnippet: '"success":true', description: "Live classroom status returns 200" },
    { id: "J12-18", persona: "Anonymous", method: "GET", url: "/api/classroom/live-status", expectedStatus: 200, expectedBodySnippet: '"success":true', description: "Anonymous live status returns 200" },
    { id: "J12-19", persona: "FREE", method: "GET", url: "/api/exam/ai-parse", expectedStatus: 405, description: "GET on AI-parse endpoint rejected" },
    { id: "J12-20", persona: "FREE", method: "POST", url: "/api/exam/ai-parse", expectedStatus: 403, bodyPayload: {}, description: "AI-parse student access forbidden" },
  ];
  cases.push(...j12Defs);

  // J13 Resilience & UX Quality (15 cases)
  const j13Defs: TestCaseDef[] = [
    { id: "J13-01", persona: "Anonymous", method: "GET", url: "/?utm_source=seo", expectedStatus: 200, expectedBodySnippet: "aspirantbook", description: "Homepage loads with SEO campaign tracking" },
    { id: "J13-02", persona: "Anonymous", method: "GET", url: "/pricing?plan=monthly", expectedStatus: 200, expectedBodySnippet: "Pricing", description: "Pricing page loads with monthly plan preselected" },
    { id: "J13-03", persona: "Anonymous", method: "GET", url: "/login?redirect=/dashboard", expectedStatus: 200, expectedBodySnippet: "Sign In", description: "Login page loads with redirect parameter" },
    { id: "J13-04", persona: "Anonymous", method: "GET", url: "/register?role=student", expectedStatus: 200, expectedBodySnippet: "Create your account", description: "Register page loads with student role" },
    { id: "J13-05", persona: "Anonymous", method: "GET", url: "/courses/72nd-bpsc-prelims-current-affairs?preview=1", expectedStatus: 200, expectedBodySnippet: "72nd BPSC", description: "Course detail page loads with preview flag" },
    { id: "J13-06", persona: "FREE", method: "GET", url: "/dashboard?tab=overview", expectedStatus: 200, expectedBodySnippet: "Student", description: "Dashboard loads with overview tab" },
    { id: "J13-07", persona: "FREE", method: "GET", url: "/courses?category=all", expectedStatus: 200, expectedBodySnippet: "Courses", description: "Courses catalog loads with all category" },
    { id: "J13-08", persona: "FREE", method: "GET", url: "/my-learning?filter=in_progress", expectedStatus: 200, expectedBodySnippet: "My Batches", description: "My Batches loads with filter in_progress" },
    { id: "J13-09", persona: "FREE", method: "GET", url: "/test-series?filter=all", expectedStatus: 200, expectedBodySnippet: "Test Series", description: "Test Series loads with filter all" },
    { id: "J13-10", persona: "FREE", method: "GET", url: "/my-tests?filter=all", expectedStatus: 200, expectedBodySnippet: "My Tests", description: "My Tests loads with filter all" },
    { id: "J13-11", persona: "FREE", method: "GET", url: "/profile?tab=general", expectedStatus: 200, expectedBodySnippet: "Profile", description: "Profile loads with general tab" },
    { id: "J13-12", persona: "FREE", method: "GET", url: "/settings?tab=preferences", expectedStatus: 200, expectedBodySnippet: "Settings", description: "Settings loads with preferences tab" },
    { id: "J13-13", persona: "TEACHER", method: "GET", url: "/teacher?tab=overview", expectedStatus: 200, expectedBodySnippet: "Teacher", description: "Teacher home loads with overview tab" },
    { id: "J13-14", persona: "ADMIN", method: "GET", url: "/admin?from=portal", expectedStatus: 307, description: "Admin home redirects to admin dashboard with from param" },
    { id: "J13-15", persona: "Anonymous", method: "GET", url: "/not-found?reason=missing", expectedStatus: 404, expectedBodySnippet: "404 • Page Not Found", description: "404 page loads cleanly with return links" },
  ];
  cases.push(...j13Defs);

  return cases;
}
