# TrillionSkill Functional Requirements Specification

**Document status:** Code-derived baseline  
**Prepared:** 2026-10-05  
**Product/repository:** TrillionSkill (package name: `aspirantbook`)  
**Authority:** Current application routes, server actions, Prisma schema, configuration, and checked-in project rules. This records observable product behavior; it is not a claim that every workflow has been end-to-end verified.

## 1. Purpose and scope

This FRS describes the functional scope visible in the current repository. It covers the learner experience, instructional/teacher tools, administrator tools, exams and assessments, commerce, learning content, and supporting platform functions. Requirements are written as capabilities. Their status describes code evidence, not production readiness.

### Status key

| Status | Meaning |
|---|---|
| Implemented in code | A corresponding route, action, schema, or integration exists. This does not imply production configuration or end-to-end verification. |
| Partial / verify | Some implementation exists, but behavior or completeness is limited, configuration-dependent, or not established by static inspection. |
| Not established | The repository does not establish the claimed capability; treat it as an open requirement rather than shipped functionality. |

## 2. Actors and access roles

| Actor | Repository role | Main capabilities evidenced |
|---|---|---|
| Learner | `FREE` or `PREMIUM` | Browse learning content, enroll, study, take tests and assessments, use learner tools, view progress, manage profile and purchases. Premium access is mediated through subscription/entitlement logic. |
| Teacher | `TEACHER` | Access teacher surfaces, create/manage exam content, questions and classes, and access allowed studio/admin areas. Some `/admin` sections are restricted to administrators. |
| Administrator | `ADMIN` | Manage users, courses, tracks, assessments, exercises, tutorials, batches, books, PYQs, settings, analytics, and audit-related functions. |
| Guest | Unauthenticated | Access public landing, pricing, login/register, public course detail and batch detail surfaces where exposed. |

The persisted `UserRole` enum is `FREE`, `PREMIUM`, `TEACHER`, `ADMIN` ([schema](../prisma/schema.prisma)). Route protection is implemented in [`middleware.ts`](../middleware.ts) and server-side checks also occur in route handlers/actions. The `ts_demo_role` cookie can supply a demo role for middleware routing; it should not be confused with an authenticated user session or authorization proof for protected data operations.

## 3. Functional requirements

### 3.1 Identity, registration, and access control

| ID | Requirement | Status |
|---|---|---|
| FRS-ID-01 | The system shall allow a user to register and sign in through the configured NextAuth providers and credentials flow. | Implemented in code; provider and environment configuration required. |
| FRS-ID-02 | The system shall associate an authenticated session with a user ID, role, and subscription status. | Implemented in code. |
| FRS-ID-03 | The system shall require an authenticated session for learner areas such as dashboard, learning, exams, assessments, profile, purchases, and related tools. | Implemented in middleware for matched pages; verify API-level authorization separately. |
| FRS-ID-04 | The system shall restrict teacher and administrator areas by role, with selected administrator routes limited to `ADMIN`. | Implemented in middleware; server-side enforcement must also be applied to mutations. |
| FRS-ID-05 | The system shall safely redirect after authentication using a sanitized local return path. | Implemented in code. |
| FRS-ID-06 | A development mobile-login bypass shall remain disabled in production unless an explicitly supported test configuration enables it. | Implemented in auth configuration; verify deployment environment values. |

### 3.2 Learning catalog, courses, tracks, and progress

| ID | Requirement | Status |
|---|---|---|
| FRS-LRN-01 | Learners shall be able to browse courses and view course details. | Implemented in code. |
| FRS-LRN-02 | A learner shall be able to enroll in a course and view their learning library. | Implemented in code; see course enrollment actions/API and `Enrollment`. |
| FRS-LRN-03 | Course content shall be organized into chapters and lessons; lesson types include video, exercise, assessment, project, tutorial, code-along, and reading. | Implemented in schema and learner/admin surfaces. |
| FRS-LRN-04 | Learners shall be able to open course lessons and record lesson progress. | Implemented in code; completion/progress semantics should be verified per lesson type. |
| FRS-LRN-05 | Administrators shall be able to create and manage courses, chapters, lessons, tracks, and publishing state. | Implemented in admin pages/actions/APIs. |
| FRS-LRN-06 | Tracks shall organize courses as career or skill paths. | Implemented in schema and learner/admin pages. |
| FRS-LRN-07 | The system shall preserve lesson draft and published versions, including version metadata. | Implemented in schema and tutorial/content workflows; exact editorial lifecycle is implementation-specific. |
| FRS-LRN-08 | The system shall support course demo booking and live demo/classroom interactions. | Partial / verify; demo booking, stage, chat, media-token and watch-tracking routes exist. Requires external media configuration and operational validation. |

