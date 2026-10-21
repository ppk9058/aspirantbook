# RUN 3A STATE TRACKER

- **UTC Start**: 2026-10-21T09:40:41Z
- **Branch**: `expo-mobile`
- **Initial Baseline Commit**: `dab1fea0881bc091c5483ea4e64ba6bf287c88b0` (Run 2 final)
- **Stash rev-parse**: `88f95e437366b6c03d2107303ec9f2d4a7e9cb91`
- **Caffeinate PID**: 12627
- **Heartbeat PID**: 12628
- **Hard Ceiling**: 6.0 h (Ends ~15:40:41 UTC)

---

## Tasks Checklist & Status

| Task ID | Description | Estimate | Start (UTC) | End (UTC) | Status | Log Path | Commit Hash |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R0** | Preflight checks & environment setup | 0.25 h | 2026-10-21 09:40:41 | 2026-10-21 09:56:21 | DONE | `reports/run3a/r0-preflight.log` | `d5b8e38` |
| **A1** | Re-prove Run 2 (Facts 1-9 audit, tsc diff, docs/RUN3A_AUDIT.md) | 0.75 h | 2026-10-21 10:01:00 | 2026-10-21 10:28:54 | DONE | `reports/run3a/a1-audit.log` | `3a90131` |
| **SEC1** | OTP / Reauth / Session Security hardening & regression tests | 1.50 h | 2026-10-21 10:30:00 | 2026-10-21 10:43:44 | DONE | `reports/run3a/sec1-security.log` | `b02d0d1` |
| **A2** | Honest Full Web Regression + Scope Repair | 2.00 h | 2026-10-21 10:45:00 | 2026-10-21 14:10:00 | DONE | `reports/run3a/a2-regression.log` | `7150198` |
| **F-mini** | Verification proofs, tripwire greps, final review pack & report | 0.50 h | 2026-10-21 14:10:00 | - | DOING | `reports/run3a/fmini-proof.log` | - |

---

## Task Details & Blockers Log

### R0 - Preflight
- Status: DONE
- Branch confirmed `expo-mobile`.
- No `.git/MERGE_HEAD`.
- Docker test container `trillionskill-test-db` healthy on `127.0.0.1:54329`.
- Stash hash recorded: `88f95e437366b6c03d2107303ec9f2d4a7e9cb91`.
- Caffeinate PID: 12627, Heartbeat PID: 12628.
- `RUN_REPORT_21OCT.md` moved to `archive/run1/RUN_REPORT_21OCT.md` with disproved claims header.
- ERRATA prepended to `RUN_REPORT_R2.md`.

### A1 - Re-prove Run 2
- Status: DONE
- Commit: `3a90131`
- Log: `reports/run3a/a1-audit.log` (394 lines)
- Verified facts 1-9 independently with raw commands.
- tsc error diff: 77 clean baseline vs 65 Run 2 initial vs 64 current HEAD.
- Section 5.2 in `docs/RUN2_AUDIT.md` marked FALSE with evidence.

### SEC1 - Security Hardening & Parity
- Status: DONE
- Commit: `b02d0d1`
- Log: `reports/run3a/sec1-security.log` (279 lines)
- Anti-speed record: 9 tests added in `tests/api-v1-sec1.test.ts`. 123 tests run total across 3 suites (9 fail-before, 9 pass-after, 88 full API/contract tests, 26 mobile tests).
- Hardened:
  - `lib/api/v1/dev-bypass.ts`: central helper strictly enforcing false in production.
  - `lib/boot-guard.ts`: refusal on production + dev bypass.
  - `app/api/v1/auth/otp/request` & `verify`: always 501 when dev bypass is off.
  - `app/api/v1/auth/reauth`: rate limit 5/15m per user+IP, passwordless 501 REAUTH_UNAVAILABLE without bypass.
  - `lib/api/v1/tokens.ts`: reauth tokens tied to session, single-use tracking against reuse.
  - `lib/services/user.service.ts`: REAUTH_REQUIRED if no proof, re-registration with same phone allowed.
  - `lib/services/auth-token.service.ts`: refresh token reuse revokes entire family (verified via fail-before mutation proof).

### A2 - Honest Full Web Regression + Scope Repair
- Status: DONE
- Commits: `7150198` (revert regex weakening in real-only-series-catalogue to strictest exact matcher)
- Log: `reports/run3a/a2-regression.log`
- Audited commit `5b8db39` file by file; identified 10 web-only scope deviations for owner confirmation.
- Baseline `1b48ec9` worktree tested on port 3046 vs HEAD on port 3045: all 8 tests across the 3 specs pass on both (`golden-path` 6 passed, `test-series-authoring-edit-review:723` 2 passed).
- Proved `POST /api/exam/attempt/start` returns 201 on creation (`resumed: false`) and 200 on resume (`resumed: true`), verifying that `(200 || 201)` assertion is justified.
- Re-tested catalogue modes: `CATALOGUE_CASE=empty` passes 4/4 with exact matcher; restored DB state.
- Executed two complete Playwright runs:
  - Run 1: 607 passed, 13 failed (54.2m).
  - Run 2: 574 passed (2.1h).
  - Root causes identified: 4 failures from `real-only-series-catalogue` run against non-empty DB without `CATALOGUE_CASE=empty`; 2 canary journey tests; others were flaky/timeout on long single-worker run. Zero merge/Run-2-caused functional breakages.

### F-mini - Proof & Final Reporting
