# TrillionSkill Product Requirements Document

**Status:** Product baseline and proposed pilot direction; final segment selection is open · **Prepared:** 2026-10-06 · **Product:** TrillionSkill (package name `aspirantbook`) · **Users:** Learners, teachers/content authors, administrators, and guests

## 1. Product summary

TrillionSkill is a mobile-first learning and exam-preparation product. The current repository supports a wide set of surfaces: course discovery and study, tracks, assessments, timed exam series, PYQs, books, tutorials, technical exercises, payment/subscription flows, teacher/admin content tools, and live/demo learning.

This PRD separates the **current product footprint** from a **proposed first pilot**. A segment has not yet been approved. The recommendation is to validate one exam/course cohort first; BPSC/state-PSC is a candidate hypothesis because related content and workflows are present, not because market fit has been proven.

## 2. Product problem and opportunity

### Learner problem hypothesis

Learners may have to use separate services to learn concepts, access study resources, take realistic timed practice, identify weak areas, and get instructional help. TrillionSkill may make that flow more coherent on mobile and support bilingual exam practice where content is available.

### Product opportunity

The platform already has code for learning and assessment flows. The product opportunity is to make one chosen learner journey reliable, trustworthy and valuable enough for repeated use and potential payment. The product must compete with free public resources and established providers. This remains to be validated with research and pilot evidence.

## 3. Product goals and non-goals

### Goals

1. Make it easy for a selected learner to discover and begin the relevant course/test.
2. Provide a coherent study → practice → feedback journey.
3. Preserve exam attempt state using server-backed attempt ownership, deadlines, and answer synchronization.
4. Let authorized staff maintain accurate, rights-cleared content and tests.
5. Support a transparent purchase/access experience where paid products are part of the pilot.
6. Work on mobile first, with the same essential data and features on larger screens.
7. Measure activation, learning engagement/outcomes, paid intent, support load and unit economics.

### Non-goals for the first pilot

- Launching every learner segment, exam, grade, subject and product category at once.
- Promising selection, rank, placement, salary or a guaranteed learning outcome.
- Building a personalized AI tutor, national marketplace, or broad institution B2B suite unless separately prioritized and evidenced.
- Claiming offline-first exams, hidden-test code grading, verified high-scale capacity, or an operational SLA until those behaviors are proven.

## 4. Users and needs

| Persona | Need | Product implication | Evidence status |
|---|---|---|---|
| Exam-preparation learner | Find relevant syllabus material, practise at exam conditions, and understand what to improve. | Clear course/test discovery, timed attempt, answer/result feedback and reliable mobile UI. | Hypothesis; validate with chosen cohort. |
| School learner / family buyer | Use age-appropriate structured study and visible progress with safe support. | Grade/subject mapping, guardian-aware purchase/support and child-data safeguards. | Segment unselected; legal and buyer research needed. |
| Technical skill learner | Learn a skill, practise code, and receive correct execution/evaluation feedback. | Reliable editor/runner, real test-case execution and clear evaluation. | Code features exist; execution gaps need verification. |
| Teacher/content author | Create, review, organize, publish and correct materials/tests. | Staff workflows, preview, role control, draft/publish/version path. | Current tools exist; workflow consistency varies. |
| Administrator | Manage users, content, access, payments and operational visibility. | Auditable administration, least privilege, useful analytics and safe bulk operations. | Admin routes and models exist; audit completeness is not established. |

## 5. Product principles

- Mobile-first; preserve the existing responsive shell flag behavior.
- One source of course, assessment and learner data across responsive layouts.
- Server-side authorization for data and actions; UI visibility is not access control.
- Server-based timing and ownership checks for test attempts.
- Content and result claims must be accurate, attributable and rights-cleared.
- Design for translated/Hindi text growth, accessible keyboard use, reduced motion, dark mode and zoom.
- Use measured data for ratings, outcomes and claims; do not show fabricated social proof.
- Treat successful build status as insufficient; verify critical flows with representative learner, teacher and admin accounts.

## 6. Product scope and priority

