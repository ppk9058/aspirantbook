# R12 State Tracker

HANDOFF: none

| step | tier | class | status | commit | evidence log | next action | notes |
|------|------|-------|--------|--------|--------------|-------------|-------|
| R12-0 | — | CHEAP | DONE | 99df8f5 | `docs/evidence/r12-audit.md` | — | 16 console.log, 35 localhost, 1 supabase.co, no gitleaks CI, no render.yaml, no Sentry, no LICENSE, 0 files >1MB |
| R12-B | T1 | OPUS | DONE | 3968743 | `docs/evidence/raw/r12-b-*.txt` | — | 9 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, no URLs printed |
| R12-A | T1 | OPUS | DONE | 38a85ce | `docs/evidence/raw/r12-a-*.txt` | — | 10 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, runbook updated |
| R12-C | T1 | OPUS | DONE | 0cc72dc | `docs/evidence/raw/r12-c-*.txt` | — | 14 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, no supabase.co, dynamic S3/Sentry, Turnstile allowed |
| R12-L | T1 | OPUS | DONE | 1576dd7 | `docs/evidence/raw/r12-l-*.txt` | — | 11 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, paymentMode in health, mismatch guards |
| R12-K | T1 | OPUS | DONE | f042eff | `docs/evidence/raw/r12-k-*.txt` | — | 7 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, dry-run default, 30d recovery, payments untouched |
| R12-D | T1 | CHEAP | IN_PROGRESS | da1f7c1 | — | Add scripts/ops/staging-smoke.sh + run against local prod build | Takes BASE_URL from env, PASS/FAIL per check |
| R12-F | T1 | CHEAP | TODO | — | — | Read SPEC R12-F; add cron route + test | Secret via env, rejects missing/wrong secret |
| R12-G | T1 | CHEAP | TODO | — | — | Read SPEC R12-G; extend `scripts/ops/` with backup/restore scripts + rollback runbook | Local DB + local target test |
| R12-E | T1 | CHEAP | TODO | — | — | Read SPEC R12-E; add `@sentry/nextjs` optional by env, scrub PII | Zero network calls without DSN |
| R12-H | T2 | CHEAP | TODO | — | — | Read SPEC R12-H; run `npm audit fix`, report before/after | No major bumps |
| R12-I | T2 | CHEAP | TODO | — | — | Read SPEC R12-I; replace console.log, close localhost fallbacks, add LICENSE | Grep-based guard tests |
| R12-J | T2 | CHEAP | TODO | — | — | Read SPEC R12-J; confirm .gitleaksignore, add CI job, replace literal fallbacks | Counts by rule, never values |
| R12-M | T3 | CHEAP | TODO | — | — | Read SPEC R12-M; write mobile test proposals, verify eas.json, data-safety draft | Do NOT edit mobile tests |
| R12-Z | — | CHEAP | TODO | — | — | Read SPEC R12-Z; fresh clone final verification, tag `r12-ready-2026-11-01` | Only if all steps DONE |
