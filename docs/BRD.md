# TrillionSkill Business Requirements Document

**Status:** Project baseline and business hypotheses; sponsor decisions remain open · **Prepared:** 2026-10-06 · **Product:** TrillionSkill (package name `aspirantbook`) · **Audience:** Product/business sponsor, operations, finance, legal, engineering, content and teaching stakeholders

## 1. Purpose

This Business Requirements Document (BRD) explains why TrillionSkill exists, the business capabilities the platform is intended to support, and the outcomes that should be measured. It is grounded in the repository and the Phase 0 business/market documents. It does not claim that the business model, target segment, financial case, or launch plan has been validated.

The [PRD](./PRD.md) turns the business needs into product scope and priorities. The [FRD](./FRD.md) defines testable functional requirements. The existing [FRS](./FRS.md) is a code-derived inventory of current behavior; the [SRS](./SRS.md) describes software architecture and quality requirements.

## 2. Business context

The current product is a digital learning and exam-preparation platform. Repository evidence includes courses and tracks, lesson progress, assessments, exam series and timed attempts, PYQs, books, subscriptions and payment integrations, teacher/admin content tools, analytics, and live/demo learning routes.

The product currently spans competitive exam preparation, school-level learning, and technical skills. The repository does not establish which segment is the commercial beachhead. BPSC/state-PSC is a research hypothesis only, not an approved business strategy.

## 3. Business problem and opportunity

### 3.1 Problem statement

Learners may need to combine instruction, study plans, practice, exam simulation, feedback, and instructor support across multiple services. The business hypothesis is that an integrated, mobile-first experience can reduce this fragmentation for a selected learner group and produce measurable learning and commercial outcomes.

This problem statement is to be validated through learner and educator research. Code coverage is not evidence of customer demand.

### 3.2 Opportunity statement

TrillionSkill can test whether a focused digital product can serve a selected cohort through structured content, realistic practice, and useful progress feedback. The platform has code for multiple monetization mechanisms—course purchases, subscriptions/passes, exam access, and books—but their operational readiness and unit economics are unknown.

The detailed evidence, competitor context, and market-sizing limitations are in [Phase 0 Market Research](./PHASE_0_MARKET_RESEARCH.md). Financial assumptions and investment gates are in the [Phase 0 Business Case](./PHASE_0_BUSINESS_CASE.md).

## 4. Business objectives and outcomes

The objectives below are proposed business outcomes. Owners and numeric thresholds must be approved before a pilot; none are represented as achieved.

| ID | Business objective | Measure | Target / owner |
|---|---|---|---|
| BR-01 | Select a defensible initial learner segment and use case. | Segment selected with interview and behavioral evidence; decision recorded. | TBD / Executive sponsor + Product owner |
| BR-02 | Help learners complete a meaningful learning-and-practice loop. | Activation, lesson/test completion, return rate, and defined learning outcome. | Define baseline and target before pilot / Product owner |
| BR-03 | Establish willingness to pay for a clear learner outcome. | Paid conversion or other behavioral willingness-to-pay test at disclosed terms. | TBD / Business owner |
| BR-04 | Operate a sustainable offer. | Contribution margin, acquisition cost, refunds, support cost, and payback. | Finance-approved thresholds TBD / Finance owner |
| BR-05 | Publish trustworthy, rights-cleared learning and assessment content. | Content provenance, editorial approval, correction rate, rights records. | Threshold and owner TBD / Editorial owner |
| BR-06 | Protect learner data and safely deliver paid access. | Access-control findings, payment reconciliation, privacy obligations, incidents. | Launch gates defined with Engineering and Legal |
| BR-07 | Serve learners on mobile and across supported languages. | Task completion at defined viewport/device/network profiles; accessibility findings. | Targets per UI standard; baseline TBD / Product + Engineering |

## 5. Stakeholders and business roles

| Stakeholder | Business interest / decision responsibility |
|---|---|
| Executive sponsor | Approves business direction, investment cap, go/no-go gates and launch risk. |
| Product owner | Selects target segment, product outcomes, pilot scope and success metrics. |
| Learners and families | Use learning products; may be the purchaser or influence purchasing, especially for minors. |
| Teachers, educators and content authors | Create, review, deliver and maintain instructional and assessment content. |
| Content/editorial operations | Own quality, language coverage, syllabus mapping, rights, corrections and publishing. |
| Customer support/community operations | Handle account, payment, access, content and learner safety issues. |
| Finance/accounting | Owns budget, pricing model, tax/invoicing assumptions, payment reconciliation and unit economics. |
| Legal/privacy counsel | Reviews applicable privacy, consumer, marketing, IP, tax/payment, minors and vendor obligations. |
| Engineering/operations/security | Owns product delivery, data access, environments, reliability, integrations, release and incident controls. |
| Payment, cloud, media and content vendors | External dependencies for payments, storage, delivery, execution and live experiences. |

Named owners and delegated decision rights are **TBD**.

## 6. Business scope

### 6.1 In scope for the product business

- Learner acquisition, authentication, catalog discovery, enrollment and paid access.
- Courses, tracks, lessons, progress and learning support.
- Assessments, exam series, attempt lifecycle, results and practice.
- Teacher/admin content creation, publishing, user operations and analytics.
- Supporting products evidenced in the repository: PYQs, books, tutorials, live/demo learning and technical exercises.
- Payment/subscription operations and learner support.
- Mobile-first access, English/Hindi data where content exists, and secure handling of learner information.

This is the repository scope. A first launch or pilot should choose a smaller subset.

### 6.2 Out of scope until separately approved

