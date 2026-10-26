# Autonomous Overnight Run: Release Hardening Final Report

**Execution Branch:** `release-hardening` (branched from `proof-hardening` at commit `1139d78`)  
**Base Commit (Merge-Base):** `1b48ec917101cf90112d7983c6d240b29eba5025`  
**Execution Environment:** Isolated test database at `127.0.0.1:54329` (Docker test container) and test server on port `3045`.  
**Final Release Verdict:** **READY-FOR-STAGING**  
*(Hosting case is officially recorded as UNKNOWN from repository audit; full multi-instance caching bounds, single vs multi-node trade-offs, and rollback procedures are completely documented in `docs/DEPLOY_CHECKLIST.md`)*

---

## 1. Summary of Completed Phases (DONE)

### Phase A: Sitemap Architecture & Revalidation (O1)
- **Problem**: Root `app/sitemap.ts` previously had `export const dynamic = "force-dynamic"`, triggering database queries across all modules on every search engine crawl hit.
- **Resolution**:
  - Configured root `app/sitemap.ts` with `export const revalidate = 3600` (prerendering as static `○ /sitemap.xml`) with `take: 500` bounded queries and per-module try/catch fallbacks.
  - Content Engine sub-sitemaps (`/question-answer/sitemap.xml` and `/hi/question-answer/sitemap.xml`) remain dynamic (`force-dynamic`) to provide instant indexing consistency upon question publishing or unpublishing without crawling overhead on shared routes.
  - Calling `revalidateContentEngineRoutes()` invokes `safeRevalidatePath("/sitemap.xml")`.
  - HTTP integration test on `next start` proved publishing, unpublishing, and Hindi review updates correctly.
- **Evidence**: `docs/release/evidence/phaseA_sitemap_http_proof.txt` (Commit `fed4c0b`).

### Phase B: Cross-Module Structural JSON-LD Audit (O2, O11)
- **Problem**: Incomplete test-series Offer schemas triggered Google Search Console warnings, and PublicQuestionView wrapped JSON-LD in a hidden DOM `<section>` container.
- **Resolution**:
  - Standardized Offer schema in `lib/seo/adapters/test-series.ts`: paid series emit valid Offer (`price`, `priceCurrency: "INR"`, `availability: "InStock"`, `url`); free series emit `price: "0"`; missing price falls back to `Course` schema; unpublished series emit `noindex` and suppress Offer.
  - Replaced hidden `<section>` wrapper in `components/content-engine-public/PublicQuestionView.tsx` with pure `<script type="application/ld+json">` escaped with `safeJsonLdStringify` (`<` -> `\u003c`).
  - Audited 60 URLs across all 6 product modules (Tutorials, Current Affairs, PYQs, Test Series, Books, Content Engine): 60/60 passed with clean `JSON.parse` and zero nested `<script>` tags.
- **Evidence**: `docs/release/evidence/phaseB_jsonld_validation.txt` (Commit `a194d32`).

### Phase C: Test Suite Reconciliation & Automation Runner (O3, O4, O10)
- **Problem**: Prior reports exhibited discrepancies between 196 vs 204 test counts and relied on ad-hoc scripts without a unified execution command.
- **Resolution**:
  - Restored parser edge cases: all 9 tests in `tests/content-engine/parser-bugs.test.ts` passing.
  - Implemented production guard in `lib/prisma.ts` via `getPrismaLogConfig()`, which strictly disables query logging whenever `NODE_ENV === "production"`, preventing log leaks regardless of `PRISMA_LOG_QUERIES=1`. Verified via `tests/unit/prisma-log-guard.test.ts`.
  - Authored deterministic runner `scripts/run-proof-suite.ts` (`npm run test:proof:all` and `npm run test:proof:http`). Reconciled exact test counts across all suites: **275 tests executed, 275 passed, 0 failed**.
- **Evidence**: `docs/release/evidence/phaseC_test_reconciliation.txt` (Commit `e67d85b`).

