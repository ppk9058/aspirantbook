# TrillionSkill Test Cases

**Status:** Initial risk-based case catalogue; execute and record results per release  
**Audience:** QA and engineering

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| TS-AUTH-01 | Guest opens a protected learner page | Safe sign-in path; no private data in response | P0 |
| TS-AUTH-02 | Student calls teacher/admin mutation directly | Server rejects request; data unchanged | P0 |
| TS-AUTH-03 | User substitutes another learner’s record ID | No cross-user read or mutation | P0 |
| TS-COURSE-01 | Student enrolls in a published eligible course | One enrollment; repeat is handled idempotently | P0 |
| TS-COURSE-02 | Student requests draft/archived restricted content | Access denied without leaking private details | P0 |
| TS-EXAM-01 | Eligible learner starts a timed attempt | Persisted attempt and server-derived deadline returned | P0 |
| TS-EXAM-02 | Refresh/reconnect during active attempt | Own attempt resumes with saved state and remaining server time | P0 |
| TS-EXAM-03 | Stale answer sync follows a newer sync | Older sequence cannot overwrite newer persisted answer | P0 |
| TS-EXAM-04 | Submit attempt twice or after deadline | Idempotent finalized state; no duplicate result | P0 |
| TS-PAY-01 | Forged payment webhook signature | Rejected; payment and entitlement unchanged | P0 |
| TS-PAY-02 | Valid webhook is replayed | No duplicate payment or entitlement effect | P0 |
| TS-PAY-03 | Client tampers with price before checkout | Server-calculated amount remains authoritative | P0 |
| TS-CONTENT-01 | Import package contains duplicate title, new external ID | No title-only merge; draft created according to importer rules | P1 |
| TS-CONTENT-02 | Malicious HTML/SVG is rendered or uploaded | Sanitized or isolated according to policy; no script execution | P0 |
| TS-CODE-01 | Anonymous or oversized execution request | Rejected safely; no provider secrets returned | P0 |
| TS-UI-01 | Student completes primary journey at 320–1440 widths | No horizontal page scroll; content and actions remain available | P0 |
| TS-UI-02 | Keyboard-only and 200% zoom review | Focus visible, controls labeled, content usable | P1 |
| TS-UI-03 | Reduced motion and dark mode | No essential motion dependency; contrast and status cues remain clear | P1 |
| TS-OPS-01 | Apply migration to clean test DB, then restore backup | Schema matches expected; restore procedure documented | P0 |

Execute using synthetic data and record actual results, environment, build, screenshots/traces, and defect references. Case outcomes are not prefilled as passes.
