# TrillionSkill Requirements Traceability Matrix

**Status:** Initial traceability map from the master BRD/PRD/FRD/FRS/SRS  
**Audience:** Product, QA, engineering, release approvers

| Requirement group | Representative source IDs | Verification cases | Evidence to retain |
|---|---|---|---|
| Identity, roles, ownership | BRQ-07/08; PR-02/08; FRD-ID-*; FRS-ID-*; SRS-SEC-* | TS-AUTH-01–03 | Test account, request trace, authorization assertion |
| Course discovery, enrollment, progress | BRQ-02; PR-02/03; FRD-LRN-*; FRS-LRN-* | TS-COURSE-01/02 | UI trace, DB ownership state, access result |
| Exam attempts and scoring | PR-04/05/09; FRD-EXM-*; FRS-EXM-* | TS-EXAM-01–04 | Attempt rows, sync sequence, expiry/result trace |
| Payment and entitlement | BRQ-03/06; PR-05/06; FRD-PAY-*; FRS-PAY-*; SRS external interfaces | TS-PAY-01–03 | Signed test event, ledger state, entitlement check |
| Content rights/import/security | BRQ-04/05; PR-07/10; FRD-ADM/AUX; SRS-SEC-* | TS-CONTENT-01/02 | Import report, sanitizer evidence, role and publication state |
| Mobile/accessibility | BRQ-10; PR-08; responsive standards | TS-UI-01–03 | Required viewport screenshots, axe/manual review |
| Migration/recovery | SRS data constraints; `docs/MIGRATIONS.md` | TS-OPS-01 | Migration logs, backup ID, restore timing and validation |

## Status tracking
For each release copy this matrix or link a test management record, add every detailed requirement ID, test case, owner, environment, result, defect, and evidence pointer. Status values: Not Run, Pass, Fail, Blocked, Accepted Risk. A source mapping is not proof of test coverage until the case is executed.
