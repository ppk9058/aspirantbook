# Release Decisions Log

This document records architectural, verification, and safety decisions made during the autonomous overnight run on branch `release-hardening`.

| Decision ID | Phase | Topic | Decision | Reason |
|:---:|:---:|---|---|---|
| RD-01 | Phase A | Sitemap ISR & Revalidation Architecture | Root shared sitemap (`app/sitemap.ts`) configured with `export const revalidate = 3600` (prerenders as static `○ /sitemap.xml`) with bounded queries (`take: 500`, selective fields, per-module try/catch). Content Engine sitemaps (`/question-answer/sitemap.xml` and `/hi/question-answer/sitemap.xml`) configured with `export const dynamic = "force-dynamic"` to provide immediate on-demand accuracy upon question publish/unpublish/Hindi review without crawling overhead on shared root routes. `revalidateContentEngineRoutes()` also triggers `safeRevalidatePath("/sitemap.xml")`. Verified via HTTP integration test `scripts/test-phaseA-sitemap-proof.ts` on `next start`. | In Next.js 15 App Router, static metadata routes do not purge prerender caches upon on-demand `revalidatePath`. Setting the shared root sitemap to 1-hour ISR eliminates DB load from search engine crawlers, while dynamic Content Engine sitemaps ensure instant indexing consistency for newly published questions. |
