# FINAL REPORT — Course Studio Generalization

Branch: `feat/course-studio-generalize`
Run date: 2026-10-28
Verification entry point: `./course-studio-run/verify.sh` (add `RUN_E2E=1` + a running 3045 test server for the browser check)

---

## 1. What was asked vs. what was delivered

| Requirement | Status | Evidence |
| --- | --- | --- |
| One studio editor that can author any exam/course (UPSC, BPSC, SSC, Banking, Railways, Defence, Skills…) | **Done** | `components/admin/courses/VideoCourseEditorClient.tsx` + `components/admin/courses/studio/*`; `lib/courses/categories.ts` (18 categories, custom values allowed) |
| New "Course Detail" design on the public page | **Done** | `components/course/detail/*` (16 files), rendered by `app/(dashboard)/courses/[slug]/page.tsx` |
| Same design on mobile web + Expo app | **Partial → Done for mobile web, additive for Expo** | `apps/mobile/src/components/course/CourseDetailExtras.tsx` wired into `apps/mobile/src/app/courses/[id].tsx` |
| Brand text from one config ("AspirantBook") | **Done** | `lib/brand.ts` (`BRAND_NAME`, env-overridable) |
| Fully bilingual EN + HI, per-field Hindi→English fallback | **Done** | `lib/i18n/localized.ts`, `*Hi` columns + metadata twins, studio Hindi fields, web + mobile toggles |
| Exam syllabus optional per course (auto-hides) | **Done** | `lib/courses/syllabus.ts` → `hasSyllabus`; section hidden when no papers (`tests/course-studio-p4-db.test.ts`) |
| Batches stay separate (`data/batches.json`, `BatchForm`, `app/batches/*` untouched) | **Done** | `git status` shows no batch files modified |
| `metadataJson → batch → defaults` fallback kept | **Done** | `page.tsx` v2 branch: `metadataV2.teachers ?? batch.teachers`, `metadataV2.faqs ?? batch.faqs`, `metadataV2.language ?? batch.language` |
| `...existingMeta` preserved on studio save | **Done** | `handleSaveCourse` spreads `initialMeta` first |
| No `dangerouslySetInnerHTML` (except pre-existing JSON-LD) | **Done** | new detail components render plain text only |
| Reject `javascript:` / `data:` image URLs | **Done** | `stripUnsafeImageUrl` applied to instructor + teacher avatars |
| Additive migrations only | **Done** | `prisma/migrations/20261028000000_course_studio_generalize/migration.sql` (no DROP/RENAME/NOT NULL without default) |
| No changes to Razorpay/checkout/enrollment, Batches, Books, Tutorials studio | **Done** | v2 reuses the existing `useSamePageBuyNow` / `useEnrollActions` hooks; no payment files touched |
| Reader-model mobile: no price/buy UI added, honor `allowPurchases` | **Done** | web uses `ALLOW_COURSE_PURCHASES`; mobile component renders no pricing at all |
| Tests written first, mutation checks | **Done** | `tests/unit/course-studio-p4-draft.test.ts` (6), `tests/course-studio-p4-db.test.ts` (4), `course-studio-run/mutation-check.sh` (4 mutations, all caught) |
| Evidence, decisions, `verify.sh`, final report | **Done** | `course-studio-run/{PROGRESS.md,PROGRESS-P2-P3.md,DECISIONS.md,verify.sh,evidence/}` |
| Commit per phase, no push/merge | **Done** | `6f3ed8b` (P1), `5a5dd0a` (P2+P3), P4–P7 in the final commit on this branch |

---

## 2. Verification (raw)

```
$ RUN_E2E=1 BASE_URL=http://127.0.0.1:3045 ./course-studio-run/verify.sh
== Course Studio generalize — verify ==
   branch: feat/course-studio-generalize

PASS  web typecheck (npx tsc --noEmit)
PASS  web lint (npm run lint)
PASS  unit: course format / i18n / derive / ics / draft
PASS  db: units, syllabus authoring, PYQ counts
PASS  api: v1 course + callback contracts
PASS  mobile typecheck (apps/mobile npx tsc --noEmit)
PASS  e2e: course detail v2 (Playwright @ http://127.0.0.1:3045)

RESULT: PASS
```

Full repository suites (same commands used for the P0 baseline):

```
$ . ./course-studio-run/test-env.sh && npx tsx --test tests/unit/*.test.ts
# tests 230 / pass 226 / fail 4
$ . ./course-studio-run/test-env.sh && npx tsx --test tests/api-v1-*.ts tests/contract-v1.test.ts
# tests 143 / pass 143 / fail 0
```

The 4 failing unit tests belong to the 2 suites that were already red at P0
(`Cache tags are declared and invalidated (B-015, B-019)` and
`Exam Metrics & Single Source of Truth Tests`). **No new failures.**