- A commitment to serve every exam, grade, state, language, and technical-skill category at launch.
- Guaranteed exam selection, rank, placement, learning gain, or income claims.
- A specific nationwide launch, institution sales strategy, or B2B licensing model.
- Financial forecasts, price points, investment commitments, or profit targets without approved inputs.
- Operational claims such as a production SLA, verified national-scale concurrency, or formal regulatory certification.

## 7. Business requirements

| ID | Business requirement | Priority | Success evidence |
|---|---|---|---|
| BRQ-01 | The business shall choose one primary customer segment and one initial outcome before commissioning a pilot. | Must | Sponsor decision backed by customer research. |
| BRQ-02 | The business shall provide a clear learner journey from discovery through study/practice to meaningful feedback. | Must | Pilot cohort can complete the selected journey and its events are measured. |
| BRQ-03 | Paid products shall have transparent inclusions, access duration, pricing, renewal/cancellation, refund and support terms. | Must | Product and counsel approval; terms visible before purchase. |
| BRQ-04 | Content and assessments shall have an accountable owner, review process, source/provenance and correction path. | Must | Editorial operating process approved and used for pilot content. |
| BRQ-05 | Business outcome claims shall be substantiated and presented with required context. | Must | Marketing/legal review and evidence retained for claims. |
| BRQ-06 | The business shall understand direct delivery costs and contribution per offer before scaling acquisition. | Must | Finance model populated with observed or quoted data. |
| BRQ-07 | Learner support and incident ownership shall be established for account, access, payment, content and safety issues. | Must | Published service route and accountable owner before pilot. |
| BRQ-08 | A launch shall proceed only after privacy, minors, copyright, consumer, payment and tax questions are reviewed for the actual operating model. | Must | Counsel/finance sign-off or documented mitigations and accepted residual risks. |
| BRQ-09 | Product operation shall preserve learner and course data and maintain appropriate backups and recovery procedures. | Must | Operational runbook, tested backup/restore and retention rules. |
| BRQ-10 | The product shall support the mobile-primary experience and accessibility commitments in project UI standards. | Must | Responsive/accessibility acceptance for the pilot’s touched screens. |

## 8. Business policies and constraints

1. User-facing outcomes, exam ranks, testimonials and success stories must not be misleading or imply guaranteed selection. Coaching-sector advertising guidance and consumer-protection obligations require review by counsel.
2. Content may only be published when ownership or permission is documented; public availability alone is not a license.
3. Learner identity, assessment, payment and progress data require purpose-limited access and a defined retention/rights process.
4. Minors may use school-oriented content. Age handling, guardian/consent duties, safeguarding and recordings require counsel review before a school-focused pilot.
5. No production data or secrets may be copied into development, test, or research artifacts without explicit controls and approval.
6. Existing content, learner progress, and internal IDs must not be removed or changed as a shortcut; use approved archival and migration procedures.
7. Business policies apply across web, mobile shell, staff studio, email/marketing, payment provider experiences, and support workflows.

## 9. Business assumptions and open decisions

| Item | Current position |
|---|---|
| Initial segment/exam | TBD; BPSC/state-PSC is a hypothesis in Phase 0 research. |
| Paying customer and buyer | TBD; learner, family, institution or teacher model is not confirmed. |
| Price, plan, discounts and refund policy | TBD; code supports commerce but is not proof of approved commercial policy. |
| Budget and loss cap | TBD; finance/sponsor input required. |
| Team and operating capacity | TBD; no approved staffing plan evidenced. |
| Geography/languages | India is the current market hypothesis; specific regions and language commitments TBD. |
| Legal entity and tax treatment | TBD; review with qualified counsel/accounting professional. |
| Production operations and environment strategy | TBD; repository lacks a complete Local/DEV/TEST/UAT/PROD deployment map and CI/CD pipeline. |
| Success thresholds | TBD; define before pilot rather than after seeing outcomes. |

## 10. Risks and dependencies

| Risk/dependency | Business effect | Required response |
|---|---|---|
| Product scope is broader than launch capacity | Delays, weak content quality and diluted marketing | Select a beachhead and stage expansion. |
| Free services and established competitors | Low paid conversion/high acquisition costs | Validate a differentiating learner outcome and actual willingness to pay. |
| Content quality, rights or syllabus errors | Learner harm, refunds, trust and legal exposure | Editorial review, provenance, permissions, versioning and correction process. |
| Payment/environment/release gaps | Failed transactions or data/security incidents | Complete operations baseline and launch gates before paid pilot. |
| Missing customer and cost data | Unreliable ROI or market sizing | Conduct research; do not approve scale spend from hypothetical numbers. |
| External vendor dependency | Availability, cost or policy changes | Monitor contracts, quotas, data handling, failover and alternatives. |

## 11. Business acceptance and governance

The BRD is accepted for planning when the sponsor has:

- Confirmed the selected segment and business outcome or approved a research plan to select them.
- Named product, finance, content, operations and legal owners.
- Set the discovery/pilot budget cap and decision gates.
- Agreed on the measurement plan and definitions before a pilot begins.
- Recorded open legal, privacy, content, payment and environment risks with owners.

Approval of this BRD does not itself authorize a production launch or a specific investment amount.

## 12. Related project documents

- [Product Requirements Document](./PRD.md)
- [Functional Requirements Document](./FRD.md)
- [Phase 0 Business Case](./PHASE_0_BUSINESS_CASE.md)
- [Phase 0 Market Research](./PHASE_0_MARKET_RESEARCH.md)
- [Phase 0 Statement of Work](./PHASE_0_SOW.md)
- [FRS](./FRS.md) and [SRS](./SRS.md)
