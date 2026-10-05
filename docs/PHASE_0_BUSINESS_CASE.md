# Phase 0 — Business Case

**Acronym:** BC
**Document status:** Decision draft; commercial and company inputs remain TBD · **Prepared:** 2026-10-05 · **Product:** TrillionSkill (repository package name: `aspirantbook`) · **Decision requested:** Approve a time-boxed validation phase before committing to a scaled launch budget.

## 1. Executive summary

TrillionSkill is a web learning platform whose current code supports courses and tracks, competitive test series, assessments, PYQs, books, subscriptions and payments, learner progress, teacher/admin content tools, and live/demo learning flows. The repository indicates a product spanning several markets: government exam preparation, school learning, and technical skills. That breadth is a product opportunity and a focus risk.

**Recommendation: conditional go for customer and commercial validation; no go decision yet for a large-scale launch or fixed investment.** Select one beachhead cohort, verify unmet need and willingness to pay, confirm content rights and operating costs, and run a limited paid pilot only after the gates below are met. A BPSC/state-PSC wedge is a hypothesis suggested by the existing BPSC/UPSC content and PYQ/test-series features, not a validated market choice.

No user research, sales data, cost history, team capacity, company budget, incorporation details, or production-environment evidence was found in the repository scan. This case therefore provides a decision framework and marks those inputs as **TBD** rather than presenting invented ROI or budget figures.

## 2. Business problem and opportunity hypothesis

### Problem hypothesis

Learners preparing for competitive examinations and skill-based careers need structured content, realistic practice, feedback, and access to instructors. A mobile-first platform that brings learning content, bilingual practice, test analytics, and paid learning products into one account may reduce fragmentation and improve study continuity.

This is a hypothesis to test. The repository demonstrates product features, not that learners have this problem at sufficient intensity or will pay for this solution.

### Opportunity evidence

