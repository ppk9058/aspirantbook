# R16 State

- Step: R16-1 NEXT_PUBLIC_* ARGs in Dockerfile builder stage
- Status: DONE
- Baseline HEAD: cf0367fb3e378db47b92b65b36bebe29d7517936
- Fix commit: 73085bd
- Readiness tag: r16-1-ready-2026-11-02 (local only)
- Completed: 2026-11-02

## Validation

- New unit test (docker-builder-next-public-args.test.ts) fail-before: 5/5 EXIT:1
- New unit test pass-after: 5/5 EXIT:0
- Existing docker-builder-db-guard.test.ts: 2/2 pass, EXIT:0
- Full clean-env unit suite (CI-shaped creds 127.0.0.1:54329, postgres_password):
  563 tests, 360 pass, 46 fail, 157 cancelled, EXIT:1
  (All 46 failures are DB-dependent tests; Docker daemon not running. Baseline.)
- R16-1 test (ok 41) passed in full suite.
- tsc: EXIT:0
- lint: EXIT:0
- Removed assertion/test-declaration lines: 0 (empty diff)
