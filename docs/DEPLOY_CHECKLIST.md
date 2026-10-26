# Production Deployment Checklist & Multi-Instance Architecture

This document details the deployment architecture, cache invalidation guarantees, required environment variables, and pre-release verification steps for TrillionSkill on branch `release-hardening`.

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
- **Operational Action**: None required. Native platform handles cluster-wide invalidation.

---

### 1.3 Hosting Case 2: Single Self-Hosted Node.js Instance
- **Architecture**: A single persistent Node.js server (e.g. running via PM2 or Docker on an EC2/VPS).
- **Cache Invalidation Mechanism**:
  - `revalidateTag()` and `revalidatePath()` write to the local filesystem cache (`.next/cache`).
  - Because exactly one Node process handles all traffic, cache purges are immediate and 100% consistent across all visitor requests.
- **Operational Action**: Run standard build and start (`next build && next start`). Zero external cache dependencies.

---

### 1.4 Hosting Case 3: Multiple Self-Hosted Node.js Instances Behind a Load Balancer
- **Architecture**: 2+ Node.js containers or VMs behind an AWS ALB, NGINX, or Cloudflare load balancer.
- **The Stale Page Challenge**:
  - In default Next.js, calling `revalidateTag()` on Node Instance A only purges the filesystem cache of Instance A.
  - Subsequent requests routed to Node Instance B may continue serving the previously cached page.
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
| `NEXT_PUBLIC_SITE_URL` | Production | **YES** | `""` (Suppresses canonical/JSON-LD) | Primary public canonical site base URL (e.g. `https://trillionskill.com`). |
| `NEXT_PUBLIC_APP_URL` | Production | Optional | Fallback for `NEXT_PUBLIC_SITE_URL` | Secondary site URL definition. |
| `Setting.exportBaseUrl` | Production | Conditional | `""` (Blocks Primary export) | Configured in DB Settings; required when `exportMode === "primary"`. |
| `DATABASE_URL` | All | **YES** | Postgres connection string | Main transactional database. |
| `DIRECT_URL` | All | **YES** | Direct connection string | Direct DB connection for Prisma migrations and bypass pooling. |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Production | **YES** | None | NextAuth JWT encryption secret. |
| `NEXTAUTH_URL` / `AUTH_URL` | Production | **YES** | None | Base URL for auth callbacks. |

### 2.1 Missing Host Defense
If `NEXT_PUBLIC_SITE_URL` is inadvertently unset in production:
1. `getBaseUrl()` returns `""`.
2. One `console.error("[SEO] NEXT_PUBLIC_SITE_URL is not defined...")` is logged.
3. Public pages **suppress** canonical tags rather than emitting a poisoned or hardcoded domain (a missing canonical is penalized less than duplicate content pointing to wrong hosts).
4. Rich JSON-LD snippets omit the top-level `url` attribute.
5. In development/test (`NODE_ENV !== "production"`), it safely defaults to `http://127.0.0.1:3045`.

---

## 3. Pre-Merge Verification Checklist (Owner Steps)

Before merging `proof-hardening` to `main`:

- [ ] **1. Verify Merge Base:** Ensure branch is merged cleanly into `seo-core` / `main`.
- [ ] **2. Environment Variables Set in Production:**
  - `NEXT_PUBLIC_SITE_URL` set to live domain (e.g. `https://trillionskill.com`).
  - `DATABASE_URL` and `DIRECT_URL` point to production Supabase Postgres cluster with connection pooling.
  - `NEXTAUTH_SECRET` is strong (min 32 alphanumeric chars).
- [ ] **3. Database Migrations:**
  - Verify migration status: `npx prisma migrate status`.
  - Execute deployment: `npx prisma migrate deploy` (NEVER `prisma db push` on production).
- [ ] **4. Build & Typecheck:**
  - Run `npm run lint` -> 0 errors.
  - Run `npx tsc --noEmit` -> 0 new errors against baseline.
  - Run `npm run build` -> 181 pages generated with 0 dynamic `ƒ` routes in `/question-answer`.
- [ ] **5. Ingest Authentic BPSC 70th Prelims Paper:**
  - Supply authentic `BPSC_70th_2024_ContentEngine_English.txt` under `data/`.
  - Run `npx tsx scripts/ingest-bpsc-70th.ts` to parse authentic paper.
  - Review generated `docs/content-engine/BPSC_70th_2024_REVIEW.md`.
  - Batch import into production database via Admin Add Batch UI.
- [ ] **6. Static Cloudflare Pages Export (Optional Standalone CDN):**
  - Configure `Setting.exportBaseUrl` in Admin Content Engine Export page.
  - Select "Primary Host Mode" or "Mirror CDN Mode".
  - Click "Download Static Site ZIP" and upload to Cloudflare Pages.