### Phase D: Cross-Module Snapshot Invariance at Real Coverage (O5)
- **Problem**: Prior snapshot comparisons covered only 10 URLs total, lacking deep coverage across all product modules.
- **Resolution**:
  - Spun up temporary git worktree at merge-base `1b48ec9` on port 3045, captured baseline snapshots for 60 URLs (10 each for Courses, Tutorials, Current Affairs, PYQs, Test Series, and Content Engine English & Hindi).
  - Built and started HEAD on port 3045, captured identical 60 URLs.
  - Executed `scripts/compare-seo-snapshots.ts`:
    - 23 URLs Exactly Identical
    - 19 Additive Enhancements (new routes / previously missing tags populated)
    - 18 Owner-Approved Deviations (`/pyqs/[examId]` and `/test-series/[id]`)
    - **0 Unexpected Diffs (FAIL COUNT = 0)**
- **Evidence**: `docs/release/evidence/phaseD_snapshot_diff.txt` (Commit `a9856fa`).

### Phase E: Build-Time Database Resilience & Route Proof (O6, O9, O14)
- **Problem**: Build-time database latency or network partition could cause static builds to hang or crash if `generateStaticParams` or static pages lacked offline fallbacks.
- **Resolution**:
  - Handled database unreachability in `app/question-answer/page.tsx` and `app/hi/question-answer/page.tsx` using `.catch(() => [])`.
  - Ran `next build` with `DATABASE_URL` pointing at closed port `127.0.0.1:1`: build completed cleanly with exit code 0 (`175/175` static pages generated without crashing or hanging).
  - Verified quality gates: `npx tsc --noEmit` produced 64 errors across 15 legacy files (0 new errors); `npm run lint` produced 0 errors and 49 warnings (meets `<= 49` threshold).
  - Verified route tables: `/question-answer` routes render as `○` (Static ISR) or `●` (SSG) with `dynamicParams = true`; **zero dynamic `ƒ` routes**.
  - Fetched raw bodies on `next start`: `/robots.txt` lists all 3 sitemaps, does not disallow public questions, and diff against merge-base is strictly additive.
- **Evidence**:
  - `docs/release/evidence/phaseE_db_unreachable_build.txt`
  - `docs/release/evidence/phaseE_e1_build_checks.txt`
  - `docs/release/evidence/phaseE_routes_proof.txt`
  - `docs/release/evidence/phaseE_git_audit.txt` (Commit `baabaac`).

### Phase F: Hosting-Aware Cache Safety (O8)
- **Problem**: Production hosting platform was unverified, risking cache inconsistency in multi-instance environments.
- **Resolution**:
  - Audited repository for deployment manifests: zero found; hosting recorded as **UNKNOWN**.
  - Documented deployment and cache invalidation policies for 3 cases in `docs/DEPLOY_CHECKLIST.md`: (1) Vercel managed cache, (2) Single self-hosted Node, (3) Multi-node clusters with 3600s staleness bound.
  - Authored proposed Redis cache handler in `docs/seo/PROPOSED_CHANGES.md`.
  - Added read-only status indicator on `/admin/seo`: *"Revalidation mode: tag + time-based (3600s)"*.
- **Evidence**: `docs/DEPLOY_CHECKLIST.md:7-60`, `docs/seo/PROPOSED_CHANGES.md:72-101` (Commit `de16b84`).

### Phase G: Reusable Dry-Run Diagnostics Tool (O12)
- **Problem**: Ingesting raw exam text batches previously lacked offline verification, and authentic BPSC 70th Prelims paper was unverified.
- **Resolution**:
  - Built offline dry-run diagnostics tool `scripts/content-engine-dry-run.ts`.
  - Verified tool with generic synthetic fixture `tests/fixtures/dry-run-sample.txt` (5/5 parsed, 0 skipped, 0 junk lines).
  - Audited repository for authentic BPSC 70th raw text paper: confirmed **NOT FOUND**. In adherence to Global Hard Rule 3 (zero-hallucination / no synthetic question generation), marked G4–G7 as NOT TESTED and documented intake procedures in `docs/content-engine/BPSC_PREP.md`.
- **Evidence**: `scripts/content-engine-dry-run.ts`, `docs/release/evidence/phaseG_dry_run_test.txt`, `docs/content-engine/BPSC_PREP.md` (Commit `25a9852`).

