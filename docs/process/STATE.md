# R15-1 State

- Step: R15-1 Dockerfile builder-stage DATABASE_URL/DIRECT_URL placeholder fix
- Status: DONE
- Baseline HEAD: 6ac02c01fb2d3ebb94acf91add774d996f9e2477
- Fix commit: 1fcbbf439e2b515efedbf7957ccf33722967632c
- Readiness tag: r15-ready-2026-11-01 (local only)
- Completed: 2026-11-01

## Validation

- Docker build fail-before: exit `1` with `[CRITICAL SECURITY REFUSAL AT BOOT] DATABASE_URL points at a local host or is unparseable in production. Production must use a remote database.`
- Docker build pass-after: exit `0` (`trillionskill:ci` successfully built).
- Builder placeholder unit test fail-before: 5/5 runs exited `1`.
- Builder placeholder unit test pass-after: 5/5 runs exited `0`.
- Localhost refusal confirmation: `tests/unit/db-url-neon-safety.test.ts` (9/9 pass) and `tests/unit/boot-guard-wiring.test.ts` (5/5 pass) exit `0`.
- Full clean-environment unit suite: 560 tests, 560 passed, 0 failed, 0 cancelled, exit `0`.
- Lint and TypeScript: exit `0`.
- Removed assertion/test-declaration lines: none (exit `0`).

Final report: `docs/process/R15-1-FINAL-REPORT.md`.
