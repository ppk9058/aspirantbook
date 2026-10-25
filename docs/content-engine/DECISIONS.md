# DECISIONS.md — Content Engine Integration

This document records all architectural decisions, safety choices, and conflict resolutions made during the integration of the Content Engine module into the TrillionSkill repository.

---

## 1. AGENTS.md vs Task Instructions Conflicts

| Conflict Point | AGENTS.md Rule | Task Instruction | Decision & Strictness Rationale |
| :--- | :--- | :--- | :--- |
| **Branch creation/switch** | "Stay on the current branch (never create or switch)." | "Branch: continue on `content-engine-integration` (verify it exists and its base equals the tip of `TrillionSkill-ver2`...)" | **Use `content-engine-integration`**. The task specifically dictates working on this branch with local commits per phase. Merge base was verified to match the exact tip of `TrillionSkill-ver2`. |
| **Package.json edits** | "Never edit package.json or the lockfile unless the task needs it; say so first." | "EDIT BUDGET on existing files: ... (d) package.json scripts (add `test:content-engine` only)... NO new dependencies (package.json deps and lockfile byte-identical)." | **Add only `test:content-engine` script**. All dependencies and `package-lock.json` remain untouched and byte-identical. |
| **Test DB enforcement** | "Test only on the isolated test server ... against the Docker test DB (`127.0.0.1:54329`, `.env.test`)." | "All destructive or fixture-heavy tests use the Docker test DB only; before ANY test run print the resolved DB host:port (no credentials) and abort if it is not 127.0.0.1:54329." | **Strict compliance**. Test runner checks that DB host is strictly `127.0.0.1:54329`. The Supabase dev DB is never touched by tests or fixtures. |

---

## 2. Architectural & Technical Decisions

### Decision 1: Placement of Pure Logic & Services
- **Choice**: Place all engine logic under `lib/modules/content-engine/` and UI components under `components/admin/content-engine/` and `components/content-engine-public/`.
- **Reason**: The web app has no `src/` folder. Root `lib/` and `components/` are the established conventions for non-route code.

### Decision 2: Zero-Cost Elimination of AI Call Sites
- **Choice**: Completely remove `claude.use` invocations (`autoCat`, `autoSol`, `trRun`, and `verify` LLM calls).
- **Reason**: Hard Rule 4 & 5 demand zero paid/metered AI calls. AI auto-categorization is replaced by the manual-assist loop (JSON category import/export and regex keyword classification). AI solution generation is replaced by human entry/paste. Two-model verification is replaced by a human editorial verification toggle (`isVerified` flag).

### Decision 3: Public Route Namespace `/question-answer` & `/hi/question-answer`
- **Choice**: Use `/question-answer` and `/hi/question-answer`.
- **Reason**: The existing app already has `/pyqs` (official PDF paper viewer and CBT tests). Using `/question-answer` provides complete isolation, zero collision, and maximum SEO clarity for Google Rich Results.

### Decision 4: Slug & URL Stability
- **Choice**: Generate `shortId` (unique 8-character string) and combine with an English question slug: `qaPath(lang, exam, subject, slug)`.
- **Reason**: If an admin later edits question text, old links resolve by shortId and 308-redirect to the canonical URL, preventing broken external backlinks.

### Decision 5: Devanagari PDF Printing
- **Choice**: Use browser-native print styles (`window.print()`) for printable solution sheets in the admin practice preview rather than bundling large font binaries into raw PDF streams.
- **Reason**: System fonts and browser rendering handle complex Devanagari ligatures (matras, halants, conjuncts) with 100% fidelity without network calls or font corruption. Raw PDF Helvetica cannot render Devanagari.

### Decision 6: Dedicated Public Layout
- **Choice**: Create `app/question-answer/layout.tsx` and `app/hi/question-answer/layout.tsx` that do NOT call `auth()`, cookies, or dynamic headers.
- **Reason**: Next.js App Router caching (`unstable_cache`, ISR, static generation) requires route handlers and server components on public routes to be pure of per-request cookies, preventing cache de-optimization.

### Decision 7: `exportMode` Mirror vs Primary
- **Choice**: Default `Setting.exportMode` to `"mirror"` where canonical URLs point to `NEXT_PUBLIC_SITE_URL`.
- **Reason**: Prevents duplicate content penalties between the Next.js production site and secondary Cloudflare Pages static exports.