### 3.3 Exams and test series

| ID | Requirement | Status |
|---|---|---|
| FRS-EXM-01 | Learners shall be able to browse test series, view tests, enroll where permitted, and see test results/leaderboards/solutions where available. | Implemented in code. |
| FRS-EXM-02 | Starting a test shall require a valid published test (unless the learner is its creator/admin), valid duration and questions, and entitlement where applicable. | Implemented in `/api/exam/attempt/start`. |
| FRS-EXM-03 | The system shall create or resume an in-progress attempt and use a server-derived deadline. | Implemented in code. |
| FRS-EXM-04 | The learner shall be able to save answer selections, review markers, elapsed time, and tab-switch count to the server. | Implemented in attempt sync; ownership and status are checked, and client sequence ordering is used. |
| FRS-EXM-05 | The system shall submit/grade attempts and expose attempt results. | Implemented in code; grading details are defined by test configuration and grading service. |
| FRS-EXM-06 | Tests shall support English/Hindi question data and configurable positive/negative marks, sections, and test types. | Implemented in schema and test-start flow. Actual localization completeness depends on content. |
| FRS-EXM-07 | Teachers/admins shall be able to create test series, tests, and questions and review submissions. | Implemented across teacher/admin pages and exam APIs. |
| FRS-EXM-08 | The attempt screen shall support offline-first persistence, automatic resume after refresh, and complete cross-device recovery. | Not established by server code inspected; do not promise these guarantees without verifying client persistence and network recovery. |
| FRS-EXM-09 | The system shall provide proctoring, percentile/AIR ranking, and a mistake notebook for every exam. | Partial / verify; schema has some attempt diagnostics/ranking fields, but comprehensive behavior is not established. |

### 3.4 Assessments and coding exercises

| ID | Requirement | Status |
|---|---|---|
| FRS-ASM-01 | Learners shall be able to open, start, submit, and view results for course assessments. | Implemented in pages and APIs. |
| FRS-ASM-02 | Assessment questions shall support the question types represented by the schema, including multiple choice, code completion, fill blank, code output, and true/false. | Implemented in schema; actual UI support can vary by question type. |
| FRS-COD-01 | A learner shall be able to submit code for remote execution through the configured Piston-compatible service. | Implemented in `/api/execute`; requires network/service configuration. |
| FRS-COD-02 | The execution endpoint shall require an authenticated user, require code and language, and enforce a 10 KB code-size limit. | Implemented in the route handler. |
| FRS-COD-03 | The execution request shall use configured runtime and compile timeouts. | Implemented with 3 s runtime and 10 s compile timeout in the route. |
| FRS-COD-04 | Each supplied test case shall be executed independently against its input and hidden cases shall remain undisclosed. | Not established. Current route comments state supplied cases are checked against the single current output rather than rerunning code per input; do not represent hidden-case evaluation as shipped. |

### 3.5 PYQs, tutorials, forms, doubts, books, and other learner tools

| ID | Requirement | Status |
|---|---|---|
| FRS-AUX-01 | Learners shall be able to browse previous-year question (PYQ) categories/papers and use the available paper/PDF flows. | Implemented in pages/APIs; access/unlock details depend on paper state. |
| FRS-AUX-02 | Administrators shall be able to manage PYQ categories, sub-exams, papers, uploads, and lead records. | Implemented in admin surfaces/APIs. |
| FRS-AUX-03 | Learners shall be able to view tutorials and structured learning materials. | Implemented in code; available content depends on published records. |
| FRS-AUX-04 | Authorized staff shall be able to import tutorial/course packages. Imports should match content by external identifiers and create drafts unless explicitly published. | Import path exists. Project-level importer rules require external-ID matching and draft-first behavior; inspect each importer path before claiming all imports comply. |
| FRS-AUX-05 | Learners shall be able to access doubts, forms, projects, code-along, current-affairs quiz, search, and leaderboard surfaces. | Pages exist; feature completeness and data-backed behavior vary and should be verified before treating every surface as complete. |
| FRS-AUX-06 | Learners shall be able to browse/order books and review their orders. | Implemented in pages/APIs; fulfillment lifecycle is not established here. |
| FRS-AUX-07 | Learners shall be able to participate in live classroom features such as chat, polls, notes, questions, hand-raise, and participant status. | Routes and UI exist; delivery semantics depend on the configured realtime/media stack and require runtime verification. |

### 3.6 Payments, subscriptions, coupons, and purchases

