# R15-1 Final Report: Dockerfile builder stage database placeholder fix

## Outcome

- Status: DONE
- Fix commit: `1fcbbf439e2b515efedbf7957ccf33722967632c`
- Local readiness tag: `r15-ready-2026-11-01`
- Branch: `feat/launch-blockers`
- Pushed: No

## Problem and Root Cause

The CI Docker job (`docker-build` in `.github/workflows/ci.yml`) failed at line 33 of `Dockerfile`:
```dockerfile
RUN npx prisma generate && npm run build
```
The `builder` stage set `DATABASE_URL` and `DIRECT_URL` to:
`postgresql://placeholder:placeholder@127.0.0.1:54329/placeholder_build_test`.

During `npm run build`, Next.js evaluated `app/layout.tsx` which imports `lib/boot-guard.ts`. Because `NODE_ENV=production`, the boot guard (`validateBootSecurity`) executed and strictly refused local host targets (`127.0.0.1` and `localhost`), aborting the build with:
`[CRITICAL SECURITY REFUSAL AT BOOT] DATABASE_URL points at a local host or is unparseable in production. Production must use a remote database.`

## Fix Implemented

Changed the `builder` stage environment variables in `Dockerfile` to syntactically valid non-local placeholder URLs that satisfy all boot security checks:
```dockerfile
ENV DATABASE_URL="postgresql://placeholder:placeholder@db.build-placeholder.invalid:5432/placeholder_build_test?sslmode=require"
ENV DIRECT_URL="postgresql://placeholder:placeholder@db.build-placeholder.invalid:5432/placeholder_build_test?sslmode=require"
```

Safety and Isolation Confirmations:
1. **No Real Credentials**: `db.build-placeholder.invalid` uses the RFC 2606 reserved `.invalid` TLD and dummy credentials.
2. **Runner Isolation**: The `runner` stage begins `FROM base AS runner` and does not inherit `DATABASE_URL` or `DIRECT_URL` from the builder stage. Real environment variables supplied at container runtime override and supply production values.
3. **No Guard Weakening**: `lib/boot-guard.ts` was not modified. Production boot security rules still strictly reject local hosts (`127.0.0.1`, `localhost`), require `sslmode=require`, require `DIRECT_URL`, and require `pgbouncer=true` for pooled Neon connections.

## SecretsUsedInArgOrEnv Warning Report

During `docker build`, BuildKit issues the following warning on line 30 of `Dockerfile`:
```
 1 warning found (use docker --debug to expand):
 - SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ENV "AUTH_SECRET") (line 30)
```
- **Line**: `ENV AUTH_SECRET="build_dummy_auth_secret_placeholder"`
- **Reason**: BuildKit linter inspects environment variable names. Variables matching sensitive patterns (`AUTH_SECRET`, `PASSWORD`, `TOKEN`) trigger `SecretsUsedInArgOrEnv` because values defined in `ENV` are stored in image layer metadata.
- **Action**: In accordance with the task scope note, this warning is reported only; line 30 was not modified.

## Proof and Validation Results

1. **Exact CI Docker Build**:
   - Command: `docker build -t trillionskill:ci -f Dockerfile .`
   - FAIL-BEFORE: `EXIT:1` with `[CRITICAL SECURITY REFUSAL AT BOOT] DATABASE_URL points at a local host or is unparseable in production.`
   - PASS-AFTER: `EXIT:0` (`naming to docker.io/library/trillionskill:ci done`).

2. **Unit Test (`tests/unit/docker-builder-db-guard.test.ts`)**:
   - Reads the builder-stage environment variables directly from `Dockerfile` and validates them against `validateBootSecurity()` in production mode. Also asserts runner stage does not bake in default database variables.
   - FAIL-BEFORE (5 consecutive runs): `EXIT:1` each time.
   - PASS-AFTER (5 consecutive runs): `EXIT:0` each time.

3. **Guard Refusal Verification**:
   - `tests/unit/db-url-neon-safety.test.ts`: 9/9 passed (`EXIT:0`), confirming `127.0.0.1` and `localhost` remain strictly refused in production.
   - `tests/unit/boot-guard-wiring.test.ts`: 5/5 passed (`EXIT:0`).

4. **Full Clean-Environment Unit Suite**:
   - CI-shaped credentials: `127.0.0.1:54329`, `postgres_password`, `trillionskill_test`.
   - Results: 560 tests, 129 suites, 560 passed, 0 failed, 0 cancelled, `EXIT:0`.

5. **Assertion Audit**:
   - Git diff audit for removed assertions (`assert`, `expect`, `it(`, `test(`) returned empty (`EXIT:0`).

6. **Code Quality**:
   - Lint (`npm run lint`): `EXIT:0`.
   - TypeScript (`npx tsc --noEmit`): `EXIT:0`.

## Evidence Files

- `docs/evidence/raw/r15-1-fail-before-docker-build.txt`
- `docs/evidence/raw/r15-1-pass-after-docker-build.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-fail-before-1.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-fail-before-2.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-fail-before-3.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-fail-before-4.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-fail-before-5.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-pass-after-1.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-pass-after-2.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-pass-after-3.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-pass-after-4.txt`
- `docs/evidence/raw/r15-1-docker-builder-env-pass-after-5.txt`
- `docs/evidence/raw/r15-1-guard-refuses-localhost.txt`
- `docs/evidence/raw/r15-1-boot-guard-wiring.txt`
- `docs/evidence/raw/r15-1-full-unit-clean-env.txt`
- `docs/evidence/raw/r15-1-db-local-restore.txt`
- `docs/evidence/raw/r15-1-assertion-audit.txt`
- `docs/evidence/raw/r15-1-lint.txt`
- `docs/evidence/raw/r15-1-tsc.txt`
