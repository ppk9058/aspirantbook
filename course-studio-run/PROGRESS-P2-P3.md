# PROGRESS — Course Studio Generalization (part 2)

## P2 — Additive schema

**Schema changes (additive only)**
- `Course`: `titleHi`, `subtitle`, `subtitleHi`, `descriptionHi` (nullable)
- `CourseUnit` (new): id, courseId, title, titleHi, tags[], order, timestamps
- `Chapter`: `unitId?` (FK, SetNull), `titleHi`, `descriptionHi`, `subtopics[]`, `subtopicsHi[]`
- `Lesson`: `titleHi`, `contentHi`, `scheduledAt` (+ index)
- `CourseCallbackLead` (new) + `CallbackLeadStatus` enum, indexes on courseId, createdAt, (courseId, mobile, createdAt)
- `CourseSyllabusPaper` / `CourseSyllabusSection` (new) + link to PYQ taxonomy via `pyqSubject` → `ContentEngineQuestion.sub`, `pyqTopic` → `.top`

**Migration SQL generation**
```
$ git show HEAD:prisma/schema.prisma > /tmp/old-schema.prisma
$ npx prisma migrate diff --from-schema-datamodel /tmp/old-schema.prisma \
    --to-schema-datamodel prisma/schema.prisma --script
-- CreateEnum / ALTER TABLE ... ADD COLUMN (all nullable or array-with-default)
-- CreateTable x4 / CreateIndex / AddForeignKey
```
Line-by-line review: no `DROP`, no `RENAME`, no `NOT NULL` without default. Saved to
`prisma/migrations/20261028000000_course_studio_generalize/migration.sql`.

**Applied to the test DB only**
```
$ . ./course-studio-run/test-env.sh && npx prisma migrate deploy
The following migration(s) have been applied:
  └─ 20261028000000_course_studio_generalize/
All migrations have been successfully applied.
$ npx prisma migrate status
25 migrations found in prisma/migrations
Database schema is up to date!
$ npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
No difference detected.
```
**Dev/Supabase deploy: BLOCKED by AGENTS.md §0** (see DECISIONS D2).

## P3 — Pure logic + APIs

**Tests first (red)**
```
$ npx tsx --test tests/unit/course-studio-p3.test.ts
Error: Cannot find module '../../lib/calendar/ics'
```
Saved: `evidence/p3-red.txt`

**Green**
```
$ npx tsx --test tests/unit/course-studio-p3.test.ts tests/unit/course-syllabus-stats.test.ts
# tests 33 / suites 7 / pass 33 / fail 0
```

**Added**
- `lib/calendar/ics.ts` — RFC 5545 (CRLF, 75-octet UTF-8-safe folding, escaping, stable UID, DTSTAMP, UTC), course export, Google Calendar URL, filename.
- `lib/courses/derive.ts` — lecture count, total hours, first/last class, recording-ready, late-joiner (`{n}` template, hide after end), started/starts label, IST formatters.
- `lib/courses/phone.ts` — `normalizePhoneToE164`, `isE164`, `maskPhone`.
- `lib/courses/metadata-schema.ts` — zod v2 with `.passthrough()`, size caps, `readSectionFlags`, `stripUnsafeImageUrl`.
- `lib/courses/callback.ts` — shared lead capture: zod, E.164, honeypot, rate limit (3/hour/IP+mobile), 24h dedupe, generic responses, `leadsToCsv`.
- `lib/courses/syllabus.ts` — real PYQ stats (per-year counts from `ContentEngineQuestion`), most-asked ordering, 1h cache.
- `lib/courses/ratings.ts` — real rating distribution, hidden when 0 reviews.
- `POST /api/courses/[slug]/callback`, `POST /api/v1/courses/[id]/callback`.
- `GET|PATCH /api/admin/courses/[id]/leads` (+ CSV), guarded by `requireManagedCourse`.
- `CourseDetailDto` extended additively (all new fields optional).

**Callback security tests**
```
$ npx tsx --test tests/api-v1-course-callback.test.ts
# tests 7 / pass 7 / fail 0
```
Covers: E.164 storage, 24h dedupe, honeypot, invalid numbers → generic success, unknown course → generic success, rate limit, CSV masking.

**Mutation checks (4 critical implementations)**
```
$ ./course-studio-run/mutation-check.sh
PASS: ics folding fails when implementation is broken
PASS: dto sanitizer fails when implementation is broken
PASS: rate limit fails when implementation is broken
PASS: resolveCourseFormat fails when implementation is broken
mutation failures: 0
```
Saved: `evidence/p3-mutation.txt`

**DTO no-leak proof (guest)**
Included in `tests/unit/course-studio-p3.test.ts` → "guest gets no video/content/attachment/Hindi content".
`contentHi` is gated in the same branch as `content`, so Hindi lesson bodies cannot leak to guests.

**Regression suites still green**
```
$ npx tsx --test tests/api-v1-courses-learning.test.ts tests/api-v1-course-callback.test.ts
# tests 16 / pass 16 / fail 0
```
