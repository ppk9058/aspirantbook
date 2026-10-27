# PROGRESS — Course Studio Generalization

Append-only evidence log. Format: task → commands → real output excerpt → commit.

## P0 — Preflight

**Branch**
```
$ git checkout -b feat/course-studio-generalize
Switched to a new branch 'feat/course-studio-generalize'
$ git branch --show-current
feat/course-studio-generalize
```
Base commit: `9f6c6b5 fix(A13): uniform v1 login errors, lockout parity, in-place refresh rotation, owner-only device unregister`.

**Merge state**
```
$ ls .git/MERGE_HEAD
no merge head
```

**Docker test DB**
```
$ npm run test:db:up
 Container trillionskill-test-db  Started
$ nc -z 127.0.0.1 54329
test db port open
```

**Migration status (test DB, before)**
```
$ npx prisma migrate status
Datasource "db": PostgreSQL database "trillionskill_test" ... at "127.0.0.1:54329"
24 migrations found in prisma/migrations
Database schema is up to date!
```
Saved: `evidence/p0-migrate-status-before.txt`

**Baseline unit suite (37 suites / 173 tests)**
```
$ . ./course-studio-run/test-env.sh && npx tsx --test tests/unit/*.test.ts
# tests 173
# pass 171
# fail 2
```
Pre-existing failures (not caused by this run):
- `Cache tags are declared and invalidated (B-015, B-019)`
- `Exam Metrics & Single Source of Truth Tests`
Saved: `evidence/p0-unit-baseline.txt`

**Baseline API v1 courses suite**
```
$ npx tsx --test tests/api-v1-courses-learning.test.ts
# tests 9
# pass 9
# fail 0
```

**Baseline typecheck**
```
$ npx tsc --noEmit ; echo exit=$?
exit=0
```
Saved: `evidence/p0-tsc-baseline.txt` (0 errors)

**Baseline lint**
```
$ npm run lint ; echo exit=$?
exit=0
```
Saved: `evidence/p0-lint-baseline.txt` (warnings only).

**Hardcode census before (src only, excluding node_modules)**
```
$ grep -rn "bpsc\|BPSC" --include="*.ts" --include="*.tsx" app components lib packages apps/mobile/src | wc -l
~330 (60 files; most are exam content/fixtures, not course-UI code)
```
Targeted hack sites confirmed: `courses/[slug]/page.tsx:317`, `admin/courses/page.tsx:41`, `admin/tutorials/page.tsx:48`, `(dashboard)/tutorials/page.tsx:131`, `sitemap.ts:149`, 4 alias maps, `VideoCourseEditorClient.tsx` BPSC option + 2 placeholders, 6 HINGLISH defaults, `LiveDemoRoomClient.tsx` demo agenda.

**Recon facts**
- `Review` = `{ id, rating, comment?, userId, courseId, createdAt }`, 1 row per review, no aggregate table → rating distribution must be computed from rows.
- PYQ taxonomy: `PyqCategory` → `PyqSubExam` → `PyqPaper {year, stage, subject?, totalQuestions, ...}`. Per-question data lives in `ContentEngineQuestion {sub, top, exam, year}`. **There is no paper↔question join** → syllabus "most asked"/heat-bar must use `ContentEngineQuestion` grouped by `sub`/`top`/`year`.
- No language-preference cookie/localStorage mechanism exists (only `ts_player_theme`). New language toggle is client-side state.
- Rate limiter: `lib/rate-limit.ts` (Postgres `RateLimit` table, discrete windows, fails open).
- Site settings pattern: `lib/platform-settings.ts` (DB key/value).
- Mobile deps: `expo-file-system` present; **no** `expo-calendar`, **no** `expo-sharing`.
- `lib/seo/core.ts` already had `SITE_NAME`. New `lib/brand.ts` is now the single source.

## P1 — Centralize & de-hardcode

**Tests first (red)**
```
$ npx tsx --test tests/unit/course-format.test.ts
Error: Cannot find module '../../lib/courses/format'
```
Saved: `evidence/p1-format-red.txt`

**Implemented**
- `lib/brand.ts` — `BRAND_NAME` default `"AspirantBook"` (env-overridable).
- `lib/courses/format.ts` — `resolveCourseFormat` + 3 listing predicates.
- `lib/courses/slug-aliases.ts` — one frozen alias map (17 entries).
- `lib/courses/categories.ts` — 18 exam categories incl. UPSC/BPSC/State PSC/SSC/Banking/Railways/Defence/Teaching/Skills & Tech/Other.
- `lib/courses/languages.ts` — ENGLISH/HINDI/HINGLISH, default ENGLISH.
- `lib/i18n/localized.ts` — `localized`, `hindiCompleteness`, `hindiBadgeLabel`.

**Tests green**
```
$ npx tsx --test tests/unit/course-format.test.ts tests/unit/course-ownership.test.ts
# tests 26
# pass 26
# fail 0
```

**Behaviour-preserving proof (read-only, real dev DB)**
```
$ npx tsx course-studio-run/proof-format-parity.ts
Courses checked: 43
Observable mismatches: 0
```
Saved: `evidence/p1-format-parity.txt` (full before/after table).

**Call sites replaced**
`app/admin/courses/page.tsx`, `app/admin/tutorials/page.tsx`, `app/(dashboard)/tutorials/page.tsx`, `app/sitemap.ts`, `app/(dashboard)/courses/[slug]/page.tsx`, 4 alias route files (`mobile-login`, `course-info`, `enroll`, `verify-payment/razorpay`), `VideoCourseEditorClient.tsx` (categories, languages, placeholders, `...existingMeta` + `schemaVersion: 2` on save), `CourseBundleView.tsx`, `CourseComingSoonView.tsx`, `LiveDemoRoomClient.tsx` (agenda from metadata, generic fallback).

**Typecheck**
```
$ npx tsc --noEmit
(no output) exit=0
```

**API v1 courses suite still green**
```
# tests 9
# pass 9
```
