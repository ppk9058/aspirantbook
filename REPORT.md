# Centralized Blurred Authwall System: Master Report & Verification

## Executive Summary
This document provides an end-to-end audit, architectural design, implementation verification, security analysis, and test proofs for the centralized "blurred Authwall" system across **Tutorials**, **Test Series**, **Previous Year Questions (PYQs)**, **Current Affairs**, and **Quizzes**.

---

## Step 0: Comprehensive Architecture & Security Audit

### 1. Module Load & Render Mapping

| Module | Primary Content Type | Public / Student Routes | Server / Client Architecture | Prisma Models Involved | Caching Layer |
|---|---|---|---|---|---|
| **Tutorials** | In-depth text chapters, markdown/Rosera JSON blocks, interactive code blocks, diagrams | `/tutorials`, `/tutorials/[slug]` | `app/(dashboard)/tutorials/[slug]/page.tsx` (`force-dynamic` RSC), renders `AspirantbookTutorialView` (Client), which mounts `RoseraRenderer` with chapter blocks | `Course` (`type = TUTORIAL`, `isPremium`, `price`), `Chapter`, `Lesson` (`content`, `isTrial`), `LessonVersion` (`blocks` JSON) | Force-dynamic server evaluation; `toSafeCourseDto` in `lib/courses/course-dto.ts` projects lesson DTOs; Router cache on client |
| **Test Series** | Exam mock tests, section groupings, bilingual questions, options | `/test-series`, `/test-series/[id]`, `/(exam)/test-series/[id]/instructions`, `/(exam)/test-series/[id]/attempt`, `/(exam)/test-series/[id]/solutions` | `app/(dashboard)/test-series/[id]/page.tsx` (`force-dynamic` RSC) renders `TestSeriesDetailClient`; CBT attempts run in `AttemptClient` | `ExamSeries`, `ExamTest`, `ExamSection`, `ExamQuestion`, `ExamAttempt`, `ExamAttemptAnswer` | Force-dynamic routes; user-status memory cache in `lib/exam/batched-user-status.ts`; attempt state cached in IndexedDB (`lib/exam-idb.ts`) |
| **Previous Year Questions (PYQ)** | Official PDF exam papers, bilingual answer keys & solutions, CBT simulations | `/pyqs`, `/pyqs/[examId]`, `/pyqs/pdf-view` | `app/(dashboard)/pyqs/[examId]/page.tsx` (`force-dynamic` RSC) renders `PyqStudentListingClient`; `/pyqs/pdf-view` renders `SecurePdfViewer` | `PyqCategory`, `PyqSubExam`, `PyqPaper` (`paperPdfUrl`, `solutionPdfUrl`, `accessType`, `cbtTestId`, `hasCbtMode`) | Force-dynamic; direct DB reads via `lib/pyqs-service.ts` (`ensureDefaultPyqData`, `getAllPapers`, `getPaperById`) |
| **Current Affairs** | Monthly magazine compilations (PDFs), daily speed test quizzes | `/current-affairs-quizzes`, `/current-affairs-quizzes/[slug]`, `/current-affairs-quizzes/[slug]/instructions` | `app/(dashboard)/current-affairs-quizzes/[slug]/page.tsx` (`force-dynamic` RSC) with clean SEO slugs and JSON-LD schema | `CurrentAffairsPdf` (`pdfUrlEn`, `pdfUrlHi`), `ExamTest` (`testType = CURRENT_AFFAIRS`) | Force-dynamic; batched status cache; clean slug resolution in `lib/current-affairs/slugs.ts` |
| **Quizzes** | Timed question sets with positive/negative marking and instant evaluation | `/current-affairs-quizzes/[slug]`, `/test-series/[id]` | Server-side metadata & JSON-LD `Quiz` schema; attempt execution via CBT engine | `ExamTest`, `ExamSection`, `ExamQuestion`, `ExamAttempt` | Protected behind `/api/exam/attempt/start` and `/api/exam/[testId]/questions` |

---

### 2. Full Content & Answer Leakage Audit (Current State Before Authwall)

Every place where full content, PDFs, or answers can reach a guest today without authentication:

1. **Tutorials (`/tutorials/[slug]`)**:
   - In `lib/courses/course-dto.ts` (`toSafeLessonDto`):
     ```typescript
     const allowContent = isUnlocked || (isFreeTutorial && rawLesson.type !== "VIDEO" && !rawLesson.videoUrl);
     if (allowContent) safe.content = rawLesson.content ?? null;
     ```
   - For any free tutorial (`course.isPremium === false` and `price === 0`), `hasAccess` evaluates to `true` for unauthenticated guests.
   - **Leak Vector:** 100% of the entire tutorial's lesson text, HTML, and JSON blocks are transmitted in the initial HTML document, serialized in the RSC payload (`self.__next_f.push(...)`), and accessible in client DOM. Anyone can view all content without an account.

