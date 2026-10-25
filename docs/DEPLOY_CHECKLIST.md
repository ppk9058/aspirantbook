# Production Deployment Checklist & Multi-Instance Architecture

This document details the deployment architecture, cache invalidation guarantees, required environment variables, and pre-release verification steps for TrillionSkill on branch `proof-hardening`.

---

## 1. Multi-Instance & Serverless Caching Architecture

### 1.1 Serverless Instance Reality
When deployed to serverless environments (such as Vercel, AWS Lambda, or Cloudflare Workers), multiple compute instances execute concurrently across edge regions.
- **In-Memory TTL Fallback Bypassed in Production:** In-memory caches (like `Map` caches) do not synchronize across distinct serverless instances. Serving stale content from an un-synchronized in-memory cache across lambdas is prohibited. In `lib/modules/content-engine/db-service.ts`, the in-memory fallback cache is strictly bypassed when `NODE_ENV === "production"`.
- **Next.js Data Cache & Tag Revalidation:** In production, question caching utilizes Next.js App Router `unstable_cache` tagged with `"content-engine"` and `"content-engine-${shortId}"`. Calling `revalidateTag()` or `revalidatePath()` communicates directly with Vercel's shared Data Cache layer.
- **Per-Deployment Isolation:** Next.js Data Cache tags are scoped per deployment. When a new deployment is promoted, a clean cache generation is initialized automatically.
- **Static ZIP Export Edge Reliability:** Deploying the generated static ZIP package to Cloudflare Pages completely eliminates serverless cache synchronization overhead. Static HTML files served from Cloudflare's global edge network have zero runtime dependencies and 100% atomic deploy consistency.

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