Browser check (`tests/e2e/course-detail-v2.spec.ts`, 4/4):

```
✓ [desktop] v2 course renders the new detail design, English and Hindi
✓ [desktop] course without v2 metadata keeps the legacy detail view
✓ [mobile]  v2 course renders the new detail design, English and Hindi
✓ [mobile]  course without v2 metadata keeps the legacy detail view
```

Blast radius on real data (read-only):

```
$ npx tsx course-studio-run/proof-v2-scope.ts
courses total: 43
v2 detail path: 0
```

Every existing course keeps the legacy detail page until an author saves it in
the new studio (which writes `schemaVersion: 2`).

---

## 3. How to use it

1. Admin → Video Course Studio → open a course.
2. **Hero & Details** — title/subtitle/description EN + HI, exam, delivery language, first-class date, thumbnail badge, up to 4 hero metrics, pill tags, schedule/validity/disclaimer text, late-joiner note, "How it works", "What you get".
3. **Course Plan** — create units, assign chapters, reorder by drag-free ordering. Deleting a unit never deletes chapters.
4. **Exam Syllabus** (optional) — papers → sections; link a section to a unit and to a real PYQ subject/topic so the page shows real per-year counts. No papers ⇒ no syllabus section.
5. **Callback Leads** — view/update lead status, download CSV.
6. **Sections** — show/hide About, Plan, Syllabus, Teachers, FAQs, Lectures, Callback per course; Hindi completeness badge.
7. Save → the public page switches to the new design (metadata `schemaVersion: 2`).

---

## 4. Known limits & blockers

| # | Item | Detail | Owner action |
| --- | --- | --- | --- |
| B1 | **Dev/Supabase migration not deployed** | The additive migration was applied to the Docker test DB only. `AGENTS.md §0` makes the dev DB SELECT-only and §5 requires approval for schema writes, so deploying was out of scope for this run (DECISIONS D2). | `npx prisma migrate deploy` against dev when ready. Until then the studio's units/syllabus/leads tabs will 500 against dev because the tables do not exist there. |
| B2 | **V2 pricing is literal** | No legacy placeholder prices in the new design (D9). A v2 course with `price = 0` shows FREE. | Set the price in the Pricing panel before publishing. |
| B3 | **Mobile `.ics` share** | No `expo-sharing` / `expo-calendar` in the app; "Add to calendar" falls back to a Google Calendar URL / copy link. | Add `expo-sharing` if native file sharing is required. |
| B4 | **Mobile test runner** | `cd apps/mobile && npm test` never terminates here (>400 s, no output), and `tests/data-screens-courses.test.tsx` fails at module load inside `node_modules/react-native/index.js` (esbuild cannot parse RN's Flow entry). Both predate this work; the course `.ts` suites pass 12/12. | Investigate the mobile test script separately. |
| B5 | **Self-hosted fonts** | `next/font` was not used (build-time network dependency); the detail page relies on the system stack plus "Noto Sans Devanagari" when installed. | Add `next/font/local` if the design must be pixel-identical offline. |
| B6 | **No language cookie** | Language preference is stored in `localStorage` (`cd_lang`) on web; the mobile screen keeps state per session. No cross-device preference. | Add a preference column if it becomes a product requirement. |

---

## 5. Files added/changed (summary)

- **Config/domain**: `lib/brand.ts`, `lib/courses/{format,categories,languages,metadata-schema,derive,syllabus,ratings,callback,phone,course-dto,slug-aliases,visibility}.ts`, `lib/calendar/ics.ts`, `lib/i18n/localized.ts`.
- **Schema**: `prisma/schema.prisma`, `prisma/migrations/20261028000000_course_studio_generalize/migration.sql`.
- **APIs**: `app/api/courses/[slug]/callback`, `app/api/v1/courses/[id]/callback`, `app/api/admin/courses/[id]/{units,syllabus,leads,chapters,route.ts}`.
- **Public web**: `app/(dashboard)/courses/[slug]/page.tsx`, `components/course/detail/*`.
- **Studio**: `components/admin/courses/VideoCourseEditorClient.tsx`, `components/admin/courses/studio/*`.
- **Mobile**: `apps/mobile/src/components/course/CourseDetailExtras.tsx`, `apps/mobile/src/app/courses/[id].tsx`.
- **Shared DTO**: `packages/shared/src/dto/content.dto.ts`.
- **Tests**: `tests/unit/{course-format,course-studio-p3,course-syllabus-stats,course-studio-p4-draft}.test.ts`, `tests/course-studio-p4-db.test.ts`, `tests/api-v1-course-callback.test.ts`, `tests/e2e/course-detail-v2.spec.ts`.
- **Run artefacts**: `course-studio-run/*`.