- India had about **1.003 billion internet subscriptions at June 2025**, with most classified as wireless; subscriptions are not unique people or addressable learners. ([TRAI quarterly report](https://trai.gov.in/sites/default/files/2025-09/QPIR_03092025.pdf))
- The Ministry of Education reports that SATHEE, a free exam-preparation platform, passed **one million student enrolments** and has expanded exam coverage. This establishes meaningful institutional and learner activity, while also showing that free services are a substitute. ([Ministry of Education Annual Report 2024–25](https://www.education.gov.in/sites/upload_files/mhrd/files/document-reports/MoE_AR_En.pdf))
- A commercial market report estimates India’s broad online-education market at ₹462.97 billion in FY2023. Its category is much broader than TrillionSkill’s possible first segment; use only as directional context, not as TrillionSkill TAM or a revenue forecast. ([Netscribes report listing](https://www.researchandmarkets.com/reports/5671321/online-education-market-in-india-2024-2029))

## 3. Product and strategic fit

### Current product evidence

The repository contains learner pages and services for courses/lessons, career and skill tracks, assessments, test series and attempts, PYQs, books, profile/settings, and supporting learning tools. It also contains teacher/admin areas for course and assessment management, exercises, tutorials, tracks, users, books, PYQs, and analytics. Payment integrations include Stripe and Razorpay. These are code-level capabilities; deployment, content readiness, usage, and quality must be assessed separately.

### Proposed positioning to validate

> An accessible, mobile-first learning and exam-practice platform that combines structured courses, realistic bilingual assessment, and progress feedback for a clearly selected learner cohort.

Avoid positioning the product as “all learning for everyone” until research identifies which segment and offer have the strongest demand and viable economics.

### Candidate beachheads

| Segment hypothesis | Product fit | Key validation question |
|---|---|---|
| BPSC / Bihar state-PSC aspirants | PYQs, test series, bilingual content, courses, current-affairs and live/demo features are relevant. | Can TrillionSkill earn trust and paid conversion against local instructors, established apps, and free resources? |
| UPSC and other central government exam aspirants | Test series, courses, bilingual questions, progress and paid plans fit. | What exam-specific content or instructor access is differentiated enough to win? |
| School learners | Course catalog and class-level content may fit. | Which grade/subject is the first use case, and who pays: learner, parent, or institution? |
| Technical skill learners | Skill tracks, tutorials, coding practice and courses may fit. | Is code execution and project feedback robust and distinctive enough to compete with specialist platforms? |

The first pilot should select one primary segment and one measurable learning outcome. Do not divide a limited content/marketing budget across all four segments at launch.

## 4. Customer value and business model hypotheses

### Value to test

- One account for structured course content, practice, exam attempts, and progress.
- Mobile-first access, with English/Hindi exam data where supplied.
- Learner feedback from saved attempts and results.
- Teacher/admin workflows for maintaining course and test content.

These are product hypotheses. Validate perceived value, content accuracy, accessibility, and outcomes with learners and educators.

### Revenue streams present or suggested by code

| Revenue hypothesis | Repository signal | Evidence still needed |
|---|---|---|
| Paid course or cohort purchase | Course price fields, checkout, course demo booking. | Approved catalogue, actual list prices, refund policy, faculty/content cost, conversion and completion data. |
| Subscription/pass | Subscription and entitlement models; Stripe and Razorpay integrations. | Which plan is sold, renewal/churn, provider fees, refund and cancellation economics. |
| Paid test series / exam product | Test series, enrollments, access modes, payment support. | Exam-specific pricing, paid conversion, seasonality, question production and review costs. |
| Books or study materials | Book catalog/order routes and admin operations. | Inventory/print/fulfillment cost, shipping, returns, and gross margin. |
| Instructor-led live or demo cohort | Demo and classroom features. | Faculty capacity, attendance, scheduling, support load, and delivery cost. |

Do not assume revenue from a feature being present in code. Validate the actual checkout path, fulfillment, provider settlement, and support process before counting a stream in forecasts.

## 5. Investment and financial decision model

### Budget status

**Total investment: TBD.** The repository does not identify the legal entity, staff, salary bands, vendor contracts, hosting plan, marketing allocation, or existing sunk costs. Finance/product owners must supply these before approving spend.

Use this worksheet; enter current vendor quotes and fully loaded rates before any investment decision:

| Cost line | Estimation basis | Amount/status |
|---|---|---|
| Product, engineering, QA, DevOps | Role-days × approved loaded daily rate | TBD |
| Curriculum, question writing, answer review, translation | Content units × approved unit cost; include rights/licensing | TBD |
| Instructor and learner support | Scheduled delivery/support hours × approved rate | TBD |
| Cloud, database, storage, CDN, video, code execution, monitoring | Vendor quote at pilot and forecast usage | TBD |
| Payment processing, refunds, chargebacks, taxes | Provider rates and finance/legal assumptions | TBD |
| Customer research and incentives | Participant count × approved incentive + recruitment | TBD |
| Marketing and distribution | Channel test budgets, creative, referral/institution costs | TBD |
| Legal, privacy, accounting, insurance | Professional quote and required scope | TBD |
| Contingency | Finance-approved percentage of scoped cost | TBD |

### Unit-economics formulas

- **Net collected revenue** = gross receipts − discounts − refunds − indirect taxes collected − payment fees.
- **Contribution per paid learner** = net collected revenue − variable content delivery, support, media, and assessment costs.
- **Contribution margin** = contribution per paid learner ÷ net collected revenue.
- **CAC** = attributable acquisition spend ÷ new paying learners in the same cohort.
- **Break-even paid learners** = fixed pilot/period cost ÷ contribution per paid learner, provided contribution is positive.
- **Payback period** = CAC ÷ monthly contribution per paying learner.
- **LTV** should use observed retained cohorts and contribution, not gross subscription revenue or an assumed retention curve.

### Investment gates

Proceed from discovery to pilot only if:

1. One segment and exam/learning outcome have a named owner and evidence-backed demand.
2. A minimum paid offer, pricing test, and refund/consumer-support policy are approved.
3. Content provenance and rights are documented for the pilot catalogue.
4. Finance can populate a base/downside/upside model and the downside case remains within an approved loss cap.
5. Legal counsel signs off on launch-critical consumer, data, tax, content, and payment obligations.
6. Engineering demonstrates secure operations for payment, user data, access control, backups, monitoring, and test-vs-production separation.

Set numeric conversion, retention, CAC, and loss-cap thresholds with the business owner before recruitment. They are intentionally TBD here.

## 6. Scope and success measures

### Phase 0 scope

Validate customer need, segment, competitive position, pricing/revenue hypothesis, content rights, legal boundary, operating cost, and product/technical readiness for a limited pilot. Phase 0 is a decision study; it does not authorize a broad feature build or national launch.

### Proposed pilot measures (targets to approve)

| Measure | Definition | Target |
|---|---|---|
| Qualified learner interviews | Interviewed target users meeting the chosen cohort criteria | TBD; proposed research plan: 15 learners plus 5 educators/content operators |
| Problem evidence | Share of interviewed users who describe the problem unaided and rank it among current needs | TBD before interviews |
| Paid intent | Learners who place a deposit, buy a pilot offer, or complete a transparent price test | TBD before price test |
| Activation | Enrolled learners who complete the first defined learning/test action | TBD |
| Learning engagement | Attempts or lesson actions per active pilot learner per week | TBD |
| Outcome | Pre/post or rubric-based improvement aligned to pilot learning objective | Define by exam/course; no guarantee of exam success |
| Support and reliability | Payment success, support response, content error rate, service incidents | Thresholds TBD |
| Unit economics | Contribution margin, CAC, refund rate, projected payback | Thresholds TBD |

## 7. Legal, regulatory, and ethical boundaries

This section is an issue register, **not legal advice**. Applicability and commencement dates must be confirmed with Indian counsel for the actual operator, products, user ages, data flows, and states/countries served.

| Area | Project exposure | Required action before pilot/launch |
|---|---|---|
| Consumer protection and coaching advertising | Marketing may claim exam outcomes, ranks, faculty credentials, or course benefits. CCPA has emphasized that coaching ads must be accurate and not imply guaranteed selection; success claims and candidate testimonials require careful substantiation/disclosure. ([CCPA advisory, 2025](https://consumeraffairs.gov.in/public/upload/admin/cmsfiles/pressRelease/Central_Consumer_Protection_Authority_CCPA_advises_coaching_centres_to_strictly_adhere_to_Consumer_Protection_Act%2C_2019_and_Guidelines_for_the_Prevention_of_Misleading_Advertisements_in_the_Coaching_Sector%2C_2024_press_release.pdf); [2024 Guidelines](https://consumeraffairs.gov.in/public/upload/admin/cmsfiles/whatsnews/The_Guidelines_for_Prevention_of_Misleading_Advertisement_in_Coaching_Sector%2C_2024_whatsnews.pdf)) | Review landing pages, discounts, testimonials, outcome statements, terms and complaint/refund process with counsel. No guaranteed selection/placement claims. |
| Personal data and minors | Accounts, phone/email, progress, submissions, class participation and analytics are personal data; school-level course content means minors may use the service. The DPDP Act was enacted in 2023 and the Rules were notified in 2025 with phased commencement. ([Act](https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf); [commencement Gazette](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf); [Rules](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)) | Map data and purposes, retention, processors, consent/notice, rights handling, security/breach procedures, and child-specific rules. Confirm phased effective dates at launch. |
| Copyright and content licensing | Lessons, PDFs, video, question banks, PYQs, answer keys, user uploads, and instructor recordings may contain third-party works. ([Copyright Act, 1957](https://www.indiacode.nic.in/indiacode/handle/123456789/1367?view_type=browse)) | Maintain ownership/license/permission evidence for every item; define takedown and rights complaint workflow. Do not assume an exam paper or publicly available PDF is free to republish. |
| Tax and invoicing | Paid digital courses, books, memberships, and cross-border payments may receive different tax treatment. ([CBIC GST reference](https://cbic-gst.gov.in/gst-registration-rules.html)) | Obtain tax advice for the operator and each product/market; configure tax, invoice, and accounting flows from advice. |
| Payment and subscriptions | Stripe/Razorpay code exists; provider terms, chargebacks, cancellation, renewals, refunds, and payment data handling still require operational policy. | Confirm merchant entity/KYC, provider approvals, webhook and reconciliation controls, customer support and refund policies. |
| Accessibility and learner safety | Mobile-first learners, translated content, classroom interactions and potential minors. | Review accessibility, moderation, reporting, instructor conduct, age handling and recording/privacy notice. |
| Exam names and endorsements | Exam/commission names and logos may appear in catalog and marketing. | Avoid implying government endorsement or affiliation absent permission; review names, marks, logos, and claims. |

## 8. Principal risks and mitigations

| Risk | Impact | Mitigation / owner |
|---|---|---|
| Too many segments dilute product and content quality | High spend, weak differentiation | Product owner chooses one beachhead from research; stage-gate expansion. |
| Free and established providers reduce willingness to pay | Weak conversion and high CAC | Test a focused value proposition and paid intent before building more breadth. |
| Content is inaccurate, stale, or improperly licensed | Learner harm, trust and legal exposure | Editorial review, source/provenance records, content release checks. |
| Product implementation differs from older architecture claims | Launch promises exceed delivery | Base scope on current FRS/SRS and runtime evidence; maintain a gap register. |
| Unclear environment/release controls | Data exposure or unsafe deploys | Define Local/DEV/TEST/UAT/PROD, secret ownership, backups and approval gates; see SOW. |
| Payment or data incident | Financial, legal, trust impact | Security review, webhook reconciliation, incident response and counsel review before pilot. |

## 9. Decision record

| Decision | Current state |
|---|---|
| Approve customer/market validation | Requested; owner decision TBD |
| Select beachhead segment | TBD; BPSC/state-PSC is a hypothesis only |
| Approve Phase 0 budget cap | TBD |
| Approve pilot pricing/refund model | TBD |
| Approve pilot go/no-go thresholds | TBD |
| Approve pilot launch | Not requested by this document; requires a later decision |

## 10. Related documents

- [Phase 0 Market Research](./PHASE_0_MARKET_RESEARCH.md)
- [Phase 0 Statement of Work](./PHASE_0_SOW.md)
- [FRS](./FRS.md) and [SRS](./SRS.md) — code-derived product and software baselines.
- [Launch checklist](./LAUNCH_CHECKLIST.md) — existing, incomplete production setup notes.
