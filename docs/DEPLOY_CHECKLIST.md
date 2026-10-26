# Production Deployment Checklist & Multi-Instance Architecture

This document details the deployment architecture, cache invalidation guarantees, required environment variables, pre-release verification steps, and operational runbooks for TrillionSkill on branch `release-hardening`.

> [!NOTE]
> All domain names referenced in examples (such as `https://trillionskill.com`) are illustrative placeholders. In production, the active domain is determined dynamically from `NEXT_PUBLIC_SITE_URL`.

---

## 1. Hosting Architecture & Cache Invalidation Scenarios (O8)

### 1.1 Repository Deployment Audit
A structural audit of the repository yielded:
- `vercel.json`: **NOT FOUND**
- `Dockerfile` / `docker-compose.yml` (production): **NOT FOUND** (only `docker-compose.test.yml` for isolated test DB)
- `.github/workflows`: **NOT FOUND**
- `next.config.js`: Contains no `output: "standalone"` or `cacheHandler`.
- `README.md` & `AGENTS.md`: Contains warnings: *"Serverless is read-only and multi-instance. Local filesystem persistence is ephemeral on serverless platforms (e.g., Vercel lambdas). Use the database."*

**Verdict**: Production hosting platform is **UNKNOWN**. Therefore, deployment and cache invalidation policies are defined for all three operational hosting models below:

---

### 1.2 Hosting Case 1: Vercel or Managed Next.js Platform
- **Architecture**: Ephemeral serverless lambdas backed by Vercel's global shared Data Cache.
- **Cache Invalidation Mechanism**:
  - `unstable_cache` tags (`"content-engine"`, `"content-engine-${shortId}"`) write to Vercel's centralized data cache.
  - Calling `revalidateTag()` or `revalidatePath()` upon question publish/unpublish/Hindi review automatically broadcasts across all regional edge instances.
  - In `lib/modules/content-engine/db-service.ts`, local in-memory fallback caches are strictly disabled in production (`NODE_ENV === "production"`), ensuring no un-synchronized in-memory state lingers across lambda invocations.
- **Purge on Rollback**: Deploying a prior git SHA instantly provisions a clean deployment-scoped cache generation.

---

### 1.3 Hosting Case 2: Single Self-Hosted Node.js Instance
- **Architecture**: A single persistent Node.js server (e.g. running via PM2 or Docker on an EC2/VPS).
- **Cache Invalidation Mechanism**:
  - `revalidateTag()` and `revalidatePath()` write to the local filesystem cache (`.next/cache`).
  - Because exactly one Node process handles all traffic, cache purges are immediate and 100% consistent across all visitor requests.
- **Purge on Rollback**: Stop server, remove `.next/cache`, rebuild and restart.

---

### 1.4 Hosting Case 3: Multiple Self-Hosted Node.js Instances Behind a Load Balancer
- **Architecture**: 2+ Node.js containers or VMs behind an AWS ALB, NGINX, or Cloudflare load balancer.
- **The Stale Page Challenge**:
  - In default Next.js, calling `revalidateTag()` on Node Instance A only purges the filesystem cache of Instance A. Subsequent requests routed to Node Instance B may continue serving the previously cached page.
- **Guaranteed Staleness Bounding (3600s ISR)**:
  - All Content Engine question pages and root sitemaps enforce `export const revalidate = 3600` (1-hour time-to-live).
  - Even if Node Instance B never receives an explicit revalidation webhook, staleness is strictly capped at **3600 seconds (1 hour)**. After 1 hour, Instance B automatically queries PostgreSQL and rebuilds the static HTML.
- **Recommended Solutions**:
  1. **Option A (Simplest)**: Run a single primary Node instance for web traffic (Case 2), which easily handles high throughput with Next.js static caching.
  2. **Option B (Zero-Staleness Cluster)**: Configure a shared Redis/Postgres cache handler in `next.config.js` (`cacheHandler: require.resolve("./lib/cache/redis-cache-handler.js")`) as documented in `docs/seo/PROPOSED_CHANGES.md`.
  3. **Option C (Cloudflare Pages Static Export)**: Download the Content Engine static ZIP export from `/admin/content-engine/export` and host on Cloudflare Pages for 100% atomic edge updates with zero backend dependency.

---

## 2. Environment Variables & Host Configuration

