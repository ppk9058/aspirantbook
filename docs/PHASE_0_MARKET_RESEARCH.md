# Phase 0 — Market Research

**Acronym:** MR
**Document status:** Desk-research baseline; customer validation not yet conducted · **Research checked:** 2026-10-05 · **Geography hypothesis:** India, with a possible initial Bihar/state-PSC learner cohort · **Important:** Public market figures are not TrillionSkill sales forecasts. Competitor offers and prices change; verify at checkout before comparison.

## 1. Executive summary

The codebase points to a broad learning product: competitive exam preparation (including BPSC/UPSC flows), courses, PYQs, test series, books, assessments, live/demo learning, and technical skill-learning features. The visible product footprint suggests opportunity but does not identify a focused customer or prove demand.

India has large internet reach and active, well-funded/free and paid exam-preparation alternatives. Competitors already bundle recorded/live instruction, mock tests, previous papers, bilingual content, mentorship, and performance analytics. Therefore, **“all-in-one” functionality alone is unlikely to be a defensible position**. The strongest research question is whether TrillionSkill can win a narrower cohort through better local relevance, trust, test quality, affordability, teaching access, or continuity between learning and assessment.

Recommended research hypothesis: test **BPSC/state-PSC aspirants who want structured bilingual learning plus exam-like practice and useful feedback** against competing offerings. This is a hypothesis inferred from the repository’s BPSC-related content, PYQ and exam infrastructure, not a selected launch strategy.

## 2. Product and market boundary

### Product evidence from the repository

- Learning management: tracks, courses, chapters, lessons and learner progress.
- Exam preparation: test series, bilingual question fields, timed attempts, answer sync, results, PYQs and leaderboards.
- Adjacent offerings: books, assessments, tutorials, current-affairs quizzes, doubts, projects and coding practice.
- Commercial and instructional operations: paid courses/subscriptions, Stripe/Razorpay integrations, teacher/admin content tools, and demo/classroom routes.

The SRS and FRS describe implementation status. These features do not demonstrate active users, content supply, or readiness to sell every category.

### Market boundary options

| Market definition | Included | Use |
|---|---|---|
| Broad India online education | Online learning across school, test prep, skills and professional learning | Context only; too broad to represent the reachable market. |
| Indian exam-preparation services | Digital and blended learning, mock tests, test series, PYQs and instructor support for selected competitive exams | Potential serviceable category after the exam segment is selected. |
| First beachhead | One exam/cohort, one language mix, one region and one paid offer | Required basis for actionable TAM/SAM/SOM and pilot economics. |

Do not use broad EdTech market estimates as TrillionSkill TAM. Define the customer, exam, delivery mode, geographic eligibility and purchase unit first.

## 3. Market signals and evidence

