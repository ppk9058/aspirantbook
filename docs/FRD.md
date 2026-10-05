# TrillionSkill Functional Requirements Document

**Status:** Baseline functional specification; implementation verification is required before launch · **Prepared:** 2026-10-06 · **Product:** TrillionSkill (package name `aspirantbook`) · **Basis:** Current route inventory, auth/middleware, server actions, Prisma schema, project rules, and existing FRS/SRS

## 1. Purpose and relationship to existing documents

This Functional Requirements Document (FRD) defines system-facing behaviors and acceptance criteria for TrillionSkill. It is intended for product, design, engineering, QA and content operations to plan and verify a chosen product release.

The repository already includes an [FRS](./FRS.md). That file is an as-built inventory of functional areas and their evidence status. This FRD adds more testable workflow and acceptance detail; it does not silently assert that every requirement has passed QA. The [PRD](./PRD.md) states product priorities, while the [SRS](./SRS.md) defines technical interfaces and quality constraints.

### Status key

| Status | Meaning |
|---|---|
| Present in code | A corresponding page, handler, action, model or service exists. End-to-end correctness still requires verification. |
| Partial / verify | Some behavior exists, but one or more acceptance conditions, configurations or edge cases are not proven. |
| Gap / TBD | Behavior is not established in the repository or needs product decision. |

### Priority key

`P0` = required for a selected pilot; `P1` = include if validated and capacity allows; `P2` = defer unless the selected product depends on it. Priority does not imply implemented status.

## 2. Actors and permissions

| Actor | Allowed behavior (subject to server checks) |
|---|---|
| Guest | View public landing/acquisition pages and public course/batch detail where configured; register or sign in. |
| Learner (`FREE`, `PREMIUM`) | View permitted catalog/content, enroll/access, record own progress, take permitted tests/assessments, and view own results/purchases. Premium access requires server entitlement. |
| Teacher (`TEACHER`) | Manage explicitly permitted content, questions, tests/classes, and teacher surfaces; cannot access administrator-only operations unless separately authorized. |
| Administrator (`ADMIN`) | Perform administrative user, content, commerce, settings, analytics and operational actions according to policy. |
| External payment provider | Send signed payment/subscription callbacks; may not directly establish application entitlement without verified server processing. |

The schema roles are `FREE`, `PREMIUM`, `TEACHER`, and `ADMIN`. Middleware protects page routes, but every API and server action must also enforce identity, role, resource ownership, and entitlement. A demo-role cookie is not sufficient authorization for learner data or privileged mutations.

## 3. Functional requirements

### 3.1 Identity, session, and authorization

| ID | Requirement | Priority / status | Acceptance criteria |
|---|---|---|---|
| FRD-ID-01 | The system shall let a user register and sign in through configured authentication methods. | P0 / Present in code | Valid credentials/provider callback creates a session; invalid credentials do not; sign-out invalidates access; unavailable provider configuration produces a handled error. |
| FRD-ID-02 | The session shall expose a stable user ID, role, and relevant subscription state to server-side authorization. | P0 / Present in code | Authenticated request resolves correct identity; expired/absent session is treated as unauthenticated; role updates are reflected according to the session refresh policy. |
| FRD-ID-03 | Protected learner routes and APIs shall require a signed-in learner. | P0 / Partial, verify every API | Guest page access redirects safely or returns 401/403 for APIs; no private learner data is returned before authorization. |
| FRD-ID-04 | Teacher and admin operations shall enforce the server-side role matrix. | P0 / Partial, route checks exist | Student cannot create/edit/publish staff content by direct HTTP request; teacher cannot access admin-only users/audit/settings operations unless policy grants access. |
| FRD-ID-05 | A user may read or mutate only their own private progress, attempt, profile and purchase data unless an explicit staff policy permits otherwise. | P0 / Verify route by route | A second user cannot retrieve or alter the record by substituting an ID; authorized staff access is auditable where required. |
| FRD-ID-06 | Post-authentication redirects shall accept safe local paths only. | P0 / Present in code | External/invalid return paths fall back to a safe in-app page; valid local path is preserved. |

### 3.2 Catalog, enrollment, and learning

