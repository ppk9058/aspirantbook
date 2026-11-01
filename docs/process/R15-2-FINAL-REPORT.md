# R15-2 Final Report: Gitleaks false positive allowlist configuration

## Outcome

- Status: DONE
- Fix commit: `37b41b8b50da242d0819a1dc699b1069ce100b81`
- Local readiness tag: `r15-2-ready-2026-11-01`
- Branch: `feat/launch-blockers`
- Pushed: No

## Problem and Root Cause

The CI `gitleaks` job reported false positives (`generic-api-key`) in `docs/evidence/raw/*.txt` unit-suite logs (e.g. dev-email lines with `consent_valid_<timestamp>@example.com` and `verify-email?token=...` URLs from local test servers). CI noted "no gitleaks config found in path .gitleaks.toml". No actual secret was leaking.

## Fix Implemented

Added `.gitleaks.toml` at the repository root extending the default ruleset and adding an allowlist limited strictly to raw evidence text files:
```toml
[extend]
useDefault = true

[[allowlists]]
description = "Allowlist raw evidence logs to avoid false positives on simulated test fixtures"
paths = [
    '''^docs/evidence/raw/.*\.txt$''',
]
```

Guards & Constraints Verified:
1. **Scope Limited**: Only paths matching `^docs/evidence/raw/.*\.txt$` are allowlisted. No application code, test files, configs, or other documents are allowlisted.
2. **No .gitleaksignore Fingerprints**: No entries were added to `.gitleaksignore`. The R12-J test enforcing the 12-character limit on `.gitleaksignore` passes unmodified.
3. **No Leak Masking**: Active secret detection remains fully operational outside `docs/evidence/raw/`, as demonstrated by the control test.
4. **Scope Creep Guard**: All new R15-2 evidence logs were written with sensitive tokens and example emails redacted before saving to disk.

## Proof and Validation Results

1. **Gitleaks Git Scan on Range `6b9effc^..HEAD`**:
   - Command: `gitleaks git --log-opts="6b9effc^..HEAD" --verbose`
   - Result: 0 findings, `EXIT:0` (5 commits scanned, 0 leaks found). Evidence in `docs/evidence/raw/r15-2-gitleaks-git-range.txt`.

2. **Control Test (Temporary File Outside docs/evidence/raw/)**:
   - Temporary file `tests/control-fake-key.txt` created with fake AWS access key.
   - Run: `gitleaks dir tests/control-fake-key.txt --redact --verbose`
   - Result: Gitleaks flagged the secret (`RuleID: aws-access-token`, `return code: 1`).
   - Cleanup: File deleted successfully (`File exists after cleanup: False`).
   - Log: `docs/evidence/raw/r15-2-control-test.txt`.

3. **Unit Test (`tests/unit/gitleaks-config.test.ts`)**:
   - Parses `.gitleaks.toml` and validates `useDefault = true`, exactly one `[[allowlists]]` entry, and that its regex strictly targets `^docs/evidence/raw/.*\.txt$`.
   - FAIL-BEFORE (5 runs): `EXIT:1` each time (`docs/evidence/raw/r15-2-unit-fail-before-1.txt` ... `5.txt`).
   - PASS-AFTER (5 runs): `EXIT:0` each time (`docs/evidence/raw/r15-2-unit-pass-after-1.txt` ... `5.txt`).

4. **R12-J Hygiene Verification (`tests/unit/secret-hygiene.test.ts`)**:
   - 4/4 tests passed (`EXIT:0`, `docs/evidence/raw/r15-2-secret-hygiene-r12j.txt`).

5. **Full Clean-Environment Unit Suite**:
   - CI credentials: `127.0.0.1:54329`, `postgres_password`, `trillionskill_test`.
   - Results: 561 tests, 130 suites, 561 passed, 0 failed, 0 cancelled, `EXIT:0`.
   - Evidence in `docs/evidence/raw/r15-2-full-unit-clean-env.txt`.

6. **Assertion Audit**:
   - Removed assertions: 0 (`EXIT:0`, `docs/evidence/raw/r15-2-assertion-audit.txt`).

7. **Code Quality**:
   - Lint (`npm run lint`): `EXIT:0` (`docs/evidence/raw/r15-2-lint.txt`).
   - TypeScript (`npx tsc --noEmit`): `EXIT:0` (`docs/evidence/raw/r15-2-tsc.txt`).

## Evidence Files

- `docs/evidence/raw/r15-2-gitleaks-git-range.txt`
- `docs/evidence/raw/r15-2-control-test.txt`
- `docs/evidence/raw/r15-2-unit-fail-before-1.txt`
- `docs/evidence/raw/r15-2-unit-fail-before-2.txt`
- `docs/evidence/raw/r15-2-unit-fail-before-3.txt`
- `docs/evidence/raw/r15-2-unit-fail-before-4.txt`
- `docs/evidence/raw/r15-2-unit-fail-before-5.txt`
- `docs/evidence/raw/r15-2-unit-pass-after-1.txt`
- `docs/evidence/raw/r15-2-unit-pass-after-2.txt`
- `docs/evidence/raw/r15-2-unit-pass-after-3.txt`
- `docs/evidence/raw/r15-2-unit-pass-after-4.txt`
- `docs/evidence/raw/r15-2-unit-pass-after-5.txt`
- `docs/evidence/raw/r15-2-secret-hygiene-r12j.txt`
- `docs/evidence/raw/r15-2-full-unit-clean-env.txt`
- `docs/evidence/raw/r15-2-db-local-restore.txt`
- `docs/evidence/raw/r15-2-assertion-audit.txt`
- `docs/evidence/raw/r15-2-lint.txt`
- `docs/evidence/raw/r15-2-tsc.txt`
