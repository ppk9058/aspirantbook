# Phase 0 — Statement of Work

**Acronym:** SOW
**Document status:** Draft for sponsor approval · **Prepared:** 2026-10-05 · **Project:** TrillionSkill product viability and launch-scope validation · **Indicative duration:** 4 calendar weeks after kickoff, subject to participant access and sponsor decisions · **Budget:** TBD; approval required before kickoff

## 1. Purpose

This SOW defines a bounded Phase 0 engagement to decide whether TrillionSkill should proceed to a focused pilot, what that pilot should include, and what investment, legal, product, and operational controls it requires. It covers research and planning, not production feature development or launch execution.

## 2. Objectives

1. Choose and evidence a primary customer segment and initial use case.
2. Assess demand, alternatives, pricing, and willingness to pay.
3. Produce a decision-ready business case and budget model with explicitly sourced or TBD inputs.
4. Identify legal/compliance questions requiring counsel and define launch-critical content-rights boundaries.
5. Baseline the current repository/product scope, environment separation, release process, and operational gaps.
6. Define a measurable pilot scope, delivery timeline, and go/no-go criteria.

## 3. Scope

### In scope

- Review current code-derived FRS/SRS and existing launch/setup docs.
- Map Local, DEV, TEST, UAT and PROD configuration/deployment status without exposing local secrets.
- Review current CI/CD evidence and recommend a minimum verification/release gate design.
- Research India online learning/exam-preparation demand and public competitors with cited sources.
- Interview target learners and educators/content operators (target sample below).
- Define a beachhead segment and a narrow pilot offer for sponsor decision.
- Build a financial model template: operating cost, unit economics, scenario inputs, and investment gates.
- Prepare a legal/compliance issue register for review by qualified counsel.
- Define pilot requirements, deliverables, acceptance measures, risks, roles and schedule.

### Out of scope

- Legal opinions, tax opinions, licensing opinions, or formal regulatory certification.
- Writing or buying course/question content; obtaining licenses; teaching or running a cohort.
- Production code changes, deployment, migration, or CI/CD implementation.
- Paid advertising, production launch, customer support operations, or guaranteed market outcomes.
- Committing funds, hiring, choosing vendors, or setting final retail prices on the sponsor’s behalf.
- A statistically representative national survey or a definitive TAM claim without reliable segment-level data.

## 4. Work packages and deliverables

| Work package | Activities | Deliverable / acceptance |
|---|---|---|
| WP1 — Product and operations baseline | Review repository FRS/SRS, route/model inventory, launch checklist; record environment and CI/CD evidence/gaps. | **D1: Product & Operations Baseline** — current capabilities, limitations, environment map, release gap list, source-linked. Accepted when sponsor can distinguish implemented, unverified and absent capabilities. |
| WP2 — Customer and market research | Segment hypotheses, desk research, competitor review, interviews and workflow observation. | **D2: Market Research** — sources/date/method, competitor matrix, interview findings, segment recommendation and unresolved assumptions. Accepted when claims are attributed and research limits are stated. |
| WP3 — Business and financial case | Value proposition, monetization hypotheses, cost worksheet, unit-economics formulas, scenarios and investment gates. | **D3: Business Case** — conditional go/no-go recommendation with every material financial input sourced or TBD. Accepted when the sponsor can enter budget and threshold values without rewriting the model structure. |
| WP4 — Legal/compliance issue register | Review product data/content/payment/marketing surfaces and map questions for counsel. | **D4: Legal and Content-Rights Register** — issue, exposure, owner, decision required, source, and due gate. Accepted when no legal conclusion is represented as advice. |
| WP5 — Pilot definition and decision | Define pilot cohort, offer, scope, measurable outcomes, launch dependencies, risks and decision meeting. | **D5: Pilot Scope & Go/No-Go Pack** — pilot charter, acceptance measures, indicative schedule, dependencies and decision record. Accepted when sponsor records approve/hold/reject and owners. |

## 5. Indicative schedule

The schedule begins only after sponsor, product owner and research access are confirmed. Dates are not committed until kickoff.

| Week | Activities | Review point |
|---|---|---|
| 1 | Kickoff; repository/product/env/CI review; select candidate segments; approve interview guide and research protocol. | Gate A: sponsor approves primary segments and participant recruitment. |
| 2 | Learner/educator interviews; competitor workflow and offer review; market/source research; legal issue spotting. | Midpoint readout: early evidence, scope adjustments, risks. |
| 3 | Complete interviews; refine positioning and offer; cost/vendor inputs; draft financial model and pilot requirements. | Gate B: sponsor selects or rejects beachhead and provides cost/budget inputs. |
| 4 | Finalize business case, market research, issue register, pilot SOW/metrics and decision pack. | Gate C: approve/hold/reject next pilot phase and authorize budget separately. |

**Schedule dependencies:** availability of learners/educators, access to analytics/checkout data, current vendor quotes, legal/finance review, and sponsor turnaround within two working days. Delays extend the schedule or reduce research scope; changes are recorded in the decision log.

## 6. Proposed research and acceptance measures