| Signal | Evidence | Interpretation and limitation |
|---|---|---|
| Digital delivery reach | TRAI reported 1,002.85 million internet subscriptions at June 2025; 958.14 million were wireless. ([TRAI report](https://trai.gov.in/sites/default/files/2025-09/QPIR_03092025.pdf)) | Supports a large connectivity base, not unique learners, affordable data/device access, or demand for paid coaching. |
| Free exam-preparation alternative and adoption | The Ministry of Education reported SATHEE crossed one million enrolments and expanded modules such as SSC, ICAR, CUET and Banking. ([MoE Annual Report 2024–25](https://www.education.gov.in/sites/upload_files/mhrd/files/document-reports/MoE_AR_En.pdf); [MoE SATHEE announcement](https://www.education.gov.in/sathee-portal-offers-quality-education-students-preparing-competitive-exams)) | Demonstrates public provision and adoption; SATHEE may be a substitute, partner, or benchmark. Enrolments are not necessarily active learners or paid demand. |
| Broad online-learning market | Netscribes’ commercial report listing estimates India online education at ₹462.97 billion for FY2023. ([Research and Markets listing](https://www.researchandmarkets.com/reports/5671321/online-education-market-in-india-2024-2029)) | Secondary estimate with a broad category. Do not use it as target market size or derive project revenue from it. Obtain the underlying methodology/report if investment decisions depend on it. |
| Commercial bundle competition | Testbook describes a subscription/pass with mock tests, previous-year papers, study notes, live classes and doubt support. ([Testbook Pass](https://testbook.com/pass)) | Shows learners can compare all-in-one exam bundles; its live promotions/pricing are dynamic. |
| Large-scale multilingual instruction | Physics Wallah markets UPSC preparation with live/recorded classes, tests, material, mentorship and multiple language modes. ([PW UPSC batches](https://www.pw.live/upsc/batches); [PW test series](https://www.pw.live/upsc/test-series)) | Shows a strong content and instructor-led competitor with online/offline coverage. |
| Localized BPSC supply | Khan Global Studies lists BPSC foundation and mains batches, bilingual delivery, and live instruction; a checked product listing showed a batch offer at ₹4,500 (price/promotions can change). ([KGS courses](https://www.khanglobalstudies.com/explore-courses/live)) | Indicates direct regional competition. A single displayed price is a time-specific observation, not a stable price benchmark. |

### Evidence quality notes

- Government sources are stronger for internet and public-programme information; they do not measure the paid addressable market.
- Competitor product pages are primary evidence of marketed features/offers, not independent evidence of learning outcomes, market share or customer satisfaction.
- Commercial market reports may use opaque category boundaries and methodology. Validate before relying on a forecast.
- No repository evidence of TrillionSkill revenue, active learners, conversion, retention, CAC, or market share was found.

## 4. Customer segments and jobs to be done

| Segment | Likely job | Pain hypothesis | Buyer/user distinction | Priority for validation |
|---|---|---|---|---|
| BPSC/state-PSC aspirants | Build a study plan, learn syllabus, practise PYQs/mocks, identify weak areas | Fragmented content, inconsistent practice, poor feedback, language fit or instructor access | Usually learner pays; family influence possible | High (repository fit hypothesis) |
| UPSC/central-exam aspirants | Multi-stage syllabus learning, current affairs, mocks and answer evaluation | High content volume, difficulty prioritizing, feedback and affordability | Learner/family | Medium-high |
| School learners | Learn a subject, revise and practise aligned problems | Need curriculum alignment, accessible explanations and reliable teacher/content | Parent/guardian may pay; child uses | Medium; different safeguarding/acquisition needs |
| Coding/technical learners | Learn a skill and practise through projects/code execution | Need trustworthy progression, functioning execution/evaluation, job-relevant content | Learner or employer | Medium; direct competition differs from test-prep |
| Teachers/coaching providers | Publish/manage content, conduct tests, track learners | Need reliable authoring, cohort delivery, assessment and analytics | Institution/teacher buys; learners use | Secondary B2B hypothesis; validate separately |

## 5. Competitive landscape

| Alternative | Positioning/features visible publicly | Competitive implication for TrillionSkill |
|---|---|---|
| SATHEE (Ministry of Education/IIT Kanpur) | Free exam preparation, practice/assessment and exam modules. | A strong free substitute; paid proposition must show incremental value, support, curation or convenience. |
| Testbook | Broad exam catalogue and subscription bundle including mocks, PYQs, notes, live classes and doubt support. | Competes on breadth, exam coverage, bundled price and test inventory. |
| Physics Wallah / PWOnlyIAS | Online/offline batches, live and recorded classes, material, tests, mentorship and language options. | Competes on faculty/content supply, distribution and cohort guidance. |
| Khan Global Studies | BPSC and other state-exam batches, bilingual/local subject coverage, live instruction and practice. | Directly relevant benchmark if Bihar/state-PSC is selected; local faculty/content credibility may be decisive. |
| Offline coaching and independent educators | In-person classes, peer structure, local reputation and accountability. | Competes for learner time and spend; may be a partnership/content channel as well as competitor. |
| Free video, public exam materials and peer groups | Low-cost, unbundled content and community support. | Raises expectations for free access and creates content-rights/quality challenges. |

**Unvalidated differentiation candidates:** mobile-first course-to-test continuity; high-quality regional syllabus mapping; trustworthy bilingual question/solution review; progress guidance that is actionable; transparent affordable pricing; smaller cohorts with instructor response. Interviews and competitor user tests must establish which matter enough to pay for.

## 6. Pricing and willingness-to-pay research

Public competitor offers are promotional and time-sensitive. The KGS listing sampled in this research displayed a ₹4,500 offer for one BPSC foundation batch; Testbook and PW pages list multiple bundles/products and change terms by cohort. Do not copy a price point without matching duration, instructor time, test count, content, evaluation, access period, and support.

Test these options with the chosen cohort:

1. Free diagnostic/test + paid test-series upgrade.
2. One-time cohort/course fee with defined access period.
3. Recurring pass that bundles courses/tests.
4. Institution/teacher partnership license (only if a B2B buyer is validated).

Run price interviews and an ethical landing-page/deposit test. State exactly what is included, when it runs, the refund/cancellation conditions, and that purchase does not guarantee exam selection. Determine willingness to pay using actual behavior, not only stated preference.

## 7. Market sizing framework

### Current status

**TAM, SAM and SOM are TBD.** Available top-down sources are too broad, and repository data provides no target learner or transaction counts. Do not claim a numeric project market size until the beachhead and source definitions are approved.

### Recommended bottom-up method

For each selected exam/cohort, collect:

1. Unique eligible candidates by exam and cycle from official commission/exam sources (deduplicate where possible).
2. Share reachable in chosen language, state/region, device and acquisition channels.
3. Share expressing unmet need for the specific offer, measured with interviews/survey and behavioral test.
4. Realistic conversion at tested price from pilot acquisition.
5. Annual purchase frequency and retained contribution per paying learner.

Formulas:

- **TAM:** all eligible potential buyers in defined geographies × annual category spend per buyer.
- **SAM:** TAM subset matching selected exam, language, delivery mode and launch capability.
- **SOM:** reachable qualified prospects × evidenced paid conversion × annual net revenue per payer; cap by content/support capacity.

List denominator source/date, exclusions, overlap, price basis, and sensitivity for every estimate. An internet subscriber count is not a candidate count.

## 8. Research gaps and primary research plan

### Questions to answer

- Which single learner cohort and exam should be served first?
- What are learners doing today, which provider/content do they trust, and what do they pay for?
- What is the concrete unmet outcome: test realism, bilingual explanations, learning plan, answer evaluation, instructor support, or access/price?
- Does the implemented experience work reliably for that user on a low/mid-range phone and intermittent connectivity?
- Which content can be licensed or created economically, and how frequently must it be refreshed?
- Is the buyer a learner, parent, institution, or coaching operator?

### Suggested first research sprint

- Recruit **15 learners** from the chosen segment (target, not a statistically representative sample) and **5 teachers/content operators**.
- Observe 5 learners completing a typical study/test workflow in the current product.
- Review at least 3 competing services hands-on, including free and paid alternatives; record date, price, access period, language, content, support and refund terms.
- Conduct 5 concept/price tests only after open-ended problem interviews.
- Analyze support tickets, checkout/payment data and current active-user data if available; none was found in the repository scan.

## 9. SWOT and viability view

| Strengths | Weaknesses |
|---|---|
| Broad learning and assessment implementation; stateful exam attempt features; mobile-first project rules; dual payment code; teacher/admin content operations. | Wide product scope; code presence does not establish quality/adoption; no CI/CD pipeline evidenced; no verified environment separation/production metrics in repo; some aspirations in older docs are unsupported by current implementation. |

| Opportunities | Threats |
|---|---|
| Focused regional or exam-specific product; combine learning with measurable practice; teacher partnerships; targeted bilingual curation. | Free public options; established brands and local coaching; price competition; content-rights exposure; seasonal demand; trust and misleading-claim risk; weak retention or high acquisition cost. |

### Preliminary viability conclusion

The opportunity merits a focused validation sprint because the repository has a relevant product foundation and public evidence shows both learner adoption and active alternatives. **Commercial viability is undetermined.** A conditional pilot is reasonable only after demand, paid intent, unit economics, content rights, compliance and operational safeguards are validated.

## 10. Sources

All web sources below were checked on 2026-10-05; pages and promotions may change.

1. [TRAI, Quarterly Performance Indicators of Indian Telecom Sector, June 2025](https://trai.gov.in/sites/default/files/2025-09/QPIR_03092025.pdf)
2. [Ministry of Education, Annual Report 2024–25](https://www.education.gov.in/sites/upload_files/mhrd/files/document-reports/MoE_AR_En.pdf)
3. [Ministry of Education, SATHEE portal announcement](https://www.education.gov.in/sathee-portal-offers-quality-education-students-preparing-competitive-exams)
4. [Netscribes, Online Education Market in India 2024–2029, report listing](https://www.researchandmarkets.com/reports/5671321/online-education-market-in-india-2024-2029)
5. [Testbook Pass](https://testbook.com/pass)
6. [Physics Wallah UPSC batches](https://www.pw.live/upsc/batches)
7. [Physics Wallah UPSC test series](https://www.pw.live/upsc/test-series)
8. [Khan Global Studies courses](https://www.khanglobalstudies.com/explore-courses/live)
