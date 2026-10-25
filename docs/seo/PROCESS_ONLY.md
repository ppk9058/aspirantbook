# SEO Core Autonomous Engineering Process

## 1. Operating Environment & Safety Isolation
- **Git Branching**:
  - Part 1 was executed on `content-engine-verify`.
  - Part 2 was executed strictly on `seo-core` (direct child branch of `content-engine-verify`).
  - No pushes, rebases, or force commits were executed.
- **Database Safeguards**:
  - Zero writes to dev (Supabase) database.
  - Tests operated solely against Docker isolated test DB (`127.0.0.1:54329`, `trillionskill_test`).
  - No `prisma db push` or destructive operations were permitted or executed.
- **Zero New Dependencies**:
  - No new npm packages, no metered AI APIs, zero third-party SDK additions.
  - Clean TypeScript implementation relying solely on standard Node.js libraries and Next.js built-ins.

---

## 2. Red-Then-Green Verification Sequence
1. **Shared Core**:
   - `lib/seo/types.ts` and `lib/seo/core.ts` created.
   - `tests/seo/core.test.ts` authored with 12 tests covering `canonicalUrl`, `robotsPolicy`, `hreflangAlternates`, `safeJsonLdStringify`, `buildBreadcrumbListJsonLd`, `buildQuizJsonLd`, `buildArticleJsonLd`, `buildFaqJsonLd`, `buildMetadata`, and `buildSitemapEntry`.
   - Verified 12/12 passing.
2. **Adapters & Invariance**:
   - `lib/seo/adapters/content-engine.ts`: Verified 100% byte-identical parity with legacy `seo-model.ts` via `tests/seo/parity.test.ts` (3/3 passing).
   - `lib/seo/adapters/pyqs.ts`, `test-series.ts`, `current-affairs.ts`, `tutorials.ts`: Tested via `tests/seo/adapters.test.ts` (9/9 passing).
3. **Snapshot Auditing**:
   - Port 3045 test server booted with `NODE_ENV=test` against test DB.
   - Baseline snapshots recorded to `docs/seo/evidence/snapshots_before/` (15 URLs, 100% 200 OK).
   - After snapshots recorded to `docs/seo/evidence/snapshots_after/`.
   - Automated comparison via `scripts/compare-seo-snapshots.ts` verified that all existing indexed pages preserved exact title and canonical invariance.
4. **Admin SEO Dashboard & E2E**:
   - `app/admin/seo/page.tsx` and `app/admin/seo/layout.tsx` implemented.
   - `tests/seo/admin-auth.test.ts` unit tests passed (3/3).
   - `tests/e2e/seo-admin.spec.ts` Playwright tests executed against `http://127.0.0.1:3045`:
     - Logged-out -> `/login` redirect verified.
     - Teacher -> `/teacher` redirect verified.
     - Admin -> `/admin/seo` full dashboard render verified.
5. **Mutation Suite**:
   - 10 real code mutations executed sequentially via `scripts/run-seo-mutation-suite.ts`.
   - Every mutation turned a unit test RED with specific assertion diffs captured.
   - Every mutation reverted and verified GREEN with byte-clean restoration proof.
