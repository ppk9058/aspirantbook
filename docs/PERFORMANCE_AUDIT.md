# Performance Audit & Architecture Benchmark Report

**Environment**: Next.js 15.1.4 App Router, SQLite / Prisma ORM, Node.js v20+  
**Benchmark Configuration**:
- **Mobile Viewport**: 390x844 (iPhone 12/13/14 native standard)
- **CPU Throttling**: 4x Slowdown via Chrome DevTools Protocol (`Emulation.setCPUThrottlingRate: 4`)
- **Network Profile**: Fast 4G (`150ms` RTT latency, `1.6 Mbps` download, `750 Kbps` upload)
- **Test Accounts**: Randomly generated isolated test users (Student with active pass, Teacher), cleaned up after test run.

---

## 1. Full Benchmark Comparison Table (Dev vs Prod)

Across 15 key student, public, and teacher flows under 4x CPU throttle and Fast 4G network emulation:

| Flow ID | Flow Name & Path | Role | Dev TTFB (ms) | Dev FCP (ms) | Dev LCP (ms) | Dev Total Load (ms) | Prod TTFB (ms) | Prod FCP (ms) | Prod LCP (ms) | Prod Total Load (ms) | First Load JS (Prod) |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `flow-01` | Public Homepage (`/`) | PUBLIC | 1347 | 2180 | 2180 | 13451 | 8 | 920 | 920 | 2052 | 106 kB |
| `flow-02` | Student Dashboard (`/dashboard`) | STUDENT | 113 | 892 | 892 | 14631 | 97 | 900 | 900 | 2113 | 183 kB |
| `flow-03` | Test Series Hub (`/test-series`) | STUDENT | 1157 | 1856 | 1856 | 12420 | 34 | 864 | 864 | 1679 | 126 kB |
| `flow-04` | Test Series Detail (`/test-series/bpsc-72nd-2026`) | STUDENT | 1775 | 2404 | 2404 | 13165 | 44 | 760 | 760 | 1605 | 126 kB |
| `flow-05` | Exam Instructions (`/test-series/.../instructions`) | STUDENT | 2512 | 3108 | 3108 | 12037 | 20 | 684 | 684 | 1387 | 117 kB |
| `flow-06` | Exam Attempt (`/test-series/.../attempt`) | STUDENT | 2971 | 3572 | 3572 | 12757 | 16 | 684 | 684 | 1443 | 126 kB |
| `flow-07` | Exam Result (`/test-series/.../result`) | STUDENT | 1811 | 2392 | 2392 | 11143 | 447 | 1152 | 1152 | 1800 | 116 kB |
| `flow-08` | Exam Solutions (`/test-series/.../solutions`) | STUDENT | 2725 | 3304 | 3304 | 12436 | 28 | 720 | 720 | 1639 | 121 kB |
| `flow-09` | My Tests (`/my-tests`) | STUDENT | 940 | 1548 | 1548 | 11998 | 103 | 788 | 788 | 2952 | 117 kB |
| `flow-10` | Courses Catalog (`/courses`) | STUDENT | 1363 | 2048 | 2048 | 13638 | 21 | 788 | 788 | 1850 | 145 kB |
| `flow-11` | Course Detail (`/courses/generative-ai`) | STUDENT | 3636 | 0* | 0* | 20827 | 22 | 2740 | 2740 | 2475 | **264 kB** |
| `flow-12` | Books Store (`/books`) | STUDENT | 1440 | 2260 | 2260 | 13093 | **616** | 1488 | 1488 | 2652 | 130 kB |
| `flow-13` | PYQs Hub (`/pyqs`) | STUDENT | 2046 | 3128 | 3128 | 13167 | 25 | 1048 | 1048 | 1606 | 121 kB |
| `flow-14` | Subscription & Pricing (`/subscription`) | STUDENT | 1293 | 2056 | 2056 | 12107 | 14 | 736 | 736 | 1526 | 110 kB |
| `flow-15` | Teacher Test Studio (`/teacher/test-series/create`) | TEACHER | 1888 | 2632 | 2632 | 13574 | 11 | 732 | 732 | 1623 | 138 kB |

