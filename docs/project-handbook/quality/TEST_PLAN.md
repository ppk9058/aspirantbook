# TrillionSkill Test Plan

**Status:** Proposed verification baseline; test inventory and pipeline ownership require confirmation  
**Audience:** QA, engineers, product, release owner

## Objective and scope
Verify the selected learner journey, staff publishing controls, assessment/exam integrity, commerce, privacy boundaries, mobile accessibility, and release safety. Current repository evidence is not a QA pass. Scope must be narrowed to the sponsor-approved pilot before execution.

## Test levels
| Level | Coverage | Evidence |
|---|---|---|
| Unit | Validation, scoring, state transitions, authorization helpers | Test output, fixtures and coverage for critical rules |
| API/integration | Prisma ownership, attempt lifecycle, callbacks, content publish | Isolated test DB; deterministic provider/webhook fixtures |
| E2E | Logged-in student/teacher/admin workflows | Playwright traces/screenshots on test accounts |
| Visual/responsive | 320–1440 widths, shell flag paths, light/dark | Approved screenshots at required breakpoints |
| Accessibility | Keyboard, visible focus, labels, contrast, reduced motion, zoom | Axe results plus manual keyboard review |
| Security | Role escalation, IDOR, unsafe uploads, webhook forgery, XSS, secret leakage | Findings linked to route and mitigation |
| Operational | backup/restore, migration deploy, rollback, alert routing | Timed exercise records and approvals |

## Test environments and data
Use isolated Local/DEV/TEST/UAT datasets with synthetic users and content. Never copy production learner data without written approval and a documented privacy-safe procedure. Provider test keys stay separate from live keys. Confirm that deployment configuration matches the environment label.

## Entry and exit criteria
Entry: approved scope, stable build, test accounts, environment health, test data and known defects. Exit: all launch-critical cases pass or have an explicitly accepted risk owner; no unresolved critical security/data-integrity defect; migration/restore evidence and release approval are recorded. Numeric thresholds remain TBD until owners set them.

## Reporting
Record build/commit, environment, browser/device, test data class, case ID, pass/fail/blocked, evidence URL, defect ID, severity, retest, and approver. Do not claim “passed” from a successful build alone.
