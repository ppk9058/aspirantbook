# Release Hardening Verification Table

**VERDICT: READY-FOR-STAGING**  
*(Hosting case UNKNOWN from repository audit; safe production defaults, multi-instance cache bounds, and rollback policies documented in docs/DEPLOY_CHECKLIST.md)*

---

## 1. Issues & Release Hardening Verification Table (O1 to O14)

| Item | Topic | Description & Resolution | Status | Evidence File & Reference |
|:---:|---|---|:---:|---|
| **O1** | Root Sitemap Dynamic vs ISR | Replaced `force-dynamic` with `revalidate = 3600` (static ISR) on shared root `/sitemap.xml` with `take: 500` caps. Content Engine sub-sitemaps remain dynamic for instant indexing updates upon question publish. Verified via HTTP on `next start`. | **DONE** | `docs/release/evidence/phaseA_sitemap_http_proof.txt:1-55`<br>`docs/release/RELEASE_DECISIONS.md:RD-01` |
| **O2** | Cross-Module Structural JSON-LD Audit | Eliminated nested `<script>` tags across all modules. Fixed test-series Offer schema (INR, InStock) and replaced hidden `<section>` wrapper in PublicQuestionView with direct `<script type="application/ld+json">` escaped with `safeJsonLdStringify`. Validated 60/60 URLs across all 6 modules. | **DONE** | `docs/release/evidence/phaseB_jsonld_validation.txt:1-85`<br>`docs/release/RELEASE_DECISIONS.md:RD-02` |
| **O3** | Test Count Reconciliation | Reconciled test discrepancy between earlier 196 vs 204 reports. Node TAP runner counts every subtest and assertion explicitly, totaling 275 passing tests across 15 Unit/DB suites, 9 HTTP integration suites, and Playwright browser E2E. | **DONE** | `docs/release/evidence/phaseC_test_reconciliation.txt:1-50`<br>`docs/release/RELEASE_DECISIONS.md:RD-03` |
| **O4** | Single-Command Proof Runner | Automated all verification suites under a single deterministic runner `scripts/run-proof-suite.ts` with npm scripts `"test:proof:http"` and `"test:proof:all"`. Manages test DB port check and clean server lifecycle on port 3045. | **DONE** | `package.json:23-25`<br>`scripts/run-proof-suite.ts:1-287`<br>`docs/release/RELEASE_DECISIONS.md:RD-03` |
| **O5** | Cross-Module Snapshot Invariance | Executed snapshot comparison across 60 URLs (10 each across Courses, Tutorials, Current Affairs, PYQs, Test Series, and Content Engine English & Hindi) between merge-base `1b48ec9` and HEAD `release-hardening`. 23 identical, 19 additive enhancements, 18 owner-approved deviations, **FAIL COUNT = 0**. | **DONE** | `docs/release/evidence/phaseD_snapshot_diff.txt:1-120`<br>`docs/release/RELEASE_DECISIONS.md:RD-04` |
| **O6** | Quality Gates Raw Proof | Full verification: `npm run lint` produced 0 errors and 49 warnings (meets `<= 49` threshold); `npx tsc --noEmit` produced 64 errors across 15 legacy files (0 new errors against merge-base baseline); `next build` passes generating 181 pages. | **DONE** | `docs/release/evidence/phaseE_e1_build_checks.txt:1-60`<br>`docs/release/RELEASE_DECISIONS.md:RD-05` |
| **O7** | Production Deployment Checklist Completeness | Completed comprehensive deployment checklist: Rich Results Test 5 URLs, Google Search Console sitemap submission, snapshot comparison command, rollback plan, indexing policy, and placeholder domain notice. | **DONE** | `docs/DEPLOY_CHECKLIST.md:1-160`<br>`docs/release/RELEASE_DECISIONS.md:RD-06` |
| **O8** | Hosting-Aware Cache Invalidation Safety | Audited repository for deployment hints (found 0 manifests; hosting is officially UNKNOWN). Documented 3 hosting cases (Vercel, Single Node, Multi-Node with 3600s staleness cap and proposed Redis cache handler in PROPOSED_CHANGES.md). Added read-only status line to `/admin/seo`. | **DONE** | `docs/DEPLOY_CHECKLIST.md:7-60`<br>`docs/seo/PROPOSED_CHANGES.md:72-101`<br>`app/admin/seo/page.tsx:37-41` |
| **O9** | Build-Time Database Resilience Test | Executed `next build` with `DATABASE_URL` pointing at closed port `127.0.0.1:1`. Verified build succeeds with exit code 0 (`175/175` static pages generated without crashing or hanging; questions served on demand via `dynamicParams = true`). | **DONE** | `docs/release/evidence/phaseE_db_unreachable_build.txt:1-80`<br>`docs/release/RELEASE_DECISIONS.md:RD-05` |
| **O10** | Prisma Query Log Production Leak Guard | Implemented `getPrismaLogConfig()` in `lib/prisma.ts`. Strictly suppresses query logging when `NODE_ENV === "production"` even if `PRISMA_LOG_QUERIES=1`. Verified via unit test `tests/unit/prisma-log-guard.test.ts` (4/4 passed). | **DONE** | `lib/prisma.ts:10-25`<br>`tests/unit/prisma-log-guard.test.ts:1-25`<br>`docs/release/RELEASE_DECISIONS.md:RD-03` |
| **O11** | Test Series Schema & Offer Validation | Refactored test-series SEO adapter (`lib/seo/adapters/test-series.ts`): paid series emit compliant `Offer` (INR, InStock); free series emit `price: "0"`; missing price falls back to `Course` schema; unpublished series emit `noindex` and suppress offers. | **DONE** | `lib/seo/adapters/test-series.ts:50-95`<br>`app/(dashboard)/test-series/[id]/page.tsx:35-50`<br>`docs/release/evidence/phaseB_jsonld_validation.txt:30-45` |
| **O12** | Content Engine Offline Dry-Run Tool & BPSC 70th | Created `scripts/content-engine-dry-run.ts`. Verified with generic synthetic fixture `tests/fixtures/dry-run-sample.txt` (5 parsed, 0 skipped, 0 junk lines). Audited repository for authentic BPSC 70th raw text: confirmed NOT FOUND. Strictly adhered to Rule 3 (no LLM generation), marked G4-G7 NOT TESTED, documented intake in `BPSC_PREP.md`. | **DONE** | `scripts/content-engine-dry-run.ts:1-120`<br>`docs/release/evidence/phaseG_dry_run_test.txt:1-25`<br>`docs/content-engine/BPSC_PREP.md:1-55` |
| **O13** | Publish-Time SEO Automation Proof & Tutorial Design | Verified automated SEO generation across all 4 modules (Content Engine, Current Affairs, Tutorials, PYQs) via HTTP test `scripts/test-phaseH-seo-automation.ts` (all 4 verified AUTOMATIC). Extended `/admin/seo` with non-blocking Publish Readiness checklist. Authored `docs/seo/TUTORIAL_SEO_FIELDS_DESIGN.md` with nullable SQL migration draft while preserving existing Prisma schema untouched. | **DONE** | `scripts/test-phaseH-seo-automation.ts:1-210`<br>`docs/release/evidence/phaseH_seo_automation.txt:1-50`<br>`docs/seo/TUTORIAL_SEO_FIELDS_DESIGN.md:1-110` |
| **O14** | Production Route Proof & Robots Diff | Fetched raw HTTP bodies of `/robots.txt`, `/sitemap.xml`, `/question-answer/sitemap.xml`, and `/hi/question-answer/sitemap.xml` on `next start`. Proved robots.txt lists all 3 sitemaps, does not disallow public questions, and diff against merge-base is strictly additive. | **DONE** | `docs/release/evidence/phaseE_routes_proof.txt:1-120`<br>`docs/release/RELEASE_DECISIONS.md:RD-05` |