*\*Note: On dev, heavy dynamic modules in Course Detail (`CourseDetailView.tsx` with Rosera & Universal editors) took >20s to compile on first hit, delaying paint metric registration.*

---

## 2. Top 10 Slowest Routes and Root Causes

| Rank | Route | Metric Peak (Prod / Dev) | Root Cause & Bottleneck Mechanism |
|:---:|---|---|---|
| **1** | `/courses/[slug]` | FCP: **2740ms** (Prod)<br>TTFB: **3636ms** (Dev) | **Massive Client Bundle (264 kB)**: `CourseDetailView.tsx` (1,978 lines) eagerly imports `UniversalEditor`, `RoseraEditor`, `Rosera CSS`, `TutorialImportModal`, and admin actions. Regular students viewing course details download authoring editor bundles unnecessarily. |
| **2** | `/books` | TTFB: **616ms** (Prod)<br>FCP: **1488ms** (Prod) | **Client-side Fetch Waterfall**: `app/(dashboard)/books/page.tsx` mounts empty, fires `useEffect` to `fetch('/api/books')`, which processes and sorts the full books catalog on every client visit without server component streaming. |
| **3** | `/api/user/goal` | Latency: **160ms - 2654ms** (Dev & Prod) | **Ubiquitous Provider Query**: `GoalProvider.tsx` runs in `app/providers.tsx` across EVERY route in the application. On mount, it calls `/api/user/goal`, triggering `auth()` session decoding and `prisma.enrollment.findFirst` database query for every student navigation. |
| **4** | `/test-series/[id]/result` | TTFB: **447ms** (Prod)<br>FCP: **1152ms** (Prod) | **Waterfall Client Join**: `useEffect` queries `/api/exam/attempt/[attemptId]/result`, joining nested sections, questions, and submission answers. Lacks compound index on `ExamAttempt(testId, status)` and `ExamAttemptAnswer(attemptId, questionId)`. |
| **5** | `/my-tests` | Load: **2952ms** (Prod)<br>Load: **11998ms** (Dev) | **`force-dynamic` Route & Unindexed Scans**: `export const dynamic = "force-dynamic"` forces recalculation on every request. Scans user attempts across all series without indexing `[userId, status, startedAt]`. |
| **6** | `/pyqs` | FCP: **1048ms** (Prod)<br>TTFB: **2046ms** (Dev) | **Multi-table Nested Waterfall**: `app/(dashboard)/pyqs/page.tsx` joins `PyqCategory`, `PyqSubExam`, and `PyqPaper` tables without indexed compound filtering on `[categoryId, subExamId]`. |
| **7** | `/test-series/[id]/attempt` | TTFB: **2971ms** (Dev)<br>Load: **12757ms** (Dev) | **Dual-Phase Client Fetch**: Page renders client-side skeleton, then fires two separate fetches: questions list via `/api/exam/[testId]/questions` and active attempt state via `/api/exam/attempt/start`. |
| **8** | `/test-series/[id]/instructions` | TTFB: **2512ms** (Dev)<br>FCP: **3108ms** (Dev) | **Client Data Waterfall**: Page fetches metadata via `fetch('/api/exam/${testId}/questions?metadataOnly=1')` inside `useEffect`, causing empty skeleton flash. |
| **9** | `/test-series/[id]/solutions` | TTFB: **2725ms** (Dev)<br>FCP: **3304ms** (Dev) | **Large Payload Client Fetch**: Client fetches entire question catalog with HTML explanations and markdown blocks via client `fetch`. |
| **10** | `/teacher/test-series/create` | TTFB: **1888ms** (Dev)<br>Load: **13574ms** (Dev) | **Monolithic Page Component**: Single file (2,663 lines) containing all steps, AI parsing, bulk modals, and state machines, causing slow hydration and re-renders on low-end devices. |

