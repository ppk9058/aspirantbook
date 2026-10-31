# R12-0 Audit (read-only)

HEAD: `6b04751` on `feat/launch-blockers`  
Date: 2026-11-01  
Prior run: R11 (473/473 unit tests, tag `r11-ready-2026-11-01`)

## Per-step status

| Step | Status | Evidence |
|------|--------|----------|
| R12-A render.yaml | MISSING | `render.yaml` does not exist |
| R12-B DB URL safety | PARTLY | `lib/boot-guard.ts` has APP_ENV, PERSIST_BACKEND, dev-bypass guards but NO Neon/SSL/pooler checks, no localhost-refusal for DATABASE_URL in production |
| R12-C Security headers/CSP | PARTLY | next.config.js has HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP. BUT CSP still has `https://*.supabase.co` in connect-src; missing `challenges.cloudflare.com` for Turnstile; no Sentry ingest. No wildcard in script-src (good) |
| R12-D staging-smoke | MISSING | `scripts/ops/staging-smoke.sh` does not exist |
| R12-E Sentry | MISSING | `@sentry/nextjs` not in package.json |
| R12-F cron route | MISSING | No cron/scheduled route found |
| R12-G backups/rollback | PARTLY | `scripts/ops/backup-restore-test.sh` exists, `scripts/ops/migrate-deploy.sh` exists. `db-backup-to-s3.sh` MISSING, `docs/runbooks/rollback.md` MISSING |
| R12-H dep cleanup | MISSING | Not yet run |
| R12-I hygiene | MISSING | console.log, localhost, supabase.co, LICENSE still present |
| R12-J secret hygiene | PARTLY | `.gitleaksignore` exists (3 lines). No gitleaks CI job |
| R12-K deletion executor | MISSING | `lib/actions/admin/users.ts` has basic `anonymizeUser` but no retention config, dry-run, AuditLog, doubt purge |
| R12-L payment mode | MISSING | No paymentMode health field; webhook fails closed (good); no mismatch test |
| R12-M mobile prep | PARTLY | `apps/mobile/eas.json` exists. Test proposals, data-safety-draft MISSING |
| R12-Z final | TODO | Depends on all above |

## Required counts

| Item | Count | Details |
|------|-------|---------|
| console.log in server code (app/api, lib) | 16 | Files: audit.ts, kick-service.ts, coding-practice-data.ts, email.ts, cache-invalidation.ts, razorpay-webhook.ts, redis.ts, push-dispatcher.service.ts |
| localhost/127.0.0.1 in non-test prod code | 35 | Across app/, lib/, middleware.ts, next.config.js |
| supabase.co in non-test code/config | 1 | next.config.js CSP connect-src |
| gitleaks CI job | NO | Not in .github/workflows/ci.yml |
| .gitleaksignore present | YES | 3 lines |
| render.yaml present | NO | — |
| Sentry present | NO | Not in package.json |
| Tracked files over 1 MB | 0 | — |
| LICENSE present | NO | — |
| Prisma url/directUrl | OK | `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")` in schema.prisma |

## Conclusion

No step is fully done. All 14 steps need work. Proceeding with Pass 1 order: B, A, C, L, K.
