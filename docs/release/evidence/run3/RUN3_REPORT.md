# RUN 3 — Course Detail v2 Pre-Merge Verification Report

**Branch:** `feat/course-detail-v2`  
**Merge Target:** `TrillionSkill-ver2` (NOT `main`)  
**Base Commit:** `c6031680c`  
**Head Commit:** `04fed4ce3`  
**Database:** Isolated Docker Test DB (`127.0.0.1:54329`, `trillionskill_test`)  
**Test Server:** `http://127.0.0.1:3045` (`PORT=3045 NEXT_DIST_DIR=.next-test`)

---

## 1. Task Execution & Summary

| Task | Scope & Description | Files Changed / Added | Commit Hash | Raw Evidence Path | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Task 1: Course Ownership Bug** | Added `createdById` relation & index to `Course`, opposite `createdCourses` on `User`. Created migration `20261105185545_add_course_created_by` & applied to test DB (54329). Passed through `createdById` in `loadManagedCourse`. Attached `creatorIdFor(user)` at all 5 creation sites. Wrapped mutating routes & actions with ownership guards. Added null creator report script. Added 6 unit tests & 4 integration tests. | `prisma/schema.prisma`<br>`prisma/migrations/20261105185545_add_course_created_by/migration.sql`<br>`lib/auth/course-access-server.ts`<br>`app/api/admin/courses/route.ts`<br>`app/api/admin/courses/[id]/route.ts`<br>`app/api/admin/courses/[id]/draft/route.ts`<br>`app/api/admin/courses/[id]/duplicate/route.ts`<br>`app/api/admin/courses/[id]/lessons/route.ts`<br>`app/api/admin/courses/[id]/demo-slots/route.ts`<br>`app/api/admin/tutorials/import/route.ts`<br>`lib/actions/admin/courses.ts`<br>`lib/actions/admin/course-metadata.ts`<br>`lib/actions/admin/chapters.ts`<br>`lib/actions/admin/lessons.ts`<br>`lib/actions/admin/publishing.ts`<br>`lib/actions/admin/tutorial-import.ts`<br>`scripts/report-null-creator-courses.ts`<br>`tests/unit/course-ownership-load-managed.test.ts`<br>`tests/integration/course-ownership-api.test.ts` | `9e7771e80`<br>`0d38adafb`<br>`04fed4ce3` | [unit-load-managed-test.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/unit-load-managed-test.txt)<br>[course-ownership-test.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/course-ownership-test.txt)<br>[e2e-ownership-final.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-ownership-final.txt) | **PASS** |
| **Task 2: Duplicate Screenshots & Sticky Card** | Investigated SHA-256 hash collision between `ibps-desktop.png` and `upsc-hindi.png` (root cause: missing heading assertion caused 404 page capture). Fixed `tests/e2e/capture-final-screenshots.spec.ts` with explicit assertions and language switch verification. Regenerated all screenshots (all SHA-256 hashes distinct). Captured desktop scrolled sticky card at `docs/release/evidence/run3/sticky-card-desktop.png`. Documented hash verification table. | `tests/e2e/capture-final-screenshots.spec.ts`<br>`e2e-artifacts/ibps-desktop.png`<br>`e2e-artifacts/upsc-hindi.png`<br>`e2e-artifacts/ibps-mobile.png`<br>`docs/release/evidence/run3/sticky-card-desktop.png`<br>`docs/release/evidence/run3/screenshot-hashes.md` | `388b08595` | [screenshot-hashes.md](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/screenshot-hashes.md)<br>[sticky-card-desktop.png](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/sticky-card-desktop.png) | **PASS** |
| **Task 3: Honest "NOT FINISHED" List** | Audited `docs/evidence/course-detail-v2-audit.md` where items were claimed 100% DONE. Updated items 4, 11, and 13 to honest PARTIAL status. Appended comprehensive "Known Unfinished Items & Technical Debt" section detailing drag-to-reorder, static 36-icon picker, and Wizard unit outline browser test gap. | `docs/evidence/course-detail-v2-audit.md` | `f499e5cb1` | [course-detail-v2-audit.md](file:///Users/praveenkumar/TrillionSkill/docs/evidence/course-detail-v2-audit.md) | **PASS** |
| **Task 4: Evidence Gaps & Teacher Isolation** | Re-ran the 30 tests (axe, live-preview, thumbnail) with raw log capturing without masking failures. Verified `git ls-files apps/mobile/node_modules` is empty, `.gitignore` contains `apps/mobile/node_modules/`, and `git diff c6031680c..HEAD -- '*lock*'` is 100% empty. Audited all reads of `teacher-library.json`, removed runtime reads in `page.tsx` and optimized `lib/teachers/library.ts` so runtime reads Prisma only. | `app/(dashboard)/courses/[slug]/page.tsx`<br>`lib/teachers/library.ts`<br>`docs/release/evidence/run3/e2e-axe-audit.txt`<br>`docs/release/evidence/run3/e2e-live-preview.txt`<br>`docs/release/evidence/run3/e2e-thumbnail-fallback.txt` | `182ef7284` | [e2e-axe-audit.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-axe-audit.txt)<br>[e2e-live-preview.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-live-preview.txt)<br>[e2e-thumbnail-fallback.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-thumbnail-fallback.txt) | **PASS** |

---

## 2. Release Gates Verification

| Gate | Target Standard | Measured Output | Raw Evidence Path | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Gate 1: Web TypeScript** | `npx tsc --noEmit` file-by-file exact match to baseline; $\le 67$ errors in 17 files; zero new files with errors | Exactly 67 errors across 17 files. Zero new errors. File-by-file `diff -u` against baseline is empty. | [tsc-final.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/tsc-final.txt) | **PASS** |
| **Gate 2: Mobile TypeScript** | `cd apps/mobile && npx tsc --noEmit` | Clean exit, 0 errors. | [tsc-mobile-final.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/tsc-mobile-final.txt) | **PASS** |
| **Gate 3: ESLint** | `npm run lint` | Clean exit (code 0), 0 errors (legacy warnings only). | [lint-final.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/lint-final.txt) | **PASS** |
| **Gate 4: Full Unit Tests** | `npx tsx --test tests/unit/*.test.ts` ($\ge 146$ pass baseline + new tests) | **152 passed, 0 failed, 0 cancelled (33 suites, 23.2s)** | [unit-tests-final.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/unit-tests-final.txt) | **PASS** |
| **Gate 5a: Ownership E2E / Integration** | Teacher A creates -> edits -> Teacher B gets 403 on course, chapter, and lesson | **4 passed, 0 failed (1.2s)** | [e2e-ownership-final.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-ownership-final.txt) | **PASS** |
| **Gate 5b: Axe A11y Suite** | `tests/e2e/course-axe-audit.spec.ts` | **12 passed, 0 failed (4.1m)** (Zero critical/serious WCAG violations) | [e2e-axe-audit.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-axe-audit.txt) | **PASS** |
| **Gate 5c: Live Preview E2E** | `tests/e2e/course-live-preview.spec.ts` | **8 passed, 2 failed (4.8m)** (failed tests: singular/plural formatting assertions) | [e2e-live-preview.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-live-preview.txt) | **PARTIAL (FAIL)** |
| **Gate 5d: Thumbnail Fallback E2E** | `tests/e2e/course-thumbnail-fallback.spec.ts` | **0 passed, 8 failed (4.4m)** (failed on selector visibility timeouts in headless dev server) | [e2e-thumbnail-fallback.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-thumbnail-fallback.txt) | **FAIL** |
| **Gate 5e: Course Detail v2 E2E** | `tests/e2e/course-detail-v2.spec.ts` | **6 passed, 2 failed (2.7m)** (failed on exact h1 locator matching dynamic test title; legacy view & sample layouts pass) | [e2e-course-detail-v2.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-course-detail-v2.txt) | **PARTIAL (FAIL)** |
| **Gate 5f: Teacher Library Multi-Course** | `tests/e2e/teacher-library-multicourse.spec.ts` | **3 passed, 1 failed (2.9m)** (initial attachments pass, desktop live sync timed out on save button response) | [e2e-teacher-library.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-teacher-library.txt) | **PARTIAL (FAIL)** |
| **Gate 5g: Empty Unit Handling E2E** | `tests/e2e/empty-unit-handling.spec.ts` | **2 passed, 4 failed (6.4m)** (in-memory wizard logic passes, browser tests timed out waiting for innerText) | [e2e-empty-unit-handling.txt](file:///Users/praveenkumar/TrillionSkill/docs/release/evidence/run3/e2e-empty-unit-handling.txt) | **PARTIAL (FAIL)** |

---

## 3. Open Risks & Security Mutation Audit (Task 1d)

Every course-mutating route and server action was audited for access control and ownership enforcement:

### 1. Protected via `loadManagedCourse` / `requireManagedChapter` / `requireManagedLesson`
- `app/api/admin/courses/[id]/route.ts` (PUT, DELETE): Protected with `loadManagedCourse`.
- `app/api/admin/courses/[id]/draft/route.ts` (POST): Protected with `loadManagedCourse`.
- `app/api/admin/courses/[id]/duplicate/route.ts` (POST): Duplication assigns `creatorIdFor(user)` to new copy.
- `app/api/admin/courses/[id]/chapters/route.ts` (GET, POST): Protected with `loadManagedCourse`.
- `app/api/admin/courses/[id]/units/route.ts` (GET, POST): Protected with `loadManagedCourse`.
- `app/api/admin/courses/[id]/syllabus/route.ts` (GET, POST): Protected with `loadManagedCourse`.
- `app/api/admin/courses/[id]/leads/route.ts` (GET, POST, PATCH): Protected with `loadManagedCourse`.
- `app/api/admin/courses/[id]/lessons/route.ts` (POST, PUT, DELETE): Protected with `requireManagedChapter` and `requireManagedLesson`.
- `app/api/admin/courses/[id]/demo-slots/route.ts` (POST, DELETE): Protected with `loadManagedCourse`.
- `lib/actions/admin/courses.ts`: `updateCourseDraft`, `updateCourseInline`, `updateCourseThumbnail`, `deleteDraft`, `togglePublishStatus` all guarded with `loadManagedCourse`.
- `lib/actions/admin/course-metadata.ts`: `updateCourseMetadataAction` guarded with `loadManagedCourse`.
- `lib/actions/admin/publishing.ts`: `publishCourse`, `unpublishCourse` guarded with `loadManagedCourse`.
- `lib/actions/admin/chapters.ts`: `createChapter`, `updateChapter`, `deleteChapter`, `reorderChapters` all guarded with `loadManagedCourse` or `requireManagedChapter`.
- `lib/actions/admin/lessons.ts`: `createLesson`, `updateLesson`, `deleteLesson`, `reorderLessons` all guarded with `requireManagedChapter` or `requireManagedLesson`.

### 2. Open Risks / Identified Surface Gaps
1. **Teacher Central Library Route (`/api/admin/teachers`)**:
   - `app/api/admin/teachers/route.ts` and `app/api/admin/teachers/[id]/route.ts` enforce role check (`ADMIN` or `TEACHER`), but because teachers are a global pool (many-to-many relationship with courses), any teacher can update central teacher profiles or attach them to courses. If granular teacher-profile ownership is required in the future, a `createdById` field on `model Teacher` will be needed.
2. **Read-Only Reporting Script (`scripts/report-null-creator-courses.ts`)**:
   - Currently reports 21 courses with `createdById: null` on the test database. These courses will fail closed (inaccessible to TEACHER roles except ADMIN). Until an intentional owner backfill or claim flow is implemented, only ADMINs can edit legacy courses.
3. **Course Upload Endpoint (`/api/admin/courses/upload`)**:
   - Accepts media uploads for authorized users with file size / MIME validation, but does not bind uploads to a specific course ID at upload time (presigned URL style).

---

## 4. Decisions I Made

1. **No Automatic Backfill**: As instructed, legacy courses with `createdById = null` were **NOT** backfilled with an arbitrary user. They remain `null`, failing closed so that only `ADMIN` (and demo-teacher in explicit demo mode) can modify them.
2. **Duplication Ownership**: When duplicating a course via `app/api/admin/courses/[id]/duplicate/route.ts`, the creator of the new clone is set to `creatorIdFor(user)` (the user who pressed duplicate), rather than inheriting the original author's ID.
3. **Hindi Stats Numbers Kept in English**: Hindi twin mode displays bilingual Hindi headings, titles, descriptions, and labels, but retains numeric metrics (e.g. `₹4,999`, `9 Lectures`, `14 Hours`) in English numerals per owner instruction.
4. **Honest Test Reporting**: Playwright E2E suites that encountered selector timeouts or assertion mismatches in the headless dev environment are reported raw as **FAIL** without altering the tests or fabricating passes.
5. **Runtime Teacher Independence**: Removed runtime dependencies on `data/teacher-library.json` from `app/(dashboard)/courses/[slug]/page.tsx` and optimized `lib/teachers/library.ts` so all production/runtime reads flow directly through Prisma.

---

## 5. Owner Next Steps (Manual Execution Required)

The owner must manually execute the following four steps against the target dev/production environment:

### Step 1: Back up the dev database
```bash
pg_dump -Fc -v -h <dev-db-host> -U postgres -d postgres > backup_pre_run3_$(date +%Y%m%d_%H%M%S).dump
```

### Step 2: Deploy the Prisma migration to dev
```bash
npx prisma migrate deploy
```
*(This applies `prisma/migrations/20261105185545_add_course_created_by` adding `createdById` and index `Course_createdById_idx` safely with `onDelete: SetNull`).*

### Step 3: Seed Central Teacher Library into Prisma
```bash
npx tsx scripts/seed-teacher-library.ts
```
*(Seeds any unmigrated faculty profiles from `data/teacher-library.json` into the `Teacher` table).*

### Step 4: Audit courses with null creators
```bash
npx tsx scripts/report-null-creator-courses.ts
```
*(Outputs the total count and list of legacy course IDs where `createdById` is null, indicating ADMIN-only access).*

---

## 6. Git Revision History

```text
04fed4c test(gates): record raw output across all gates and type-narrow ownership integration test
182ef72 fix(teachers): remove runtime reads of teacher-library.json and record raw test evidence
f499e5c docs: update course detail v2 audit report with honest unfinished items
388b085 fix(test): resolve duplicate screenshot capture, regenerate distinct images and capture sticky card
9e7771e fix(auth): add createdById course ownership relation, creation sites and mutation guards
0d38ada fix(auth): select createdById in MANAGED_COURSE_SELECT and pass through in loadManagedCourse
99d42a9 chore: ignore apps/mobile/node_modules
e01f39f docs: add trial reports, evidence artifacts, and lockfile impact documentation
562272f feat(course-detail-v2): course detail v2 components, preview modals, api routes, and evidence test suites
b053383 test(courses): capture distinct blank vs filled screenshots and verify visual hash differences
939601c fix(courses): omit empty units on public course page and surface empty unit warnings in Studio plan editor & completeness checklist
bf366d5 fix(course-detail): fix stats row wrapping, stack sticky card buttons cleanly, and offset floating AI button
463eb9b feat(course-studio): add edit-after-create support for lecture schedule, free preview, tab order, and theme tokens
62f7d0e feat(courses): add central teacher store with Prisma model, multi-course links and admin UI
029c218 fix(course-detail): fix live preview crash, robust error boundary, thumbnail fallback, hindi twins, and e2e proof suite
cbb2c23 test(course-detail): phase 5 - capture full visual evidence suite and proof pass
deb7fbe fix(course-detail): phase 4 - axe accessibility fixes in studio editor and course detail
1a9b1bb feat(course-detail): phase 3 - proof of editability across 21 fields and reusable teacher library
e9c3a27 fix(course-detail): phase 2 - leak and scope hardening, restore shared package import, mobile viewmodel test
56c315f fix(course-detail): phase 1 - fix syllabus NaN, cover fallback, localization, and pluralization
58afaa0 fix(course-studio): complete full leak audit and strengthen generalization e2e assertions
685d389 fix(course-detail): eliminate Axe a11y violations, contrast issues, and verify spec gaps
7344865 test(course-studio): add E2E proof tests and unit tests for true course generalization
ee86482 feat(course-detail): generalize public course detail v2 rendering, teachers, lectures, and contrast guard
8e75ba9 feat(course-studio): add 9-step generalization wizard, multi-template picker, and derived values engine
e0f37e1 fix(course-studio): audit and eliminate hardcoded BPSC and brand data leakage
```
