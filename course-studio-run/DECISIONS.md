# DECISIONS — Course Studio Generalization

Every non-obvious choice, with alternatives considered. Autonomous run: no owner questions.

## D1. Branch created despite AGENTS.md "never switch branch"
- **What**: created `feat/course-studio-generalize` from `fix/audit2-hardening` (HEAD `9f6c6b5`).
- **Why**: the task's hard rules explicitly require this branch. The user's direct instruction for this run overrides the standing AGENTS.md rule.
- **Alternatives**: stay on `fix/audit2-hardening` (rejected: task names the branch).
- **Note**: no push, no merge, no force. The user commits/pushes.

## D2. No `prisma migrate deploy` against the Supabase dev DB
- **What**: migration SQL is generated and applied to the local Docker test DB only. Dev/Supabase gets the migration file but **not** an automated deploy.
- **Why**: AGENTS.md §0 says the dev (Supabase) DB is SELECT-only, and section 5 says schema/migration writes need owner approval. The mission explicitly allows deploy, but two project rules forbid it; the mission also says "on ambiguity pick the safest additive option".
- **Alternatives**: deploy anyway (rejected: irreversible write to hand-made production-ish data).
- **Owner action**: run `npx prisma migrate deploy` against dev when ready. See FINAL_REPORT blockers.

## D3. Format classification kept as four predicates, not one
- **What**: `lib/courses/format.ts` exports `resolveCourseFormat` **and** three listing predicates (`isVideoCourseForStudio`, `isTextTutorialForCatalog`, `isListedInTutorialsSitemap`).
- **Why**: the four old call sites did **not** use identical rules (e.g. the sitemap only looked at the slug and listed paid non-video courses). Collapsing them into one predicate would change output. `course-studio-run/proof-format-parity.ts` proves 0 observable mismatches on all 43 dev courses.
- **Alternatives**: one predicate everywhere (rejected: behaviour change).

## D4. Explicit `metadataJson.format` wins, legacy rules contained
- **What**: `resolveCourseFormat` reads `metadata.format`, `metadata.meta.format`, `metadata.type`, then falls back to legacy heuristics (`externalId`, `72nd-bpsc-prelims-current-affairs`, `slug.includes("bpsc")`, `price > 0`, media lessons).
- **Why**: mission requires explicit format first and legacy only inside this function.
- **Note**: the tutorial redirect in `courses/[slug]/page.tsx` runs before bundle rendering, so a tutorial course that also has media still redirects exactly as before.

## D5. Language default changed from implicit `HINGLISH` to explicit `ENGLISH`
- **What**: `DEFAULT_COURSE_LANGUAGE = "ENGLISH"`; `BILINGUAL` removed from the studio select (never in the spec's language list).
- **Why**: mission: "Replace editor options and defaults"; hardcoded HINGLISH defaults are forbidden.
- **Risk**: courses without `language` in metadata now render "English"/"अंग्रेज़ी" instead of "HINGLISH". Flagged in FINAL_REPORT known limits.
- **Alternatives**: keep HINGLISH default (rejected: explicitly called out as a hack to remove).

## D6. Exam categories stored in `Course.technology`
- **What**: `lib/courses/categories.ts` values are persisted to the existing `technology` column; unknown/custom values are still selectable and shown as "(custom)".
- **Why**: avoids a schema change for an existing free-text column; keeps every legacy value working.
- **Alternatives**: new `examCategory` column (deferred: no need, additive schema is expensive).

## D7. Test DB is the only DB used by tests
- **What**: `course-studio-run/test-env.sh` sources `.env.test` and exports `DATABASE_URL`/`DIRECT_URL` (values never printed) so `lib/test-db-guard.ts` passes.
- **Why**: running `APP_ENV=test npx tsx --test` bare targets the Supabase URL and is correctly refused by the guard.
- **Evidence**: `evidence/p0-unit-baseline.txt`, `evidence/p0-api-v1-courses.txt`.