| ID | Requirement | Status |
|---|---|---|
| FRS-PAY-01 | The system shall support checkout and subscription/payment records through Stripe and Razorpay integrations. | Implemented in code; credentials, products, and webhook setup required. |
| FRS-PAY-02 | Payment webhook routes shall verify provider signatures before processing provider events. | Implemented for Stripe and Razorpay routes. |
| FRS-PAY-03 | The system shall record subscription and payment state and use entitlement checks for restricted tests/content. | Implemented in code. |
| FRS-PAY-04 | The system shall support coupon/discount records and coupon preview/redemption flows. | Implemented in admin/API/schema; exact restrictions depend on validation/business logic. |
| FRS-PAY-05 | The system shall ensure every webhook event is idempotent, including retries and out-of-order events. | Partial / verify. Some flows check for existing provider records; repository-wide idempotency is not established. |

### 3.7 Administration, content operations, and analytics

| ID | Requirement | Status |
|---|---|---|
| FRS-ADM-01 | Authorized staff shall manage users, courses, tracks, assessments, exercises, tutorials, batches, books, PYQs, and homepage cards through administrative surfaces. | Implemented in code; role checks differ by operation. |
| FRS-ADM-02 | The system shall expose platform and course analytics surfaces. | Implemented in routes/pages/schema; metric definitions and freshness need runtime verification. |
| FRS-ADM-03 | The system shall provide audit-related pages and logging for protected content operations. | Partial / verify; audit route/actions exist, but immutability/completeness is not established. |
| FRS-ADM-04 | Staff shall upload supported content/media through application or presigned upload flows. | Implemented; S3 credentials, size/type limits, and bucket policy apply. |

## 4. Business rules and product constraints

1. **Roles are server-enforced.** Hiding a control in the UI is not authorization. APIs and server actions must check identity and role before mutations.
2. **Premium access is entitlement-based.** Subscription status and test access rules determine restricted exam access; a displayed premium badge alone is not a grant.
3. **Exam time is server-based.** Attempt deadlines derive from persisted attempt start time and configured test duration. Sync verifies attempt ownership and uses sequence values to reject stale writes.
4. **Content lifecycle includes draft/published/archive states.** Courses, lessons, and lesson versions have status/version fields. Import paths must follow project rules to match by external IDs and avoid deleting content.
5. **Mobile is the primary experience.** The product must work across phone, tablet, and desktop widths; preserve the existing native mobile shell flag behavior. UI acceptance rules are in [`AGENTS.md`](../AGENTS.md) and [`responsive-ui-standards.md`](./responsive-ui-standards.md).

## 5. Key user journeys

### Learner course journey

Register/sign in → browse course → view course details → enroll or purchase where required → open course/chapter/lesson → consume lesson → save progress → continue from learning/library surfaces.

### Learner test journey

Sign in → browse test series → enroll or satisfy entitlement → select language → start or resume attempt → answer/mark questions → sync answers → submit or reach server deadline → view result and any configured analysis.

### Staff content journey

Sign in with teacher/admin role → open authorized studio → create or import content → edit curriculum/questions → set publication state → learner-facing content is available according to access and publication rules.

### Subscription journey

Select plan/product → start checkout with configured provider → provider sends signed webhook → application updates payment/subscription records → entitlement checks expose paid content.

## 6. Out of scope / not promised by this FRS

- A guarantee of production readiness, a stated service-level objective, or verified deployment capacity.
- Fully offline exams, zero-loss synchronization, or cross-device recovery without client/runtime evidence.
- Hidden test execution, anti-cheat enforcement, AIR/percentile accuracy, or full classroom media quality without operational verification.
- Any capability described only in older design/roadmap documents without corresponding current implementation evidence.

## 7. Traceability and source map

| Functional area | Main evidence |
|---|---|
| Routes and pages | `app/**/page.tsx`, `app/api/**/route.ts` |
| Authentication and role routing | `auth.ts`, `auth.config.ts`, `middleware.ts`, `lib/auth/**` |
| Course/content administration | `lib/actions/admin/**`, `app/admin/**`, `app/api/admin/courses/**` |
| Exams | `app/(exam)/test-series/**`, `app/api/exam/**`, `lib/exam/**` |
| Assessments/exercises | `app/(dashboard)/assessments/**`, `app/api/assessments/**`, `lib/actions/admin/assessments.ts` |
| Persistence | `prisma/schema.prisma` |
| Commerce | `app/api/checkout/**`, `app/api/webhooks/**`, `lib/payments/**`, `lib/actions/payment/**` |
| Project UI and safety rules | `AGENTS.md`, `docs/responsive-ui-standards.md` |

