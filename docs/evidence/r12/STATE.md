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
| R12-D | T1 | CHEAP | DONE | ff1beac | `docs/evidence/raw/r12-d-*.txt`, `docs/evidence/raw/staging-smoke-local.txt` | — | 5 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, staging smoke script PASS against local server |
| R12-F | T1 | CHEAP | DONE | ea5b528 | `docs/evidence/raw/r12-f-*.txt` | — | 6 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, render.yaml 5m cron, disabled GHA stub, auth & pending row tested |
| R12-G | T1 | CHEAP | DONE | e074809 | `docs/evidence/raw/r12-g-*.txt` | — | 5 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, db-backup-to-s3.sh, rollback.md, e2e restore 75/75 tables 4186 rows PASS |
| R12-E | T1 | CHEAP | DONE | 6a90c28 | `docs/evidence/raw/r12-e-*.txt` | — | 8 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, no-op without DSN, PII scrubber, build 162 routes (103 kB) |

| R12-H | T2 | CHEAP | DONE | a7f9228 | `docs/evidence/raw/r12-h-*.txt` | — | npm audit non-breaking fix, next-auth pinned, brace-expansion override, 5× unit suite EXIT:0, tsc 0, lint 0, build 162 routes |


| R12-I | T2 | CHEAP | DONE | 6839cdb | `docs/evidence/raw/r12-i-*.txt` | — | 5 tests, fail-before 5×EXIT:1, pass-after 5×EXIT:0, console.log replaced, authUrl fail-closed, LICENSE added, large files audited |


| R12-J | T2 | CHEAP | DONE | 2b7ea6d | `docs/evidence/raw/r12-j-*.txt` | — | 4 tests, pass-after 5×EXIT:0, .gitleaksignore <=12 chars, gitleaks CI job, literal fallbacks removed, findings by rule reported |


| R12-M | T3 | CHEAP | DONE | 49e9d70 | `docs/evidence/raw/r12-m-*.txt` | — | 38 files: 34 PASS, 3 assertion-FAIL, 1 HANGING; 4th file fake-data-scan; release EXIT:0; mobile tsc EXIT:0; no mobile test edits |

| R12-V | — | CHEAP | IN_PROGRESS | 49e9d70 | — | Retro-verify large files, J fail-before, test-count arithmetic | — |

| R12-Z | — | CHEAP | TODO | — | — | Read SPEC R12-Z; fresh clone final verification, tag `r12-ready-2026-11-01` | Only if all steps DONE |