| ID | Requirement | Priority / status | Acceptance criteria |
|---|---|---|---|
| FRD-LRN-01 | A visitor shall be able to discover published courses and view public details. | P0 / Present in code | Published course appears; draft/archived course is hidden from unauthorized users; details identify price/access requirements accurately. |
| FRD-LRN-02 | An eligible learner shall be able to enroll in a course once. | P0 / Present in code | Duplicate request does not create a second enrollment; resulting enrollment is associated with the signed-in user and correct course. |
| FRD-LRN-03 | A learner shall be able to open the course hierarchy of chapters and lessons according to access rules. | P0 / Present in code | Published/unlocked lessons are accessible to authorized users; locked/private attachments and video URLs are not exposed to an ineligible user. |
| FRD-LRN-04 | A learner shall be able to record and later retrieve lesson progress. | P0 / Present in code; completion semantics verify | Progress is keyed by learner and lesson; repeat update is idempotent; another learner cannot see it. |
| FRD-LRN-05 | Courses shall support career/skill tracks, chapter/lesson ordering and supported lesson types. | P1 / Present in schema and UI | Ordering is deterministic; lesson type routes to a compatible renderer; unsupported/malformed content receives a useful fallback rather than blank screen. |
| FRD-LRN-06 | A learner shall be able to continue learning from their enrolled/active learning view. | P0 / Present in pages | The current course and next/resume action reflect persisted enrollment and progress; empty and error states are explicit. |
| FRD-LRN-07 | Authorized content staff shall create/edit and publish or archive courses and tracks. | P0 / Present in admin operations; verify policies | Unauthorized mutation is rejected; draft is not public; publish/archive is persisted; existing enrollments/progress are not deleted by content archival. |
| FRD-LRN-08 | Staff shall retain lesson draft/published versions where version workflow is used. | P1 / Present in schema; lifecycle verify | Publishing references the intended version; draft edits do not silently replace the learner-visible version; restore/correction action is attributable. |

### 3.3 Exam series and timed test attempts

| ID | Requirement | Priority / status | Acceptance criteria |
|---|---|---|---|
| FRD-EXM-01 | A learner shall browse test series/tests and see availability, language, duration and access requirements. | P0 / Present in code | List and detail values agree with persisted test data; unavailable/unpublished test is not presented as startable. |
| FRD-EXM-02 | Starting an attempt shall validate authentication, test existence/publication, duration, question availability, language and entitlement. | P0 / Present in `/api/exam/attempt/start` | Invalid inputs receive an appropriate client error; unpaid/ineligible user receives 403; non-published test is available only to authorized creator/admin. |
| FRD-EXM-03 | The system shall create a new attempt or resume the learner’s active attempt for the same test according to retake rules. | P0 / Present in code | Only the correct user/test attempt is resumed; repeated start does not create unintended concurrent active attempts; deadline is server-derived. |
| FRD-EXM-04 | A learner shall sync selected answers, review flags and elapsed time to their own open attempt. | P0 / Present in sync route | Valid answer sync persists; foreign attempt returns 403; missing attempt returns 404; submitted attempt rejects further writes; stale client sequence is rejected without overwriting newer answer. |
| FRD-EXM-05 | The system shall preserve configured attempt timing and finalize an expired attempt according to server time. | P0 / Present in code; edge cases verify | Client clock changes do not extend deadline; late sync follows documented grace/finalization behavior; result state is consistent after retry. |
| FRD-EXM-06 | A learner shall submit an attempt once and retrieve the resulting score and answer summary. | P0 / Present in code | Finalization is idempotent; repeated submit returns the finalized state; result matches configured correct answers, positive/negative marks and unanswered treatment. |
| FRD-EXM-07 | Test content shall support English/Hindi fields where supplied and configured sections/question types. | P1 / Present in schema | Language toggle shows correct equivalent text/options; missing translation does not corrupt attempt state; scoring is language-independent. |
| FRD-EXM-08 | Teacher/admin shall create and maintain series, tests, sections, questions and answer keys. | P0 / Present in staff routes; permissions verify | Role-gated creation; required fields/marking rules validate; unpublished content remains private; edits cannot silently alter a submitted result’s historical inputs without policy. |
| FRD-EXM-09 | The client shall provide offline-first attempt persistence and recover after prolonged disconnection. | P1 / Gap/TBD | Product must specify local store, sync conflict rules, device recovery and data expiry; current server API alone is insufficient evidence. |
| FRD-EXM-10 | Percentile, all-India rank, anti-cheat and mistake-notebook features shall be shown only when their calculations and data are verified. | P1 / Partial | Test with known population/fixtures; identify missing sample size; do not display misleading rank/percentile or claim effective proctoring without evidence. |