### Decision 8: Retention of `/q/[shortId]` with 308 Permanent Redirect
- **Choice**: Retain `app/q/[shortId]/route.ts` as an accepted route exception, returning a `308 Permanent Redirect` to the canonical slug `/question-answer/{exam}/{subject}/{slug}`.
- **Reason**: Competitive exam aspirants frequently share questions on Telegram, WhatsApp, and social media. Short URLs (`/q/abcd1234`) are essential for shareability and low character counts. Using HTTP 308 ensures search engines and social scrapers preserve the request method and permanently index the canonical destination URL.

### Decision 9: Placement of Unit & Integration Tests in `tests/content-engine/`
- **Choice**: Retain pure-logic, database persistence, and mutation test suites in `tests/content-engine/*.test.ts`, invoked via `npm run test:content-engine` (`tsx --test --test-concurrency=1`), while placing end-to-end browser and HTTP tests in `tests/e2e/content-engine.spec.ts`.
- **Reason**: Node.js native test runner (`node:test` via `tsx`) executes unit and service checks in milliseconds (< 2s) without the overhead of spinning up browser binaries for all 64 logic checks. Playwright E2E tests in `tests/e2e/` then verify full browser rendering, authentication middleware, and real HTTP requests against the running test server on port 3045.

### Decision 10: Unknown shortId Returns HTTP 404 (Not 302)
- **Choice**: In `app/q/[shortId]/route.ts`, if a requested shortId does not exist or is unpublished/draft, return `404 Not Found` rather than a temporary 302 redirect.
- **Reason**: In search engine and social bot semantics, an unknown or nonexistent question identifier is a missing resource (404). Redirecting to `/question-answer` via 302 creates soft 404s and index bloat.

### Decision 11: Route Co-location for Year Hub and Subject Hub
- **Choice**: Co-locate year hub (`/question-answer/{exam}/{year}`) and subject hub (`/question-answer/{exam}/{subject}`) inside `app/question-answer/[exam]/[subject]/page.tsx` and `app/hi/question-answer/[exam]/[subject]/page.tsx`.
- **Reason**: Next.js App Router forbids sibling dynamic route folders with different slug names (`[year]` and `[subject]`) at the same directory depth under `[exam]`. Segments matching strict regex `/^(19[89]\d|20[0-3]\d)$/` render the Year Hub; other segments render the Subject Hub, and invalid/nonexistent subjects or years return `404 Not Found`.

### Decision 12: Production-Mode Guard against `ts_demo_role` Cookie
- **Choice**: Enforce strict production-mode rejection of `ts_demo_role` cookie in `app/admin/content-engine/layout.tsx` (redirecting to `/login`) and `lib/modules/content-engine/auth.ts` (returning 401 Unauthorized for mutations).
- **Reason**: In development, `ts_demo_role` facilitates rapid role switching and Playwright E2E testing without full OAuth token exchanges. In production (`NODE_ENV === "production"`), demo IDs starting with `demo-` must never be permitted to access admin interfaces or API actions.

### Decision 13: Next.js Cache & In-Memory TTL Revalidation Lifecycle
- **Choice**: Wrap `getPublicQuestionBySlug` in Next.js `unstable_cache` tagged with `"content-engine"` and `revalidate: 3600`, coupled with an in-memory fallback query cache. Invalidate on-demand via `safeRevalidateTag("content-engine")` and `safeRevalidatePath` upon publishing, unpublishing, bulk assignment, and Hindi translation reviews.
- **Reason**: Force-static public pages achieve sub-millisecond TTFB and zero database load on repeated visits. Immediate on-demand revalidation ensures published or unpublished updates reflect on the next request.

### Decision 14: Accepted Exceptions for Scope and File Locations
- **Choice**: Formally document `app/q/[shortId]/route.ts`, `tests/content-engine/*.test.ts`, `tests/e2e/content-engine.spec.ts`, and `scripts/run-mutation-suite.ts` as permitted exceptions.
- **Reason**: `app/q/[shortId]` provides short URL vanity sharing for Telegram and social channels. Dedicated `tests/content-engine/` maintains fast developer iteration for unit tests without polluting generic root directories. Exactly 5 existing repository files (`app/robots.ts`, `components/admin/AdminNav.tsx`, `components/layout/LeftSidebar.tsx`, `package.json`, `prisma/schema.prisma`) were modified.
