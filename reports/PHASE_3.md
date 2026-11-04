# PHASE 3 — RBAC, tenant isolation, paid content, runtime guards

Branch `final-verify` @ `024579a` (+ this phase's working tree).
All runtime checks ran against the isolated stack only:

- Server: `http://127.0.0.1:3048` (Next dev, `APP_ENV=development`, `NODE_ENV=development`)
- DB: `127.0.0.1:54329/launch_verify`
- Tests: unit files only via `npx tsx --test` (no DB writes outside `launch_verify`)

Fixture principals (`reports/EVIDENCE/p3-seed.txt`, password `FinalVerify#2026`):
`fv.free@`, `fv.premium@`, `fv.teacher.a@`, `fv.teacher.b@`, `fv.admin@example.test`.
Content fixtures (`reports/EVIDENCE/p3-seed-content.txt`, `p3-seed-premium.txt`,
`p3-seed-sub.txt`): draft course `fv-draft-a` (owner teacher A), published premium
course `fv-pub-a` (owner teacher A) with a paid and a trial lesson, exam series
`fv-series-a` (owner teacher A), active subscription for `fv.premium@`.

Legend: DONE / PARTIAL / SKIPPED / NOT TESTED / FAILED / NOT FOUND.

## 3.1 Page-level RBAC — DONE

Raw: `reports/EVIDENCE/p3-rbac-pages.txt`, `p3-rbac-admin-pages.txt`,
`p3-rbac-teacher-pages.txt`.

- Anonymous admin pages → `307` to `/login`; free/premium → `307` to `/`;
  teacher A → `/teacher` or an allowed studio; admin → `200`.
- Teacher studios: teacher A reached `courses`, `tutorials`, `pyqs`, `batches`,
  `current-affairs`; all other `/admin/*` studios returned `redirect`/`403`.
- No page produced a 500 or an unauthenticated `200`.

## 3.2 Admin API RBAC — DONE

Raw: `reports/EVIDENCE/p3-rbac-admin-api.txt` (all `/api/admin/*` route files).

- Anonymous → `401` everywhere.
- Free / premium student → `403` everywhere.
- Admin → `200`/`405` (405 = method not exported, expected).
- Teacher A → `200` only inside the five allowed studios; `403` elsewhere.
- Teacher A hitting a missing id returned `404` on the affected resources.
- After the demo-slots fix below, `GET /api/admin/courses/<missing>/demo-slots`
  no longer returns `200`; it now returns `404` (proved in `p3-demo-slots-after.txt`).

## 3.3 Course write ownership — DONE

Raw: `reports/EVIDENCE/p3-course-write.txt`.

Course `fv-draft-a` (`createdById` = teacher A) through
`PUT/DELETE /api/admin/courses/[id]`:

| caller | PUT | DELETE | result |
| --- | --- | --- | --- |
| anonymous | 401 | – | blocked |
| free student | 403 | – | blocked |
| premium student | 403 | – | blocked |
| teacher B (cross-tenant) | 403 | 403 | `Access Denied: you can only manage courses you created` |
| teacher A (owner) | 200 | – | allowed |
| admin | 200 | – | allowed |

Enforced by `requireManagedCourse` in
`app/api/admin/courses/[id]/route.ts:19` and `lib/auth/course-access.ts:52`
(`createdById === user.userId`).

## 3.4 Exam series write ownership — DONE

Raw: `reports/EVIDENCE/p3-series-write.txt`.

`PATCH /api/exam/series/packages/[id]` on `fv-series-a` (owner teacher A):

| caller | status |
| --- | --- |
| anonymous | 401 |
| free student | 403 |
| teacher B (cross-tenant) | 403 `Forbidden: You do not have permission to edit this package` |
| teacher A (owner) | 200 |
| admin | 200 |

Enforced at `lib/exam-packages.ts:493` (`role !== "ADMIN" && series.createdById !== userId`).

## 3.5 Demo-slot management ownership — FIXED

### Verified bug (before)

`app/api/admin/courses/[id]/demo-slots/route.ts` only checked
`role === TEACHER || ADMIN` on `GET`, `POST` and `DELETE`; it never loaded the
course. Consequences proved at runtime on teacher A's course:

- `GET` by teacher B → `200` (cross-tenant read of slots + booking counts).
- `POST` by teacher B → `200`, created a slot on teacher A's course
  (`{"id":"cmw2egzf7001mxp7997ounlce",...}`).
- `DELETE?slotId=<teacher A slot>` by teacher B → `200` (hard delete).

Raw: `reports/EVIDENCE/p3-demo-slots-before.txt`.

### Fix

`app/api/admin/courses/[id]/demo-slots/route.ts`

- `GET` (:13–:25): `getCurrentUserContext` + `requireManagedCourse(user, id)`.
- `POST` (:150–:161): same, before `prisma.demoSlot.create`.
- `DELETE` (:202–:227): load `demoSlot.courseId` first, `404` when missing, then
  `requireManagedCourse` on that course before `delete`.
- `facultyName` fallback switched from `session?.user?.name` to `user.name`.

### Proof (after)

Raw: `reports/EVIDENCE/p3-demo-slots-after.txt`, `p3-demo-slots-owner.txt`.

| action | caller | before | after |
| --- | --- | --- | --- |
| GET slots on A's course | teacher B | 200 | 403 |
| POST slot on A's course | teacher B | 200 | 403 |
| DELETE A's slot | teacher B | 200 | 403 |
| GET / POST own course | teacher A | 200 | 200 |
| DELETE own slot | teacher A | 200 | 200 |
| GET any course | admin | 200 | 200 |
| POST slot | free student / anon | 403 / 401 | 403 / 401 |
| DELETE unknown slot | any teacher | 500 | 404 |

The ownership policy itself is unit-tested in `tests/unit/course-ownership.test.ts`.

## 3.6 Teacher draft preview (dead owner check) — FIXED

### Verified bug (before)

`lib/courses/visibility.ts` allowed a TEACHER to preview a draft only when
`instructorId`, `authorId` or `userId` matched. The Prisma `Course` model has
none of those columns; the owner column is `createdById`
(`prisma/schema.prisma:121`). The branch was added in `0ff1366` and was dead
code, and no caller selected `createdById`, so no owner could ever match.

Runtime proof before the fix (`reports/EVIDENCE/p3-visibility-before.txt`):
teacher A got `404` on their own draft at `/courses/fv-draft-a` and
`/tutorials/fv-draft-a`, while admin got `200`.

### Fix

- `lib/courses/visibility.ts:13` — added `createdById` to `CourseLike`.
- `lib/courses/visibility.ts:32` — `createdById === userId` added to the owner test.
- Added `createdById: true` to the course selects that pass `userId`:
  `app/api/courses/[slug]/demo-slots/route.ts:27`,
  `app/(dashboard)/courses/[slug]/page.tsx:67`,
  `app/(dashboard)/courses/[slug]/demo/page.tsx:18`,
  `app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx:18`,
  `app/(dashboard)/learn/[courseSlug]/page.tsx:17`,
  `app/(dashboard)/tutorials/[slug]/page.tsx:26`.
- Passed `userId` on the lesson pages that previously omitted it:
  `app/(dashboard)/learn/[courseSlug]/[lessonId]/page.tsx:27,66,128` and
  `app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx:21,62`.

### Proof (after)

Raw: `reports/EVIDENCE/p3-visibility-after.txt`.

| route | anon | free | premium | teacher A (owner) | teacher B | admin |
| --- | --- | --- | --- | --- | --- | --- |
| `/courses/fv-draft-a` | 404 | 404 | 404 | **200** | 404 | 200 |
| `/tutorials/fv-draft-a` | 404 | 404 | 404 | **200** | 404 | 200 |
| `/courses/fv-pub-a` | 200 | 200 | 200 | 200 | 200 | 200 |

`/learn/*` returns `307` for authenticated users with no published lesson body;
that redirect is unrelated to visibility (admin gets the same 307).

### Regression test

`tests/unit/course-visibility.test.ts` (6 cases: owner, cross-tenant teacher,
anon, free, premium, teacher without id, legacy draft, published).
Fails on the pre-fix helper, passes after:

```
# before fix (helper from HEAD 024579a)
not ok 1 - course visibility: teacher-owned draft preview
# pass 5
# fail 1

# after fix
1..6
# tests 6
# pass 6
# fail 0
```

Raw before/after captured in this session; the committed test is
`tests/unit/course-visibility.test.ts`.

## 3.7 Paid lesson content gating — DONE

Raw: `reports/EVIDENCE/p3-lesson-gate.txt`.
Sentinels planted in `fv-pub-a` (premium): `SENTINEL_PAID_VIDEO`,
`SENTINEL_PAID_CONTENT_BODY`, `SENTINEL_PAID_ATTACH`.

| route | caller | status | video | content | attachment |
| --- | --- | --- | --- | --- | --- |
| `/learn/fv-pub-a/<paid>` | anon | 307 | NO | NO | NO |
| `/learn/fv-pub-a/<paid>` | free | 307 | NO | NO | NO |
| `/learn/fv-pub-a/<paid>` | premium (ACTIVE sub) | 200 | YES | YES | YES |
| `/learn/fv-pub-a/<paid>` | admin | 200 | YES | YES | YES |
| `/learn/fv-pub-a/<trial>` | free | 200 | YES | YES | NO (not set on trial) |
| `/courses/fv-pub-a/learn/<paid>` | free / premium | 307 `?locked=true` | NO | NO | NO |

Gate: `app/(dashboard)/learn/[courseSlug]/[lessonId]/page.tsx:66-101`
(premium course requires an `ACTIVE` subscription). No paid field is rendered
to a caller that fails the gate.

## 3.8 Exam answer / explanation leakage — DONE (code proof + contract)

- Question payloads used during an attempt select no answer columns:
  `app/api/exam/[testId]/questions/route.ts:28-50`.
- Full questions require an active `IN_PROGRESS` attempt owned by the caller,
  or ADMIN/author TEACHER (`:150-:180`); otherwise `403`.
- Attempt payload selects no `correctOption` / `explanation*`:
  `app/api/exam/attempt/[attemptId]/route.ts:25-92`.
- Result/solutions ownership + submission + live-window rules live in
  `lib/exam/access-control.ts:33` (`canViewSolutions`) and are reused by
  `app/api/exam/attempt/[attemptId]/result/route.ts:132` and
  `lib/services/exam.service.ts:720`. Cross-user attempt → `403`; unsubmitted →
  `403`; live test before `liveEndAt` → `403`.
- Test start entitlement (`checkTestAccess`) is called in
  `app/api/exam/attempt/start/route.ts:5,37`; free tests pass, paid tests require
  PREMIUM/ADMIN or an active subscription, otherwise `LOCKED`.

Raw HTTP attempt against a seeded paid test: **NOT TESTED** (no exam fixtures
seeded in this pass; covered above by code path, not by a live request).

## 3.9 Test-only routes and health — DONE

- `/api/test/health` → `404` under `NODE_ENV=development`
  (`reports/EVIDENCE/p2-test-health.txt` and re-checked this phase).
- `/api/test/seed`, `/api/test/login` → `404` (routes do not exist; the only
  `/api/test/*` file is `app/api/test/health/route.ts`).
- `GET /api/health` returns only booleans/counters:
  `status`, `commit`, `database.status`, `migrations.applied/pending`,
  `paymentsConfigured`, `storageBackend`, provider booleans. No key value,
  DSN, token or secret is present (`grep` over `app/api/health/route.ts` and
  `lib/health/health-service.ts` found only a `Boolean(process.env...)` check).

## 3.10 Cron endpoints — NOT FOUND

No `app/api/**/cron/**` route exists (`find app/api -path "*cron*" -name
route.ts` returned nothing). There is no cron surface to probe for `401`, so the
"cron 401" item cannot be tested in this repository as-is.

## Observations / HUMAN DECISIONS

1. **Subscription vs enrollment on the legacy lesson route — PARTIAL.**
   `/courses/[slug]/learn/[lessonId]` grants access with
   `isEditor || isEnrolled || isFreeCourse`
   (`app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx:125`) and ignores
   an active subscription, while `/learn/[courseSlug]/[lessonId]` accepts it.
   A paying subscriber is therefore redirected `?locked=true` when arriving
   from `components/course/CourseBundleView.tsx:238,521` or
   `components/learning/MyLearningClient.tsx:356,522`. This fails closed (no
   leak) but is a product inconsistency; changing which route is canonical is a
   product decision, not a security fix.
2. **demo-slots ownership policy for legacy courses.** After the fix, a TEACHER
   can no longer manage demo slots of a course with `createdById = null`
   (ADMIN only), matching the documented A8 policy in
   `lib/auth/course-access.ts:1-15`. The in-process `demo-teacher` exception is
   preserved by the shared helper.

## Verification commands (raw tails)

`npx tsc --noEmit`:

```
(no output; exit 0)
```

`npx next lint --file <changed files>`:

```
✔ No ESLint warnings or errors
```

`npx tsx --test tests/unit/course-visibility.test.ts`:

```
# tests 6
# pass 6
# fail 0
```

## Diff

```
 app/(dashboard)/courses/[slug]/demo/page.tsx       |  2 +-
 .../courses/[slug]/learn/[lessonId]/page.tsx       |  8 +++--
 app/(dashboard)/courses/[slug]/page.tsx            |  2 +-
 .../learn/[courseSlug]/[lessonId]/page.tsx         |  5 +--
 app/(dashboard)/learn/[courseSlug]/page.tsx        |  5 +--
 app/(dashboard)/tutorials/[slug]/page.tsx          |  2 +-
 app/api/admin/courses/[id]/demo-slots/route.ts     | 41 ++++++++++++++++------
 app/api/courses/[slug]/demo-slots/route.ts         |  1 +
 lib/courses/visibility.ts                          |  6 +++-
 reports/EVIDENCE/p2-prod-proof.ts                  |  2 +-
 10 files changed, 52 insertions(+), 22 deletions(-)
```

(`reports/EVIDENCE/p2-prod-proof.ts` change is a type-only cast so the evidence
script stops breaking `tsc`; no behaviour change.)

## Status summary

| item | status |
| --- | --- |
| Page RBAC | DONE |
| Admin API RBAC | DONE |
| Course write ownership | DONE |
| Exam series write ownership | DONE |
| Demo-slot ownership (read/write/delete) | FIXED, DONE |
| Teacher draft preview | FIXED, DONE |
| Paid lesson gating | DONE |
| Exam answer leakage | DONE (code path; live attempt NOT TESTED) |
| `/api/test/*` | DONE (404) |
| Health secret leakage | DONE (none) |
| Cron 401 | NOT FOUND |
| Subscription vs enrollment on legacy lesson route | PARTIAL / HUMAN DECISION |