### 3.4 Assessments and coding exercises

| ID | Requirement | Priority / status | Acceptance criteria |
|---|---|---|---|
| FRD-AS-01 | A learner shall open an assessment and start an attempt when authorized. | P0/P1 / Present in code | Assessment and eligibility are checked server-side; repeated start follows attempt policy; attempt belongs to learner. |
| FRD-AS-02 | Assessment submission shall validate answers and persist score/result. | P0/P1 / Present in API; verify question-type coverage | Correct/incorrect/blank handling matches configured key; malformed answer rejected; learner sees own result only. |
| FRD-AS-03 | The assessment UI shall handle all question types enabled for a published assessment. | P1 / Partial | Every enabled type can be answered, saved and graded; staff cannot publish a type unsupported by learner renderer. |
| FRD-CODE-01 | An authenticated learner shall submit code and language to the configured execution service. | P1 / Present in `/api/execute` | Anonymous request is rejected; missing code/language is rejected; code above 10 KB is rejected; service error is handled without leaking secrets. |
| FRD-CODE-02 | Execution shall respect configured execution and compile timeouts. | P1 / Present in route | Timeout is surfaced as a bounded failure; request cannot run indefinitely. |
| FRD-CODE-03 | Each test case shall execute independently, including hidden cases that remain secret. | P1 / Gap | Current route comments indicate provided test cases are compared to a single output rather than executed once per input; implement and test before claiming automated grading. |
| FRD-CODE-04 | A learner’s code submission history shall be tied to their account and exercise. | P1 / Schema present; flow verify | Persisted submission identifies user/exercise, result and runtime; unauthorized user cannot view another learner’s source. |

### 3.5 PYQ, books, tutorials, and learner utilities

| ID | Requirement | Priority / status | Acceptance criteria |
|---|---|---|---|
| FRD-AUX-01 | A learner shall browse available PYQ categories, exams and papers. | P1 / Present in code | Published/access-eligible paper appears; restricted file is not disclosed before unlock; source and rights are recorded operationally. |
| FRD-AUX-02 | Staff shall manage PYQ categories, sub-exams, papers, uploads and lead capture. | P1 / Present in admin/API | Role and input validation enforced; duplicate/import behavior defined; archival does not destroy user purchase/history records. |
| FRD-AUX-03 | A learner shall browse available books and view order state. | P1 / Present in code | Price, stock/availability, shipping and order status are consistent; out-of-stock or fulfillment failure is explicit. |
| FRD-AUX-04 | Staff shall import tutorial packages with external-ID matching and draft-first behavior. | P1 / Present in import path; verify all paths | Dry run reports create/update decisions; same external ID updates intended item; title collision alone never merges; existing curriculum is not destructively replaced. |
| FRD-AUX-05 | Learner utility surfaces (doubts, forms, projects, code-along, current affairs, search and leaderboard) shall expose only a complete, supported interaction. | P2 / Completeness varies | Each launched surface defines data source, permissions, empty/loading/error behavior and support owner; placeholders are not marketed as functioning capabilities. |

### 3.6 Live/demo classroom

| ID | Requirement | Priority / status | Acceptance criteria |
|---|---|---|---|
| FRD-RTC-01 | Authorized participants shall join the intended class/demo using a server-authorized session/token. | P1 / Present; provider configuration required | Invalid role/session receives no media token; token is scoped to correct channel/identity and expiry. |
| FRD-RTC-02 | Participants and teachers shall use supported classroom interactions such as chat, questions, polls, notes and hand-raise. | P1 / Routes/UI exist; runtime verify | Only authorized participants post; teacher moderation works; connectivity and unavailable-media states are clear. |
| FRD-RTC-03 | The service shall communicate recording, participation and data-use terms before classroom use where applicable. | P1 / Gap/TBD | Notices, consent/retention and age safeguards approved by policy/legal owner before enabling recording or learner media. |