### Phase H: Publish-Time SEO Automation Proof & Tutorial Design (O13)
- **Problem**: Lack of automated verification for newly created editorial content across modules, and tutorial SEO fields needed explicit design.
- **Resolution**:
  - Verified automated SEO lifecycle across Content Engine, Current Affairs, Tutorials, and PYQs via HTTP integration test `scripts/test-phaseH-seo-automation.ts`. Confirmed all 4 modules operate as **AUTOMATIC**: draft content is hidden/noindexed, published content automatically emits custom title, canonical, Schema.org JSON-LD, and sitemap entries.
  - Added advisory "Publish Readiness Audit" to `/admin/seo` showing non-blocking warnings (missing descriptions, thin content, duplicate titles).
  - Authored `docs/seo/TUTORIAL_SEO_FIELDS_DESIGN.md` detailing proposed fields, safe nullable migration SQL draft, and adapter fallback hierarchy. Confirmed Prisma schema left 100% untouched.
  - Confirmed tutorial URL architecture (`app/(dashboard)/tutorials/[slug]/page.tsx:40-60`): all chapters share `/tutorials/[slug]`.
- **Evidence**: `scripts/test-phaseH-seo-automation.ts`, `docs/release/evidence/phaseH_seo_automation.txt`, `docs/seo/TUTORIAL_SEO_FIELDS_DESIGN.md` (Commit `ed44397`).

---

## 2. Summary of Physical Code Mutations

Both physical code mutation suites were executed and verified:
1. **Content Engine Physical Mutations (20/20 PASS)**:
   - Evaluated quality gates, classifier nukta/nasal normalizations, unreviewed Hindi noindex, script escaping, static export exclusion, and shortId redirects.
   - Result: All 20 code mutations failed their tests RED, then passed GREEN upon clean byte-identical restoration.
   - Command: `npx tsx scripts/run-mutation-suite.ts` -> 20/20 PASS.
2. **SEO Core Physical Mutations (10/10 PASS)**:
   - Evaluated robots policy, safeJsonLdStringify escaping, hreflang leakage, canonical domain binding, title templates, and sitemap priorities.
   - Result: All 10 mutations failed their tests RED, then passed GREEN upon restoration.
   - Command: `npx tsx scripts/run-seo-mutation-suite.ts` -> 10/10 PASS.

---

## 3. Items Marked NOT TESTED (With Honest Reasons)

| Item | Topic | Reason Not Tested |
|:---:|---|---|
| **G4** | BPSC 70th 150-Question Full Parse | Source file `BPSC_70th_2024_ContentEngine_English.txt` was not provided in the repository. Adhering to Global Hard Rule 3 (zero hallucination), synthetic exam content was NOT generated. |
| **G5** | BPSC 70th Classifier Mapping | Awaiting authentic raw English source paper from owner. |
| **G6** | BPSC 70th DB Verification Transaction | Awaiting authentic raw English source paper from owner. |
| **G7** | BPSC 70th Hindi Skeleton Generation | Awaiting authentic raw English source paper from owner. |

---

## 4. Known Limits & Owner Pending Decisions

1. **Production Hosting Environment (O8)**:
   - Hosting is officially recorded as **UNKNOWN**.
   - If hosting on a single instance or Vercel, no additional work is needed.
   - If hosting across multiple self-hosted Node instances behind a load balancer, tag revalidation only purges the node handling the request. However, staleness is strictly bounded to a maximum of 3600 seconds (1 hour) due to ISR `revalidate = 3600`. A cluster-wide Redis cache handler is documented in `docs/seo/PROPOSED_CHANGES.md` if zero-staleness clustering is required.
2. **Tutorial SEO Fields Schema Migration (H3)**:
   - Drafted in `docs/seo/TUTORIAL_SEO_FIELDS_DESIGN.md`.
   - Existing Prisma schema was preserved 100% untouched tonight. Adding editable SEO fields to the `Course` model remains an owner decision pending.
3. **Authentic BPSC 70th Prelims Paper Ingestion (G3–G7)**:
   - Reusable dry-run diagnostics tool `scripts/content-engine-dry-run.ts` is fully built and verified.
   - When the owner places `BPSC_70th_2024_ContentEngine_English.txt` under `docs/content-engine/samples/`, the paper can be validated with one command and imported via the Admin Content Engine UI.