Priority definitions: **P0** required for a focused paid/learning pilot; **P1** valuable if validated and within pilot capacity; **P2** defer until evidence supports it. “Existing” means implementation evidence is present, not that the feature is launch-ready.

| Capability | Priority | Current evidence | Product decision / gap |
|---|---|---|---|
| Authentication, learner profile and role separation | P0 | Auth, role fields and middleware routes exist. | Verify the selected user journey and every server mutation’s authorization. |
| Focused catalog/course detail and enrollment | P0 | Course pages, enrollment actions/API, course models exist. | Select only the cohort’s relevant catalog and prove data/content quality. |
| Course lesson experience and progress | P0 | Lesson types, progress model and learner pages exist. | Define completion semantics, state recovery and accessibility acceptance. |
| Timed test/assessment, sync, submit and results | P0 for exam-prep pilot | Exam and assessment routes, attempts, sync and grading code exist. | Run full student journey; confirm deadline edge cases, scoring and recovery. |
| Content authoring/publishing and corrections | P0 | Admin/teacher tools and draft/publish/version data exist. | Define accountable review, rights and rollback workflow. |
| Payment and access entitlement | P0 only if pilot is paid | Stripe/Razorpay code, checkout and webhook routes exist. | Configure provider, prove reconciliation, terms, refund and support path. |
| PYQ and paper/PDF access | P1 or P0 when central to selected exam | PYQ pages/APIs/models exist. | Verify rights, source accuracy, unlock rules and mobile PDF behavior. |
| Live classroom/demo | P1 | Pages/routes and Agora/WebRTC modules exist. | Depends on media configuration, moderation and support; pilot only if user evidence needs it. |
| Books/orders | P1/P2 | Pages/APIs and models exist. | Define fulfillment, inventory, returns and unit economics first. |
| Coding practice | P1 for technical cohort; otherwise P2 | Exercise UI and Piston-compatible endpoint exist. | Current endpoint does not establish independent execution of each test case; fix/verify before coding pilot. |
| Projects, current affairs, doubts, tutorials, search, leaderboard | P1/P2 by selected outcome | Surfaces exist with varying completeness. | Include only when they support validated pilot need and have reliable data. |

## 7. Proposed pilot product

### Hypothesis to validate

For one competitive exam cohort, a learner can discover an appropriate course/test product, study structured content, take a realistic timed test, receive a useful result, and return to continue preparation on a phone.

### Candidate vertical slice

1. Public course/test description with accurate syllabus, inclusions, instructor/content attribution and terms.
2. Sign-in, learner access check, and enrollment or paid checkout.
3. One approved set of course lessons and bilingual questions where validated content exists.
4. Timed test attempt with server-based deadline, answer sync/resume, submit and result.
5. Clear learner progress/next step and support contact.
6. Staff create/review/publish/correct content using role-controlled tooling.
7. Analytics events for funnel, activation, completion, payment, support and product issues.

The candidate exam/segment, exact content, language, price and pilot size are TBD. Do not treat BPSC as selected without sponsor approval.

## 8. User journeys

### Learner study and practice

Open catalog → choose relevant course/test → review scope and terms → sign in → enroll/access → study lesson → start timed assessment → answer and sync → submit → review result and next recommended action → return to learning.

### Teacher publishing

Sign in with staff role → create/edit course/test content → attach source/rights metadata → preview in learner context → request/complete editorial review → publish → monitor corrections and learner feedback.

### Purchase

Review item, price, access duration, renewal/refund terms → choose provider → complete checkout → server verifies signed event/payment → access becomes available → learner can locate receipt/support/refund route.