| Variable | Environment | Required | Default / Fallback | Purpose |
|---|---|:---:|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production | **YES** | `""` (Suppresses canonical/JSON-LD) | Primary public canonical site base URL. |
| `NEXT_PUBLIC_APP_URL` | Production | Optional | Fallback for `NEXT_PUBLIC_SITE_URL` | Secondary site URL definition. |
| `DATABASE_URL` | All | **YES** | Postgres connection string | Main transactional database with connection pooling. |
| `DIRECT_URL` | Production | **YES** | Direct connection string | Direct DB connection for Prisma migrations (bypasses pgbouncer). |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Production | **YES** | None | NextAuth JWT encryption secret (min 32 chars). |
| `NEXTAUTH_URL` / `AUTH_URL` | Production | **YES** | None | Base URL for auth callbacks. |
| `PRISMA_LOG_QUERIES` | Production | **NO** | Unset | Must be **UNSET** in production. Note: `lib/prisma.ts` enforces `getPrismaLogConfig()`, strictly suppressing query logging in production even if set. |
| `Setting.exportBaseUrl` | Production | Conditional | `""` | Configured in DB Settings; required when `exportMode === "primary"`. |

### 2.1 Missing Host Defense
If `NEXT_PUBLIC_SITE_URL` is inadvertently unset in production:
1. `getBaseUrl()` returns `""`.
2. A single error is logged: `[SEO] Neither NEXT_PUBLIC_SITE_URL nor NEXT_PUBLIC_APP_URL is set in production. Canonical and absolute URLs omitted.`
3. Public pages **suppress** canonical tags rather than emitting a poisoned or hardcoded domain (a missing canonical is penalized less than duplicate content pointing to wrong hosts).
4. Rich JSON-LD snippets omit the top-level `url` attribute.
5. In development/test (`NODE_ENV !== "production"`), it safely defaults to `http://127.0.0.1:3045`.

---

## 3. Database Migration & Rollback Plan

### 3.1 Migration Execution Order
1. **Database Backup First**:
   - Take an explicit snapshot / pg_dump of production Postgres before executing migration.
2. **Apply Additive Migration**:
   - Run: `npx prisma migrate deploy`
   - Migrations deployed:
     - `prisma/migrations/20261025220000_add_content_engine_tables/migration.sql` (Creates `ContentEngineQuestion`, `ContentEngineTranslation`, `ContentEngineAudit`).
   - Note: Migration is strictly **additive**; zero columns or tables are deleted or modified. Existing user, course, and exam data remain untouched.

### 3.2 Rollback Plan
If deployment must be rolled back:
1. **Revert Merge Commit**:
   - Run: `git revert -m 1 <merge-commit-sha>` and push to release branch.
2. **Database Schema State**:
   - Because migration `20261025220000_add_content_engine_tables` is purely additive, newly created tables can safely remain in the database without breaking older code. No destructive `DOWN` migration is needed.
3. **Cache Purge on Rollback**:
   - *Vercel*: Automatic per-deployment cache generation.
   - *Single Node*: Remove `.next/cache` and restart (`rm -rf .next/cache && npm run start`).
   - *Multi-Node*: Purge shared Redis cache / restart cluster instances.

---

## 4. Pre-Merge Verification Checklist (Owner Steps)

- [ ] **0. Dependency Installation & Workspaces:**
  - **Web Deployments**: Use plain `npm ci --omit=dev`. With decoupled workspaces (`"workspaces": ["packages/*"]`), this installs web & shared packages cleanly (~41s / 1.0GB), avoiding ~726 unused Expo/React-Native packages and dual-React overhead.
  - **Mobile Client**: Managed independently. Run `cd apps/mobile && npm install` (generates `apps/mobile/package-lock.json` and links `@aspirantbook/shared` via `file:../../packages/shared`).
- [ ] **1. Verify Merge Base:** Ensure branch merges cleanly into `seo-core` / `main`.
- [ ] **2. Build-Time Prerequisite (`NEXT_PUBLIC_SITE_URL`):**
  - `NEXT_PUBLIC_SITE_URL` **MUST** be explicitly set on staging and production before running `npm run build` / `next build` (e.g. `NEXT_PUBLIC_SITE_URL=https://aspirantbook.com`).
  - If omitted during build, canonical tags, OpenGraph URLs, and absolute sitemap references will be omitted to avoid domain poisoning.