### 3.7 Checkout, payment, coupon, and entitlement

| ID | Requirement | Priority / status | Acceptance criteria |
|---|---|---|---|
| FRD-PAY-01 | A learner shall see the final offer price and terms before checkout. | P0 when paid / Partial | Server-calculated item, currency, discount, taxes/fees if applicable, renewal period and refund/cancellation terms match confirmation. |
| FRD-PAY-02 | The server shall create an order/checkout using authoritative product pricing. | P0 when paid / Present | Client-supplied amount cannot override server price; currency and user/product association are correct. |
| FRD-PAY-03 | Provider callbacks shall be signature-verified before changing payment or subscription state. | P0 when paid / Present for Stripe/Razorpay | Invalid signature causes no mutation; valid event is tied to expected order/user/provider. |
| FRD-PAY-04 | Duplicate provider callbacks shall not create duplicate payment or entitlement effects. | P0 when paid / Partial, verify all events | Replaying same event leaves one financial record and one entitlement outcome; concurrent retries behave consistently. |
| FRD-PAY-05 | The learner shall receive the purchased entitlement only after trusted server confirmation. | P0 when paid / Present, verify end-to-end | Client redirect alone cannot grant access; provider confirmation/reconciliation yields correct entitlement. |
| FRD-PAY-06 | Coupon preview and redemption shall enforce expiry, eligibility, use caps, concurrency, and currency/precision rules. | P1 or P0 if promoted | Invalid/expired/ineligible coupon is rejected; parallel redemption cannot exceed configured cap; ledger stores amounts consistently. |
| FRD-PAY-07 | The learner shall see payment/order/subscription state and a support route for failure/refund. | P0 when paid / Partial | Pending, success, failure, cancelled, refunded and delayed-webhook states are not ambiguous; support can reconcile transaction ID. |

### 3.8 Staff administration and content governance

| ID | Requirement | Priority / status | Acceptance criteria |
|---|---|---|---|
| FRD-ADM-01 | Admin/teacher roles shall be restricted to explicitly permitted operations. | P0 / Present in middleware; action-level audit needed | Direct route/API calls enforce same permission; sensitive admin-only functions reject teachers/students. |
| FRD-ADM-02 | Staff shall create/edit courses, tracks, chapters, lessons, tests, assessments, exercises and related content. | P0/P1 / Present in code | Required fields validate; ordering and relationships persist; invalid records cannot be published. |
| FRD-ADM-03 | Staff shall preview learner-visible content before publishing. | P1 / Verify | Preview uses same renderer and entitlement rules; publishing state is explicit; no duplicated mobile-only data source. |
| FRD-ADM-04 | The system shall record appropriate attribution for high-impact operations. | P1 / Partial | User, timestamp, action and target are recorded for role, financial, publishing and destructive-risk operations; audit retention/access defined. |
| FRD-ADM-05 | File uploads shall validate file type/size and protect private media. | P0/P1 / Helper exists; route access verify | Invalid file rejected; upload ownership and bucket policy enforced; private objects require authorized/signed access; deletion is auditable. |
| FRD-ADM-06 | Analytics pages shall identify metric definitions and data freshness. | P2 / Present in routes/schema; definitions verify | Values can be traced to source and period; missing/stale data shown explicitly rather than as fabricated values. |

## 4. Cross-cutting business rules

1. **Authorization:** Check session, role, ownership and entitlement on the server for every protected read/write.
2. **Non-destructive content:** Preserve user data, lessons, courses, progress and internal IDs. Archive rather than delete unless a separately authorized data-retention process applies.
3. **Import safety:** Match imported data using external identifiers, create drafts by default, and do not use title alone as an identity key.
4. **Exam integrity:** Use persisted server start/deadline; sync only to the owner’s writable attempt; reject stale writes; calculate scores from server-held keys/configuration.
5. **Commerce integrity:** Derive amounts on the server; verify signatures; reconcile duplicate/retried events; persist state before granting access.
6. **Content trust:** Cite/protect licensed sources, review question correctness and translations, and maintain a correction path.
7. **Learner claims:** Do not promise outcomes or present unverified rankings, ratings or social proof as facts.
8. **Data separation:** Do not use production learner/payment data for development/testing without approved safeguards; do not persist runtime state to local disk.