| Measure | Target / acceptance criterion |
|---|---|
| Learner interviews | Target 15 from the selected segment; document recruitment profile and refusals/limitations. |
| Educator/content-operator interviews | Target 5; include at least one perspective on authoring, content costs or delivery operations. |
| Product workflow observation | Target 5 observed learner sessions, using consented accounts/data and a defined task. |
| Competitor comparison | At least 3 alternatives including one free/public alternative; record observation date, offer, included features and caveats. |
| Repository baseline | Identify present environment files/configuration without printing secrets; distinguish local files from tracked deployment config. |
| Financial model | Cost lines, source/owner, low/base/high assumptions, contribution, CAC/payback formula, and blank fields for sponsor inputs. No invented financial forecast. |
| Legal register | Each item has an owner and counsel action; applicability/effective date marked for confirmation. |
| Pilot metrics | Define activation, engagement, learning outcome, paid intent/conversion, refunds/support, reliability and unit-economic measures; sponsor sets thresholds before the pilot. |
| Final recommendation | One of approve pilot / hold pending evidence / stop, with rationale, assumptions and accountable sponsor decision. |

Sample sizes are qualitative discovery targets and are not statistically representative. If recruitment is not possible, the final recommendation must state that limitation and avoid claiming customer validation.

## 7. Roles and responsibilities

| Role | Responsibility | Named owner |
|---|---|---|
| Executive sponsor | Approve scope, budget cap, segment decision, gates, and Phase 1 authorization. | TBD |
| Product owner | Provide product context, approve requirements, recruit/access users, decide pilot offer and metrics. | TBD |
| Research lead | Conduct interviews, analyze alternatives, maintain evidence and consent records. | TBD |
| Engineering/operations lead | Verify code/env/release baseline, technical gaps, operational cost and pilot readiness. | TBD |
| Finance owner | Supply labor/vendor costs, tax assumptions, downside cap and revenue model inputs. | TBD |
| Legal/privacy counsel | Review applicable consumer, privacy, minors, copyright, tax/payment and marketing obligations. | TBD |
| Content/editorial owner | Confirm content ownership, licenses, accuracy, translation and update process. | TBD |

One person may hold multiple roles, but finance and legal decisions must be reviewed by qualified owners.

## 8. Budget and commercial assumptions

**Approved budget: TBD.** Before kickoff, the sponsor should set a not-to-exceed amount. Estimate the Phase 0 cost as:

`Σ(role-days × approved loaded daily rate) + research/recruitment/incentives + travel/tools + legal/finance review + approved contingency`

| Cost item | Owner/input | Amount |
|---|---|---|
| Product/research/engineering days | Role rates and allocation | TBD |
| Participant recruitment and incentives | Research plan | TBD |
| Competitor/test purchases | Approved amount and receipts | TBD |
| Legal/privacy/accounting review | Counsel/finance quote | TBD |
| Travel, tools and other expenses | Approved policy | TBD |
| Contingency and spending cap | Sponsor/finance approval | TBD |

No work beyond the cap proceeds without a written scope and budget change approval. Vendor and staff costs are not inferred from source code.

## 9. Legal, data, and research safeguards

- Research participation is voluntary; explain purpose, recording, retention, and who will see notes. Collect the minimum participant data and store research artifacts in an approved location.
- Do not use production personal data in research or test environments without explicit authorization and a documented control plan. Never copy secrets from `.env*` files into documents or issue trackers.
- If minors may participate, pause recruitment until the sponsor and counsel approve age screening, guardian consent, privacy notice, recording, and safeguarding procedures.
- Do not publish participant quotes, outcome stories, ranks, or images without appropriate consent and verification.
- Treat the legal issue register as questions for counsel. Product launch remains blocked on required legal/tax/privacy/content-rights decisions.

## 10. Change control, risks, and dependencies

### Change control

Any change to target segment, deliverables, sample size, scope, schedule, or cap must be recorded with reason, cost/schedule impact, approver, and date. New implementation or pilot execution requires a separate authorization.

### Key dependencies/risks

| Risk/dependency | Response |
|---|---|
| No confirmed target cohort or customer access | Sponsor nominates a segment and recruitment channel in Week 1; otherwise publish market hypotheses only. |
| No actual cost/price/conversion data | Model inputs remain TBD; do not approve scale spend based on modeled scenarios alone. |
| Broad product surface creates scope creep | Hold Phase 0 to one pilot segment; put other product lines in a backlog. |
| Current environment/release process is unclear | Include environment/CI findings in D1; require separate release-control work before production expansion. |
| Content rights or accuracy cannot be demonstrated | Exclude affected material from pilot until documented permission/review exists. |
| Legal review unavailable by Week 4 | Mark go/no-go as hold for affected risk; do not treat desk research as counsel approval. |

## 11. Approval and sign-off

| Approval | Name | Decision/date |
|---|---|---|
| Executive sponsor — scope and spending cap | TBD | TBD |
| Product owner — target segment and research access | TBD | TBD |
| Finance — cost basis and cap | TBD | TBD |
| Legal/privacy counsel — review scope and issues | TBD | TBD |

Approval of this SOW authorizes Phase 0 only. It does not authorize a product launch, production deployment, new vendor contract, hiring, or Phase 1 development spend.

## 12. Related documents

- [Business Case](./PHASE_0_BUSINESS_CASE.md)
- [Market Research](./PHASE_0_MARKET_RESEARCH.md)
- [FRS](./FRS.md) and [SRS](./SRS.md)
- [Launch checklist](./LAUNCH_CHECKLIST.md)