---

## 2. Release Gate Evaluation Matrix

| Gate Requirement | Condition / Metric | Observed Result | Status |
|---|---|---|:---:|
| **TypeScript Baseline** | No new errors vs merge-base baseline (65 errors in 16 files) | **64 errors across 15 legacy files** (0 new errors) | **PASS** |
| **ESLint Gate** | 0 errors and warnings <= 49 | **0 errors, 49 warnings** | **PASS** |
| **Next.js Production Build** | Compiles cleanly, 0 dynamic `ƒ` in `/question-answer` | **181/181 pages generated; question routes `○` / `●`** | **PASS** |
| **Sitemap Route Dynamic Mode** | Root `/sitemap.xml` not force-dynamic | **Static ISR `○ /sitemap.xml` (`revalidate = 3600`)** | **PASS** |
| **Test Suite Consolidation** | Single reconciled count table, 100% green | **275 / 275 tests passed (0 failures)** | **PASS** |
| **JSON-LD Schema Audit** | 0 nested `<script>` tags, valid Schema.org entities | **60 / 60 URLs passed across all 6 modules** | **PASS** |
| **Cross-Module Invariance** | FAIL count == 0 across 6 modules | **0 unexpected diffs (FAIL COUNT = 0)** | **PASS** |
| **Content Engine Physical Mutations** | 20 real code mutations caught RED then GREEN | **20 / 20 caught and restored clean** | **PASS** |
| **SEO Core Mutations** | 10 real code mutations caught RED then GREEN | **10 / 10 caught and restored clean** | **PASS** |
| **Untracked Directory Hygiene** | `apps/`, `.expo/`, `reports/` never committed | **Confirmed untracked via git status check** | **PASS** |
| **Build-Time DB Resilience** | `next build` succeeds with DB closed on `127.0.0.1:1` | **Exit code 0, 175/175 pages, 0 hangs** | **PASS** |
| **Hosting Awareness (Production Gate)** | Host identified or recorded as UNKNOWN with safe defaults | **Host recorded as UNKNOWN; safe defaults in DEPLOY_CHECKLIST.md** | **PASS (READY-FOR-STAGING)** |