## 5. Common error and state requirements

Every P0 flow shall have explicit:

- Loading/progress state and duplicate-submit handling.
- Empty state with a safe next step.
- Validation state that identifies the correction without exposing internals.
- Permission/not-found state that does not leak private resource existence unnecessarily.
- Network/provider/database failure state with retry/recovery or support path.
- Offline/degraded state where the feature depends on connectivity.
- Success confirmation tied to server-confirmed state for enrollment, attempt submission and payment.

## 6. Traceability matrix

| Requirement area | PRD | BRD | Main implementation evidence |
|---|---|---|---|
| Identity and roles | PR-02, PR-08 | BRQ-07, BRQ-08 | `auth.ts`, `auth.config.ts`, `middleware.ts`, `lib/auth/**` |
| Courses and learning | PR-02, PR-03 | BRQ-02, BRQ-04 | `app/(dashboard)/courses/**`, `app/(dashboard)/learn/**`, `lib/actions/course/**`, `Enrollment`, `Progress` models |
| Exam attempts | PR-03, PR-09 | BRQ-02, BRQ-06 | `app/(exam)/test-series/**`, `app/api/exam/**`, `lib/exam/**`, `ExamAttempt*` models |
| Assessments and coding | PR-03 | BRQ-02 | `app/(dashboard)/assessments/**`, `app/api/assessments/**`, `app/api/execute/route.ts`, `lib/execution/**` |
| Content authoring | PR-07 | BRQ-04, BRQ-09 | `app/admin/**`, `lib/actions/admin/**`, `app/api/admin/**`, `LessonVersion` |
| PYQ/books/live tools | PR-05 and scope table | BRQ-02, BRQ-04 | `app/(dashboard)/pyqs/**`, `app/(dashboard)/books/**`, `app/api/classroom/**`, `app/api/courses/demo/**` |
| Payments/access | PR-05 | BRQ-03, BRQ-06, BRQ-08 | `app/api/checkout/**`, `app/api/webhooks/**`, `lib/payments/**`, `lib/auth/entitlements/**` |
| Mobile/accessibility | PR-08 | BRQ-10 | `AGENTS.md`, `docs/responsive-ui-standards.md`, `lib/config/mobile-shell.ts` |

## 7. Acceptance and verification approach

For each selected release requirement:

1. Link its test case, route/action, relevant schema and owner.
2. Exercise positive, invalid-input, unauthorized, boundary, duplicate/retry, and failure paths as applicable.
3. Verify with separate student, teacher and admin accounts where roles matter.
4. Verify the project’s required mobile widths, color modes, focus behavior, loading/empty/error/offline state and shell behavior for touched screens.
5. Confirm source data, calculations, provider behavior and content-rights evidence; do not infer from UI presence.
6. Record pass/fail, environment, test data class, evidence link, defect, owner and retest result.

Feature requirements in this document are not considered accepted solely because a production build succeeds.

## 8. Open product decisions

- Which segment/exam is the pilot target, and what precise outcome is being promised?
- Which course, test, PYQ and language content are rights-cleared and editorially ready?
- Are offline exam attempts required, or is server-backed online resume sufficient?
- Is coding practice in scope for the pilot, and what isolation/hidden-test behavior is required?
- Which teacher/admin roles and approval permissions are authoritative?
- What are the payment plans, access periods, taxes, refunds, cancellations and support commitments?
- What data retention, child-user safeguards, classroom recording and data-subject workflows are required?
- Which numeric product, performance, reliability and business thresholds are launch gates?

## 9. Related documents

- [BRD](./BRD.md) — business needs and outcomes.
- [PRD](./PRD.md) — product scope, priorities and user acceptance.
- [FRS](./FRS.md) — code-derived functional inventory.
- [SRS](./SRS.md) — technical architecture, interfaces and quality constraints.
