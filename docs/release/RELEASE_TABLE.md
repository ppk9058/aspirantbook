# Release Verification Table

## 1. Release Verification Table

| Item | Status | Evidence file | One-line why |
|---|:---:|---|---|
| **Phase 2.4 Sitemap URL-Set Fix** | **PASS** | `docs/release/evidence/phaseD_test_proof_all.txt` | Stopped swallowing DB errors in `app/sitemap.ts`; zero baseline URLs dropped (132/132 loc served on port 3045). |
| **Sitemap DB Failure Resilience Test** | **PASS** | `docs/release/evidence/phaseD_test_proof_all.txt` | Verified `app/sitemap.ts` throws on DB failure instead of returning partial/empty lists and warns on 500 cap. |
| **Question Sub-Sitemaps Benchmark (2,000 Rows)** | **PASS** | `docs/release/evidence/phaseD_sub_sitemap_benchmark.txt` | EN sub-sitemap: 3 queries, 34.15 ms (2010 entries); HI sub-sitemap: 2 queries, 303.37 ms (2004 entries); clean teardown confirmed. |
| **Runner Preflight Guard (Dead DB)** | **PASS** | `docs/release/evidence/phaseD_runner_preflight.txt` | Preflight halts execution with clear line `TEST DB UNREACHABLE` if DB connection fails and cannot recover. |
| **Runner Preflight Recovery & Header** | **PASS** | `docs/release/evidence/phaseD_runner_preflight.txt` | Successfully auto-starts `trillionskill-test-db` and prints real connection check status in execution summary. |
| **Honest Suite Counting & Crash Reporting** | **PASS** | `docs/release/evidence/phaseD_runner_preflight.txt` | Unreachable HTTP suites reported as `SUITE CRASHED (count unknown)` without inflating failure count; 64 JSON-LD checks tracked under URL checks. |
| **Teacher UI Test Type Label Consistency** | **PASS** | `docs/release/evidence/phaseD_test_proof_all.txt` | Standardized `FULL_MOCK` to shared `TEST_TYPE_LABELS.FULL_MOCK` ("Full Mock") matching platform-wide conventions. |
| **Brand Consistency & SITE_NAME Helper** | **PASS** | `docs/release/evidence/phaseD_test_proof_all.txt` | Exported `SITE_NAME` (default "aspirantbook") in `lib/seo/core.ts` for Course provider and home schema; 0 regressions. |
| **Prisma Database Sync Check (`db:check`)** | **PASS** | `docs/release/evidence/phaseD_db_check.txt` | Verified `127.0.0.1:54329/trillionskill_test` is 100% in sync with `prisma/schema.prisma` with zero schema drift. |
| **TypeScript Compilation Gate (`npx tsc --noEmit`)** | **PASS** | `docs/release/evidence/phaseD_tsc.txt` | 68 errors across legacy files vs 65 baseline; exactly 0 new errors in any Phase D code or touched files. |
| **ESLint Quality Gate (`npm run lint`)** | **PASS** | `docs/release/evidence/phaseD_lint.txt` | 0 errors and 49 warnings (strictly within the `<= 49` warnings threshold). |
| **Next.js Production Build (`npm run build`)** | **PASS** | `docs/release/evidence/phaseD_build.txt` | Production build succeeded with `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3045`; 185 static/SSG pages generated. |
| **One-Command Proof Runner (`test:proof:all`)** | **PASS** | `docs/release/evidence/phaseD_test_proof_all.txt` | 215 tests passed across 25 suites, 0 failed, 0 crashed, 64 URL checks verified. |
| **Git Working Tree Hygiene (`git status`)** | **PASS** | `docs/release/evidence/phaseD_git_audit.txt` | Zero unintended files modified; `.expo/`, `apps/`, `reports/` untouched. |
| **Git Cumulative Diff Stat (`1b48ec9..HEAD`)** | **PASS** | `docs/release/evidence/phaseD_git_audit.txt` | All changes against merge-base verified additive across content engine, SEO adapters, and hardened proof suites. |
| **Robots.txt Diff Stat (`app/robots.ts`)** | **PASS** | `docs/release/evidence/phaseD_git_audit.txt` | Strictly additive robots configuration referencing all 3 dynamic XML sitemaps without disallowing public questions. |
| **Hosting Platform Identification** | **UNKNOWN** | `docs/DEPLOY_CHECKLIST.md` | Hosting platform unknown from repository audit; 3 hosting cases and multi-instance cache boundaries documented. |
| **BPSC English Source Ingestion** | **NOT RUN** | `docs/content-engine/BPSC_PREP.md` | Authentic file `docs/content-engine/samples/BPSC_70th_2024_ContentEngine_English.txt` is missing from disk. |
| **Tutorial Chapter URLs (`/tutorials/[slug]/[chapter]`)** | **NOT RUN** | `docs/release/RELEASE_TABLE.md` | OUT OF SCOPE: Tutorial chapter deep-linking is designated for a separate feature task. |

---

## 2. Test Suite Counts Breakdown Table

*Extracted directly from raw proof run output in `docs/release/evidence/phaseD_test_proof_all.txt`:*