2. **Previous Year Questions (`/api/pyqs/[paperId]` & `/pyqs/pdf-view`)**:
   - In `app/api/pyqs/[paperId]/route.ts`:
     If `paper.status !== "DRAFT"`, the endpoint returns the raw `paper` record without verifying user authentication or entitlement.
   - **Leak Vector:** `paperPdfUrl` and `solutionPdfUrl` are exposed to unauthenticated callers. A guest navigating to `/pyqs/pdf-view?paperId=...` directly loads and downloads the complete paper PDF and answer key via `SecurePdfViewer`.

3. **Current Affairs PDFs (`/api/current-affairs/pdfs`)**:
   - In `app/api/current-affairs/pdfs/route.ts` and `app/(dashboard)/current-affairs-quizzes/page.tsx`:
     Published PDFs are fetched directly and returned to guests.
   - **Leak Vector:** Full download URLs for English and Hindi monthly magazines (`pdfUrlEn`, `pdfUrlHi`) are sent to guests.

4. **Test Series & Quizzes (`/api/exam/[testId]/questions`)**:
   - `/api/exam/[testId]/questions` already returns `401 Unauthorized` for guests. Attempt starting (`/api/exam/attempt/start`) requires a session.
   - However, when tests or quizzes are previewed publicly on landing or category pages, there is currently no standardized server-side preview slice (e.g. first 20% of questions). If public question previewing is enabled without the Authwall, entire question lists could be sent to guests.

---

### 3. Inventory of the Four Existing Studios

All gate controls must be implemented **strictly inside these existing studios** for both `/admin` and `/teacher`. No new admin pages or navigation entries are created.

#### Studio 1: Tutorial Studio
- **Admin Edit Screen:** `app/admin/tutorials/[id]/edit/page.tsx` (renders `CourseEditClient` at `app/admin/courses/[id]/edit/CourseEditClient.tsx`)
- **Admin List Screen:** `app/admin/tutorials/page.tsx`
- **Teacher Edit Screen:** `app/(dashboard)/teacher/tutorials/[id]/edit/page.tsx` (re-exports `app/admin/tutorials/[id]/edit/page.tsx`)
- **Teacher List Screen:** `app/(dashboard)/teacher/tutorials/page.tsx` (re-exports `app/admin/tutorials/page.tsx`)
- **Item List Component:** `components/admin/ChapterList.tsx` (renders chapters and child lessons)
- **Item Editors:** `components/admin/ChapterEditor.tsx`, `components/admin/LessonEditor.tsx`
- **Existing Save Action:** `updateCourseDraft` in `lib/actions/admin/courses.ts`, `app/api/admin/courses/[id]/chapters/route.ts`
- **Import Flows:** `app/api/admin/tutorials/import/route.ts`, `lib/actions/admin/tutorial-import.ts`, `components/editor/TutorialImportModal.tsx`

#### Studio 2: Test Series Studio
- **Admin Edit / Package Detail:** `app/(dashboard)/admin/test-series/package/[id]/page.tsx` (renders `PackageDetailView` at `components/exam/PackageDetailView.tsx`)
- **Admin List Screen:** `app/(dashboard)/admin/test-series/packages/page.tsx`, `app/(dashboard)/admin/test-series/page.tsx`
- **Admin Create Screen:** `app/(dashboard)/admin/test-series/create/page.tsx`
- **Teacher Edit / Package Detail:** `app/(dashboard)/teacher/test-series/package/[id]/page.tsx` (renders `PackageDetailView`)
- **Teacher List Screen:** `app/(dashboard)/teacher/test-series/packages/page.tsx`, `app/(dashboard)/teacher/test-series/page.tsx`
- **Teacher Create Screen:** `app/(dashboard)/teacher/test-series/create/page.tsx`
- **Item List Component:** Inside `components/exam/PackageDetailView.tsx` (`tests` table)
- **Existing Save Action:** `app/api/exam/series/packages/[id]/route.ts` (GET/PATCH), `lib/exam-packages.ts`
- **Import Flows:** `components/admin/test-series/TestSeriesJsonImportModal.tsx`

#### Studio 3: Previous Year Questions (PYQ) Studio
- **Admin List & Manage Screen:** `app/admin/pyqs/page.tsx` (renders `PyqPapersListClient` at `components/admin/pyqs/PyqPapersListClient.tsx`)
- **Admin Upload Screen:** `app/admin/pyqs/upload/page.tsx`
- **Admin Categories:** `app/admin/pyqs/categories/page.tsx`
- **Teacher List & Manage Screen:** `app/(dashboard)/teacher/pyqs/page.tsx` (re-exports `app/admin/pyqs/page.tsx`)
- **Teacher Upload Screen:** `app/(dashboard)/teacher/pyqs/upload/page.tsx` (re-exports `app/admin/pyqs/upload/page.tsx`)
- **Teacher Categories:** `app/(dashboard)/teacher/pyqs/categories/page.tsx` (re-exports `app/admin/pyqs/categories/page.tsx`)
- **Item List Component:** `components/admin/pyqs/PyqPapersListClient.tsx`
- **Existing Save Action:** `app/api/admin/pyqs/papers/[id]/route.ts` (`PUT`), `lib/pyqs-service.ts` (`updatePaper`)
- **Import Flows:** `app/api/admin/pyqs/upload/route.ts`