- [ ] **3. Environment Variables in Production:**
  - `NEXT_PUBLIC_SITE_URL` set to live domain.
  - `DATABASE_URL` and `DIRECT_URL` point to production Postgres cluster.
  - `PRISMA_LOG_QUERIES` is unset.
  - `NEXTAUTH_SECRET` is strong (min 32 alphanumeric chars).
- [ ] **4. Test Suite Execution (`test:proof:all`):**
  - Start the Docker test DB container (`docker start trillionskill-test-db` or `npm run test:db:up`) before executing `npm run test:proof:all`.
  - The proof runner contains an automated TCP preflight check against `127.0.0.1:54329` and will abort with `TEST DB UNREACHABLE` if the test DB cannot be reached.
- [ ] **5. Quality Gates:**
  - `npx tsc --noEmit` -> 0 new errors against baseline.
  - `npm run lint` -> 0 errors, <= 49 warnings.
  - `npm run build` -> Build passes.
  - Route table check: Verify routes `/question-answer` and `/hi/question-answer` display `○` (Static ISR) or `●` (SSG), and contains **NO dynamic `ƒ` routes**. (Note: Exact page count depends on DB question count at build time).
- [ ] **6. Database Migrations:**
  - Verify migration status: `npx prisma migrate status`.
  - Execute deployment: `npx prisma migrate deploy`.
- [ ] **7. Ingest Authentic BPSC 70th Prelims Paper:**
  - Place authentic file `BPSC_70th_2024_ContentEngine_English.txt` under `docs/content-engine/samples/`.
  - Run offline dry-run tool:
    ```bash
    npx tsx scripts/content-engine-dry-run.ts docs/content-engine/samples/BPSC_70th_2024_ContentEngine_English.txt docs/content-engine/samples/bpsc_70th_dry_run.json
    ```
  - Verify output: 150 parsed, 0 skipped, 4 options each, exam "BPSC", year 2024.
  - Import batch via Admin Content Engine Add Batch UI (`/admin/content-engine/add`).
- [ ] **6. Human Review & Indexing Policy:**
  - Content Engine questions remain in `DRAFT` status until editor review.
  - Hindi translations remain `isReviewed: false` (`noindex`) until verified by a bilingual editor.
  - Publish only verified questions.
- [ ] **7. Post-Deploy Snapshot Comparison:**
  - Run the automated snapshot verification script:
    ```bash
    BASE_URL="https://your-domain.com" npx tsx scripts/compare-seo-snapshots.ts
    ```
  - Assert FAIL count is 0.

---

## 5. Google Search Console & Rich Results Verification

### 5.1 Submit XML Sitemaps
In Google Search Console -> **Sitemaps**, submit the three auto-generated sitemaps:
1. `https://your-domain.com/sitemap.xml` (Root sitemap for courses, books, test-series, tutorials, PYQs)
2. `https://your-domain.com/question-answer/sitemap.xml` (English Content Engine questions and taxonomy hubs)
3. `https://your-domain.com/hi/question-answer/sitemap.xml` (Hindi human-reviewed Content Engine questions)

### 5.2 Google Rich Results Test (5 Sample URLs)
Test the following 5 live URLs in [Google Rich Results Test](https://search.google.com/test/rich-results) using your configured `${BASE_URL}`:
1. **Public Question Page**: `${BASE_URL}/question-answer/upsc-cse/history/4d3fa9c7-upsc-cse-2023-q1-consider-the-following-statements`
   - *Expected*: Valid `Question` Schema with `acceptedAnswer` and `BreadcrumbList`. Zero schema errors.
2. **Hindi Question Page**: `${BASE_URL}/hi/question-answer/upsc-cse/history/4d3fa9c7-upsc-cse-2023-q1-consider-the-following-statements`
   - *Expected*: Valid `Question` Schema in Devanagari with alternate hreflang links.
3. **Test Series Page**: `${BASE_URL}/test-series/bpsc-72nd-2026`
   - *Expected*: Valid `Product` Schema with compliant `Offer` (`price`, `priceCurrency: "INR"`, `availability: "InStock"`).
4. **Tutorial Page**: `${BASE_URL}/tutorials/agentic-engineering-zero-to-hero`
   - *Expected*: Valid `Course` Schema with `provider: Organization`.
5. **Current Affairs Quiz**: `${BASE_URL}/current-affairs-quizzes/upsc-economy-ca`
   - *Expected*: Valid `Quiz` Schema with questions and duration.