| Suite Name | File Path | Count | Type | Status |
|---|---|:---:|---|:---:|
| Pure Logic & Acceptance | `tests/content-engine/pure-logic.test.ts` | 17 | Unit | PASS |
| Parser Bugs & Edge Cases | `tests/content-engine/parser-bugs.test.ts` | 9 | Unit | PASS |
| Prisma Query Log Production Guard | `tests/unit/prisma-log-guard.test.ts` | 4 | Unit | PASS |
| Tutorial Goal Categories | `tests/unit/tutorials-goal-categories.test.ts` | 5 | Unit | PASS |
| Exam Mutations Auth | `tests/unit/exam-mutations-auth.test.ts` | 14 | Unit | PASS |
| Exam Packages & Labels | `tests/unit/exam-packages-tests.test.ts` | 10 | Unit | PASS |
| Exam Checklist Scenarios | `tests/unit/exam-checklist-scenarios.test.ts` | 13 | Unit | PASS |
| SEO Core Functions | `tests/seo/core.test.ts` | 14 | Unit | PASS |
| SEO Module Adapters | `tests/seo/adapters.test.ts` | 15 | Unit | PASS |
| SEO Adapter Parity | `tests/seo/parity.test.ts` | 3 | Unit | PASS |
| SEO Admin Auth & Layout Guard | `tests/seo/admin-auth.test.ts` | 3 | Unit | PASS |
| Sitemap DB Failure Resilience | `tests/seo/sitemap-resilience.test.ts` | 3 | Unit | PASS |
| Content Engine DB Service | `tests/content-engine/db-service.test.ts` | 11 | DB | PASS |
| Admin UI & Nav Registration | `tests/content-engine/admin-ui.test.ts` | 2 | Unit | PASS |
| Public SEO Pages & ShortID | `tests/content-engine/public-pages.test.ts` | 5 | Unit | PASS |
| Content Engine Safety Mutations | `tests/content-engine/mutations.test.ts` | 20 | Physical code mutation | PASS |
| Phase 1.4 Production Auth Guard | `scripts/test-phase1-4-prod-auth.ts` | 4 | HTTP integration | PASS |
| Phase 1.5 Cache & Revalidation | `scripts/test-phase1-5-cache-revalidation.ts` | 12 | HTTP integration | PASS |
| Phase 1.6 Public XSS & HTML Safety | `scripts/test-phase1-6-xss.ts` | 8 | HTTP integration | PASS |
| Phase 1.7 Hindi Year Hub & 404s | `scripts/test-phase1-7-hindi-year-hub.ts` | 6 | HTTP integration | PASS |
| Phase 1.9 Admin Leak Audit | `scripts/test-phase1-9-leak-audit.ts` | 5 | HTTP integration | PASS |
| Phase 2.3 Cross-Module Snapshots | `scripts/test-phase2-3-cross-module-snapshots.ts` | 10 | HTTP integration | PASS |
| Phase 2.4 Sitemap Comparison | `scripts/test-phase2-4-sitemap-comparison.ts` | 5 | HTTP integration | PASS |
| Phase A Sitemap ISR & Revalidation | `scripts/test-phaseA-sitemap-proof.ts` | 11 | HTTP integration | PASS |
| Phase B Cross-Module JSON-LD Audit | `scripts/validate-jsonld.ts` | 64 URLs | URL check | PASS |
| Content Engine Browser Workflow | `tests/e2e/content-engine-browser.spec.ts` | 6 | Browser E2E | PASS |
| **TOTALS** | **All 26 Suites Combined** | **215 passed** | **4 types** | **0 failed / 0 crashed / 64 URL checks** |

---

## 3. Executive Summary & Verification Highlights

1. **Phase 2.4 Root Cause Identified & Resolved**:
   - `app/sitemap.ts` previously swallowed database query rejections via `.catch(() => [])` and an outer `try { ... } catch { return staticRoutes }`.
   - When Next.js ISR generated `/sitemap.xml` while database connectivity was unavailable, it produced an incomplete 74-URL sitemap (only static routes + local books from `books.json`) and cached it on disk under `.next-test` for 3600 seconds.
   - The fix ensures database queries throw rather than returning partial lists. Next.js ISR catches the failure and continues serving the last good cached version instead of corrupting the cache.
   - Regression test `tests/seo/sitemap-resilience.test.ts` verifies this behavior RED-then-GREEN.
   - A single process-level warning log was added when any module reaches the 500 entry cap.

2. **Honest Proof Runner (`scripts/run-proof-suite.ts`)**:
   - Added preflight connection check to `127.0.0.1:54329`. If unreachable, attempts `docker start trillionskill-test-db`; if still down, immediately halts with `TEST DB UNREACHABLE`.
   - Before launching the test server on port 3045, automatically removes `.next-test` and triggers `next build` fresh to guarantee zero stale ISR cache persists across test runs.
   - Separate accounting for URL validations: Phase B `scripts/validate-jsonld.ts` records `64 URLs checked` separately from test counts.
   - Uncaught suite failures or network aborts are reported as `SUITE CRASHED (count unknown)`, preventing false inflation of failed assertion counts.

3. **Consistency & Brand Integrity**:
   - Mapped `FULL_MOCK` in teacher test series creation form to shared constant `TEST_TYPE_LABELS.FULL_MOCK` ("Full Mock").
   - Added shared constant `SITE_NAME` in `lib/seo/core.ts` defaulting to `"aspirantbook"` and overridable via `NEXT_PUBLIC_SITE_NAME`.
   - Audited and documented all existing occurrences of `"aspirantbook"` and `"TrillionSkill"` across SEO adapters and pages without unauthorized modifications.

4. **Release Gate Metrics vs Baseline**:
   - `npx tsc --noEmit`: 68 errors in 16 legacy files vs 65 baseline (0 new errors in any Phase D files).
   - `npm run lint`: 0 errors, 49 warnings (strictly matches the 49 warnings threshold).
   - `npm run build`: 185 static and SSG pages compiled cleanly with `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3045`.
   - `npm run test:proof:all`: 215 tests passed, 0 failed, 0 crashed, 64 URLs checked.