## 9. Product requirements and acceptance criteria

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PR-01 | The product shall make the approved pilot offer and intended learner outcome clear before enrollment or checkout. | Learner can identify target cohort, included items, access duration, total payable amount, exclusions and support/refund terms before confirming. |
| PR-02 | The product shall allow an eligible learner to progress from catalog discovery into the selected learning journey. | A representative learner completes browse → details → access/enrollment → first lesson/test without dead ends; access is checked server-side. |
| PR-03 | The product shall preserve and show course progress consistently across supported devices. | Progress is stored against the authenticated learner, reloads after navigation, and no responsive variant hides the same core information. |
| PR-04 | The exam product shall save answers and enforce server-based timing/ownership. | Own attempt sync and resume are verified; another learner cannot read or mutate the attempt; expiry and stale sequence cases have explicit outcomes. |
| PR-05 | Results shall be understandable and based on the configured scoring rules. | Known answer fixtures yield expected score/counts; result explains correct/wrong/unattempted handling and does not imply rank unless rank calculation is validated. |
| PR-06 | Paid access shall reflect provider-verified state and allow a learner to recover from a delayed callback. | Valid webhook/verification grants the expected entitlement once; duplicate callback does not duplicate payment; support/reconciliation path exists. |
| PR-07 | Content operations shall protect learners from unpublished or materially incorrect content. | Draft content is not public to unauthorized users; published changes have an owner/revision; staff can correct or withdraw according to policy. |
| PR-08 | Product UI shall meet the mobile-first responsive and accessibility standards. | Touched pilot pages are checked at required viewport widths/light/dark themes; no horizontal page scroll; keyboard focus and labels work; loading/empty/error/offline states are explicit. |
| PR-09 | The product shall measure the pilot funnel and selected learning outcome. | Event definitions, data owner, privacy purpose and baseline are approved before collection; dashboards can distinguish eligible, activated, completing and paying learners. |
| PR-10 | Marketing and in-product claims shall reflect substantiated evidence. | Claims are reviewed and evidence-linked; no guaranteed selection/placement claim or misleading scarcity/social proof. |

Numeric performance, conversion, retention, learning gain and revenue thresholds are TBD and must be set before pilot launch.

## 10. Success metrics

| Metric | Definition | Target |
|---|---|---|
| Discovery-to-access conversion | Eligible users who enroll or purchase ÷ eligible product detail visitors | TBD |
| Activation | New eligible learners who complete first defined lesson/test action within agreed window ÷ new eligible learners | TBD |
| Learning loop completion | Learners who complete study + assessment + result review in pilot window ÷ activated learners | TBD |
| Repeat learning | Activated learners with meaningful learning activity in a later week ÷ activated learners | TBD |
| Assessment reliability | Attempts with saved state and correct finalization ÷ started attempts, excluding documented user cancellations | TBD after instrumentation and baseline |
| Payment integrity | Reconciled paid orders with correct entitlement and ledger state ÷ paid orders | Target set with Finance before paid pilot |
| Content quality | Material content/test corrections per published content unit; learner-reported issue resolution time | TBD |
| Contribution/CAC/payback | Finance-defined observed cohort calculations | Hurdle TBD before acquisition spend |
| Mobile task success/accessibility | Task completion and audit results against project UI standard | Baseline and thresholds TBD |

## 11. Dependencies, risks and open questions

- Sponsor must choose the initial segment, outcome, budget cap and pilot decision thresholds.
- Finance must supply cost, pricing, provider fees, tax and refund assumptions.
- Content owner must confirm syllabus mapping, reviewer capacity, language coverage and usage rights.
- Legal counsel must assess privacy/minors, marketing, content, consumer/payment and tax obligations.
- Engineering must document environment separation, backup/restore, monitoring, CI/CD and data safety before production expansion.
- User research must confirm the problem and differentiation against public/free and paid alternatives.
- Technical gaps in [FRS](./FRS.md) and [SRS](./SRS.md) must be considered before committing these areas to a pilot.

## 12. Release decision

Proceed to a pilot only after the BRD sponsor outcomes are approved, FRD P0 criteria pass in a configured environment, legal and content-rights gates are satisfied, and cost/price thresholds are agreed. Hold or reduce scope when any launch-critical requirement is unverified.

## 13. Related documents

- [BRD](./BRD.md)
- [FRD](./FRD.md)
- [FRS](./FRS.md) and [SRS](./SRS.md)
- [Phase 0 Business Case](./PHASE_0_BUSINESS_CASE.md) and [Phase 0 Market Research](./PHASE_0_MARKET_RESEARCH.md)