---

## 3. Investigation of Key Architectural Suspects

### 3.1 Middleware Database Calls
- **Finding**: **0 Database Calls in Middleware**.
- **Analysis**: `middleware.ts` exclusively consumes NextAuth's `auth()` helper configured through `auth.config.ts`. It reads and verifies JWT cookies (`next-auth.session-token`) using edge-compatible crypto without invoking Prisma or executing network fetches.
- **Verdict**: Clean. Not a performance bottleneck.

### 3.2 Redis Connectivity & Timeouts
- **Finding**: **Critical Eager Instantiation Bottleneck**.
- **Analysis**:
  - `lib/redis.ts` executes `export const redis = RedisClient.getInstance()` at module load time.
  - If `REDIS_URL` is omitted (as in standard local/dev environment), it defaults to `redis://localhost:6379` with `maxRetriesPerRequest: 3` and incremental reconnect delays up to `2000ms`.
  - When routes importing Redis (e.g. `/api/leaderboard`, `lib/actions/gamification.ts`) are hit while Redis is unreachable, requests block waiting for retry strategies and log connection errors (`ECONNREFUSED`).
- **Verdict**: Requires non-blocking lazy connection, fast timeout (150ms), and in-memory or database graceful fallback.

### 3.3 Client `useEffect` Fetches vs Server Components
- **Finding**: **17 Client Pages Waterfall via `useEffect` + `fetch()`**.
- **Major Offending Routes**:
  - `app/(dashboard)/books/page.tsx`: `/api/books`
  - `app/(dashboard)/books/[slug]/page.tsx`: `/api/books?slug=...`
  - `app/(dashboard)/test-series/page.tsx`: `/api/exam/series/list`
  - `app/(dashboard)/test-series/[id]/page.tsx`: `/api/exam/series/list` & `/api/exam/attempt/user-status`
  - `app/(exam)/test-series/[id]/instructions/page.tsx`: `/api/exam/${testId}/questions?metadataOnly=1`
  - `app/(exam)/test-series/[id]/result/page.tsx`: `/api/exam/attempt/${attemptId}/result`
  - `app/(exam)/test-series/[id]/solutions/page.tsx`: `/api/exam/attempt/${attemptId}/result`
  - `app/(dashboard)/doubts/page.tsx`: `/api/doubts`
  - `app/(dashboard)/teacher/test-series/page.tsx`: `/api/exam/test/list`
- **Verdict**: High priority. Transition catalog and initial view states to Server Components or cached Server Actions to eliminate client waterfalls and FCP delays.

### 3.4 `force-dynamic` & `no-store` Usage
- **Finding**: **15 Routes with `force-dynamic` and 2 APIs with `no-store`**.
- **Routes affected**:
  - `app/(dashboard)/my-tests/page.tsx`: `export const dynamic = "force-dynamic"`
  - `app/(dashboard)/purchases/page.tsx`: `export const dynamic = "force-dynamic"`
  - `app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx`: `export const dynamic = "force-dynamic"`
  - `app/admin/...`: 12 admin pages.
  - `app/api/exam/test/list/route.ts`: returns `Cache-Control: private, no-store`.
  - `app/api/courses/video-courses/route.ts`: returns `Cache-Control: private, no-store`.
- **Verdict**: Public catalogs and test listings should use ISR or tag-based revalidation (`unstable_cache` with `revalidateTag`), rather than complete cache disabling.

### 3.5 Missing `loading.tsx` and `<Suspense>` Boundaries
- **Finding**: **Severe Gap in Loading Boundaries**.
- **Analysis**:
  - Only **5** `loading.tsx` files exist across the entire repository.
  - **22** dynamic route directories (`app/(dashboard)/books/[slug]`, `app/(dashboard)/test-series/[id]`, `app/(exam)/test-series/[id]`, etc.) lack direct `loading.tsx` files.
  - **Zero** layout files (`app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/(exam)/layout.tsx`, `app/admin/layout.tsx`) wrap children in `<Suspense>`.
  - Consequence: When any component suspends or navigates, the UI either freezes until completion or falls back to root spinner, unmounting navigation shells and causing layout shifts.
