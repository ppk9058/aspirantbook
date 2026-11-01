# R14-1 Final Report: CI database target resolution

## Outcome

- Status: DONE
- Fix commit: `5a3100da8270613c814c42f482bb24606089d3e6`
- Local readiness tag: `r14-ready-2026-11-01`
- Branch: `feat/launch-blockers`
- Pushed: No

## Problem and root cause

`tests/unit/backup-and-rollback.test.ts` supplied a locally hardcoded database target directly to the backup script. That ignored the CI service credentials, causing `pg_dump` authentication to fail in a CI-shaped environment.

## Change made

The test now resolves its target in this order:

1. `DATABASE_URL`
2. `DIRECT_URL`
3. The canonical local fallback

The selected URL is sanitized for `pg_dump` by removing driver-only query and fragment parameters. Safety guards remain and fail without exposing the selected target:

- Host must be `127.0.0.1` or `localhost`.
- Database name must end in `_test`.

No existing assertion or test declaration was removed. Additional leak-detection assertions were added to reject a connection-string prefix and the resolved password.

## Proof results

- CI-shaped setup: migrations and seed succeeded; `EXIT:0`.
- Fail-before, unmodified test, five consecutive runs: `EXIT:1` each time.
- Pass-after, fixed test, five consecutive runs: `EXIT:0` each time.
- Full clean-environment unit suite: `tests=558`, `pass=558`, `fail=0`, `cancelled=0`, `EXIT:0`.
- Canonical local flow without `DATABASE_URL`: `EXIT:0`.
- Assertion audit: no removed `assert`, `expect`, `it(`, or `test(` lines; `EXIT:0`.
- Lint: `EXIT:0`.
- TypeScript: `EXIT:0`.

## Evidence files

- `docs/evidence/raw/r14-1-db-container-start.txt`
- `docs/evidence/raw/r14-1-db-migrate.txt`
- `docs/evidence/raw/r14-1-db-seed.txt`
- `docs/evidence/raw/r14-1-db-migrate-status.txt`
- `docs/evidence/raw/r14-1-fail-before-1.txt`
- `docs/evidence/raw/r14-1-fail-before-2.txt`
- `docs/evidence/raw/r14-1-fail-before-3.txt`
- `docs/evidence/raw/r14-1-fail-before-4.txt`
- `docs/evidence/raw/r14-1-fail-before-5.txt`
- `docs/evidence/raw/r14-1-pass-after-1.txt`
- `docs/evidence/raw/r14-1-pass-after-2.txt`
- `docs/evidence/raw/r14-1-pass-after-3.txt`
- `docs/evidence/raw/r14-1-pass-after-4.txt`
- `docs/evidence/raw/r14-1-pass-after-5.txt`
- `docs/evidence/raw/r14-1-full-unit-clean-env.txt`
- `docs/evidence/raw/r14-1-db-local-restore.txt`
- `docs/evidence/raw/r14-1-local-canonical.txt`
- `docs/evidence/raw/r14-1-lint.txt`
- `docs/evidence/raw/r14-1-tsc.txt`
- `docs/evidence/raw/r14-1-assertion-audit.txt`