#### Studio 4: Current Affairs & Quiz Studio
- **Admin Studio Screen:** `app/admin/current-affairs/page.tsx` (renders `CurrentAffairsStudioClient` at `components/admin/current-affairs/CurrentAffairsStudioClient.tsx`)
- **Teacher Studio Screen:** `app/(dashboard)/teacher/current-affairs/page.tsx` (re-exports `app/admin/current-affairs/page.tsx`)
- **Item List Component:** `components/admin/current-affairs/CurrentAffairsStudioClient.tsx`
- **Existing Save Action:** `app/api/admin/current-affairs/[id]/route.ts` (`PUT`), `app/api/admin/current-affairs/upload/route.ts`
- **Current Affairs Quizzes:** Linked directly with `ExamTest` records with `testType: "CURRENT_AFFAIRS"` under `current-affairs-system-series`.

---

## Step 1: Data Model and Two-Level Studio Controls

### 1. Schema Additions (Additive Only)
- **Level 1 Models (`Course`, `ExamSeries`, `PyqPaper`, `CurrentAffairsPdf`):**
  - `isGated` (Boolean, default `false`)
  - `previewPercentage` (Int, default `20`)
  - `seoMode` (String, default `"preview"`, values `"preview"` | `"bot-full"`)
  - `gateTitle` (String, nullable)
  - `gateSubtitle` (String, nullable)
- **Level 2 Models (`Chapter`, `ExamTest`):**
  - `gateMode` (String, default `"inherit"`, values `"inherit"` | `"free"` | `"preview"` | `"locked"`)
  - `previewPercentage` (Int, nullable, used when `gateMode = "preview"`)
- **Pre-chunking & Integrity Fields (`Lesson`, `ExamTest`, `PyqPaper`, `CurrentAffairsPdf`):**
  - `blockCount` (Int, nullable)
  - `contentHash` (String, nullable)

### 2. Migration & Backfill
- **Migration:** `prisma/migrations/20261016070000_add_authwall_gate_controls/migration.sql`
- **Application:** Applied cleanly to Docker test database (`127.0.0.1:54329/trillionskill_test`) and verified via `npm run db:check`.
- **Pre-chunker:** `lib/authwall/chunker.ts` with HTML-safe DOM block splitter (never cuts tags or code blocks), JSON question chunker, SHA-256 content hashing, and SEO diagnostics (word count + heading check).
- **Backfill Script:** `scripts/content-chunk.ts` executable via `npm run content:chunk`. Tested and verified 100% idempotent (0 items on repeated run).

### 3. Studio UI Controls Inside Existing Studios
- **Reusable Studio Controls:**
  - `components/admin/authwall/GateControlPanel.tsx`: Course/Series level panel with Enable toggle, preview slider + number input, seoMode select with descriptive SEO help, summary badges, and live crawler preview diagnostics.
  - `components/admin/authwall/ItemGateRowControl.tsx`: Per-item compact selector (Inherit / Free / Preview % / Locked) with status badge.
  - `components/admin/authwall/BulkGateActionBar.tsx`: Bulk multi-select action bar (Set Free, Set Locked, Set Preview %, Reset to Inherit, Make First N items Free).
- **Integrated Studios:**
  1. **Tutorial Studio (`CourseEditClient.tsx` & `ChapterList.tsx`):**
     - Course-level gate panel in course settings.
     - Per-chapter gate row control and bulk gate action bar.
     - Persists through `updateCourseDraft` and `updateChaptersGateMode` in `lib/actions/admin/chapters.ts`.
  2. **Test Series Studio (`PackageDetailView.tsx`):**
     - Series-level gate panel in package edit view.
     - Per-test gate row control and bulk gate action bar.
     - Persists through `PATCH /api/exam/series/packages/[id]` and `updateExamPackageGate` in `lib/exam-packages.ts`.
  3. **PYQ Studio (`PyqPapersListClient.tsx`):**
     - GateControlPanel inside paper edit modal.
     - Gate status badge in paper table rows.
     - Persists through `PUT /api/admin/pyqs/papers/[id]` and `updatePaper` in `lib/pyqs-service.ts`.
  4. **Current Affairs & Quiz Studio (`CurrentAffairsStudioClient.tsx`):**
     - GateControlPanel inside monthly digest creation and edit modals.
     - Gate status badge in digest list.
     - Persists through `POST /api/admin/current-affairs` and `PUT /api/admin/current-affairs/[id]`.

### 4. Verification
- `npm run db:check`: Exit 0 (all 8 Authwall columns verified in sync with no drift).
- `npm run content:chunk`: Exit 0 (151 lessons and 8 tests chunked; 0 on replay).
- `npx tsc --noEmit`: 65 legacy errors in 16 files (baseline preserved; 0 errors in touched code).

---