- **Verdict**: High priority. Add targeted `loading.tsx` skeletons for all student and exam routes and `<Suspense>` wrappers around dynamic slot content.

### 3.6 Heavy Client Bundles
- **Finding**: **Authoring Tools Leaking into Student Views**.
- **Analysis**:
  - `CourseDetailView.tsx` bundles `RoseraEditor`, `UniversalEditor`, and `TutorialImportModal` directly, pushing first load JS of `/courses/[slug]` to **264 kB** (highest in the application).
  - Monaco editor is already properly wrapped in `LazyMonacoEditor.tsx` using `next/dynamic`.
  - Rosera and Universal editors should be similarly dynamic-loaded with `{ ssr: false }`.
- **Verdict**: Significant reduction possible by lazy-loading authoring tools on student surfaces.

### 3.7 Layout Data Fetching (GoalProvider, Chatbot)
- **Finding**:
  - `GoalProvider` fetches `/api/user/goal` on every page load via root `Providers`.
  - `/api/user/goal` executes session validation and `prisma.enrollment.findFirst` for every student visit.
  - `Chatbot.tsx` has mock responses (no backend fetch on mount), but is rendered eagerly into the DOM on every dashboard page.
- **Verdict**: Cache user goal in cookie/session during login to prevent recurring `/api/user/goal` network calls on every page navigation.

### 3.8 Database Indexes & Query Patterns
- **Finding**: Several high-frequency queries lack optimal compound indexes in `prisma/schema.prisma`:
  - `ExamAttempt`: `where: { userId, status }` and `where: { testId, status }` require compound indexes `@@index([userId, status])` and `@@index([testId, status])`.
  - `Enrollment`: `where: { userId }, orderBy: { enrolledAt: 'desc' }` requires `@@index([userId, enrolledAt])`.
  - `ExamTest`: `where: { seriesId, isPublished }` requires `@@index([seriesId, isPublished])`.
  - `PyqPaper`: `where: { categoryId, subExamId, year }` lacks compound index for multi-filter lookups.
- **Verdict**: Add targeted additive indexes via `CREATE INDEX IF NOT EXISTS` to drastically accelerate filtering and listing queries.

---

## 4. Ranked Priority Plan for Part 1

1. **P0: Skeleton Boundaries & Suspense Architecture**
   - Add route-specific `loading.tsx` skeletons for `/test-series/[id]`, `/test-series/[id]/attempt`, `/courses/[slug]`, `/books`, `/pyqs`, `/subscription`.
   - Wrap dynamic dashboard and exam page content in `<Suspense>`.
2. **P1: Lazy-Load Authoring Tools & Heavy Bundles**
   - Refactor `RoseraEditor`, `UniversalEditor`, and `TutorialImportModal` in `CourseDetailView.tsx` to `dynamic(() => import(...), { ssr: false })`.
   - Shrink `/courses/[slug]` bundle from 264 kB to < 140 kB.
3. **P2: Eliminate GoalProvider Layout Waterfall**
   - Read goal from cookie directly on first render; avoid triggering client `/api/user/goal` on every mount if cookie is already present.
4. **P3: Non-blocking Redis Singleton & Fast Timeout**
   - Guard `lib/redis.ts` against blocking connection attempts when `REDIS_URL` is unavailable.
   - Add 150ms timeout guard and memory cache fallback.
5. **P4: Additive Database Indexes**
   - Apply additive compound indexes:
     - `ExamAttempt(userId, status)`
     - `ExamAttempt(testId, status)`
     - `Enrollment(userId, enrolledAt)`
     - `ExamTest(seriesId, isPublished)`
6. **P5: Catalog Caching & Catalog API Optimization**
   - Cache `/api/books` and `/api/exam/test/list` responses with `stale-while-revalidate` HTTP headers.
