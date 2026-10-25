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
