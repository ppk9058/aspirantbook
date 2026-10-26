# STRATEGY & ARCHITECTURAL REVIEW: TRILLIONSKILL / ASPIRANTBOOK

## Summary
The codebase contains a sophisticated, working computer-based testing (CBT) engine with server-authoritative grading, but the business and product strategy are in severe disarray. The product attempts to be five companies at once (BPSC test-prep, coding bootcamp, live video school, K-12 bookshop, and current affairs portal) without a validated beachhead or distribution plan. The mobile "Reader model" relies on external website payment links (`AvailableOnWebsiteModal.tsx`) that directly violate Google Play Payments policy and will trigger store suspension. The eBook catalogue (`lib/books/data.ts`) contains egregious copyright and trademark infringements (unlicensed "PW" / PhysicsWallah and "R.D. Sharma" titles) that create existential legal liability under the Indian Copyright Act. A critical authentication bypass (`ts_demo_role` cookie in `middleware.ts` and `lib/auth/rbac.ts`) grants unauthenticated visitors full Admin role in production. For a solo founder 9 months unemployed, continuing multi-surface feature engineering is catastrophic; survival requires immediately discarding 70% of the surface area and monetizing one focused exam test-series wedge.

---

## Stage 1 - PRODUCT AND STRATEGY

### 1. User, Job-to-be-Done, and Differentiation
- **FACT**: `docs/PRD.md:3-9` states: *"Product baseline and proposed pilot direction; final segment selection is open... A segment has not yet been approved. The recommendation is to validate one exam/course cohort first; BPSC/state-PSC is a candidate hypothesis... not because market fit has been proven."*
- **FACT**: Code implements courses, video classroom, Piston code execution engine (`package.json:38`), Agora live classrooms (`prisma/schema.prisma:314`), timed CBT test series (`prisma/schema.prisma:844`), PYQ papers, current affairs PDFs, and an eBook store with digital checkout (`lib/books/bookService.ts`).
- **INFERENCE**: There is **no product differentiator visible in the codebase**—only an extensive feature catalogue. The code attempts to compete simultaneously against Testbook (CBT tests), LeetCode (coding runner), Zoom/Unacademy (live video), and Amazon/PW Store (books).
- **OPINION**: Indian exam aspirants (e.g., BPSC/UPSC) do not need another generic portal; they buy specific trust: high-fidelity test questions mapped to the latest exam syllabus with authentic Hindi/English explanations, reliable rank percentiles, and guidance from known teachers. A lone, unbranded platform offering an unfocused feature salad will lose to free Telegram channels and Testbook's ₹299/year pass.

### 2. Business Model & Shortest Path to Revenue
- **FACT**: The mobile app employs a "Reader model" with no in-app purchases. When content is locked, `apps/mobile/src/components/common/AvailableOnWebsiteModal.tsx:43-46` displays:
  ```tsx
  <Text style={styles.title}>Available on our website</Text>
  <Text style={styles.subtitle}>
    {reason || `"${displayTitle}" can be enrolled or unlocked on the AspirantBook website. Once enrolled, it will automatically sync to your mobile library.`}
  </Text>
  <Button title="Open in Browser" onPress={handleOpenWebsite} />
  ```
- **FACT**: Web payment processing is wired to Razorpay (`lib/payments/razorpay.ts`) and Stripe (`lib/payments/stripe.ts`).
- **FACT**: Zero-cost rule dictates zero SMS spend: `app/api/v1/auth/otp/request/route.ts:20-27` returns HTTP 501 `NOT_IMPLEMENTED` in production.
- **INFERENCE**: The "Reader app" model is a fatal illusion for test prep. Google Play allows Reader apps exclusively for pre-existing media (books, magazines, audio, video). Educational test-taking and course unlockings do not qualify. Furthermore, popping up an "Open in Browser to unlock" button that launches an external checkout is a direct violation of Google Play's Anti-Steering policy.
- **SHORTEST PATH TO FIRST PAYING USER**:
  1. Abandon the mobile store launch for the first paying transaction.
  2. Take the single strongest, vetted CBT test package (e.g., 70th/71st BPSC Prelims 10 Full Mocks).
  3. Sell it **directly on the web** via Razorpay UPI (QR code / payment link) at ₹199 - ₹299.
  4. Acquire first users manually through targeted BPSC Telegram / WhatsApp study groups by offering Mock 1 free, with Mocks 2–10 locked behind web payment.

### 3. Scope: Built vs. Half-Built vs. Ruthless MVP Cut
- **Built & Functional (FACT)**:
  - Timed CBT Exam Engine (`lib/services/exam.service.ts`, `lib/exam-grading.ts`): CAS-backed atomic submission, monotonic sequence answer syncing, server-calculated deadlines, automated rank/percentile scoring.
  - API v1 Core (`app/api/v1/*`): Uniform response envelope, JWT access + rotating opaque refresh tokens, account deletion with PII scrubbing (`lib/services/user.service.ts`).
  - Web Razorpay Checkout (`lib/payments/razorpay.ts`): Order creation, HMAC signature verification, webhook fulfillment.
- **Half-Built, Defective, or Stubs (FACT)**:
  - Mobile Auth (`apps/mobile/src/app/(auth)/login.tsx:94-108`): Google Sign-In and Mobile OTP buttons are literally stubbed with `Alert.alert("Google Sign-In initialized")` and `Alert.alert("OTP Sign-In initialized")`.
  - Books Subsystem (`lib/books/bookService.ts:8-9`): Persists data to local filesystem JSON (`data/books.json`, `data/book-orders.json`), completely non-viable on serverless/cloud.
  - Live Demo Classrooms (`prisma/schema.prisma:314, 434`): Implements real-time chat via 2-second database polling on PostgreSQL (`DemoChatMessage`).
  - Code Execution (`package.json:38`): Public Piston API wrapper, irrelevant to civil service exams.
  - Mobile PDF Viewer (`apps/mobile/src/components/common/PdfRenderer.tsx:120-130`): Shows an "Expo Go Preview Mode" mock box instead of rendering actual document content in standard Expo Go.
- **RUTHLESS MVP CUT**:
  - **DELETE/DEACTIVATE IMMEDIATELY**:
    - Books & Book Studio (removes legal risk and serverless JSON corruption).
    - Code execution engine & coding exercises.
    - Agora live demo classrooms & 2s chat polling.
    - Tracks, career paths, gamification XP/levels.
  - **RETAIN FOR V1**:
    - Web & Mobile Timed CBT Test Series (Bilingual Hindi/English).
    - Previous Year Question (PYQ) PDF viewing.
    - Email/Password auth + device session management.
    - Web-based Razorpay payment fulfillment.

### 4. Risks That Could Kill the Plan
1. **Google Play Anti-Steering Enforcement**: `AvailableOnWebsiteModal.tsx` linking to external web checkout for test unlockings will result in immediate rejection or developer account termination under Google Play Payments policy.
2. **Criminal Copyright Infringement**: `lib/books/data.ts:7-12` contains exact titles and authors of copyrighted commercial books:
   ```ts
   title: "PW CBSE Class 10 PYQs - Past 10 Years Solved Papers For 2027 Board Exams..."
   author: "PW / aspirantbook Academic Team"
   publisher: "PW Store / aspirantbook Publications"
   ```
   Distributing or advertising works under Physics Wallah ("PW Store") or "Dr. R.D. Sharma" (`data.ts:160`) without explicit written licensing is an open-and-shut violation of Sections 51 and 63 of the Indian Copyright Act (punishable by imprisonment up to 3 years and fines).
3. **Authentication Friction**: In the Hindi heartland (Bihar, UP), email + complex password signup causes >70% onboarding drop-off. Disabling real SMS OTP in production severely constricts organic mobile acquisition.
4. **Supabase Free Tier Inactivity Shutdown**: Supabase free projects automatically pause after 7 days of inactivity. If a prospective customer clicks a link after 8 days of quiet, the database fails with connection errors.


---

## Stage 2 - ARCHITECTURE AND DESIGN

### 1. Web / API v1 / Mobile / Shared Split & Duplication
- **FACT**: Monorepo split uses npm workspaces (`package.json:5-8`): `packages/shared`, `apps/mobile`, and the root Next.js 15 App Router app.
- **FACT**: `@aspirantbook/shared` cleanly exports contracts and Zod schemas (`packages/shared/src/index.ts`).
- **Coupling & Duplication Points**:
  - **Divergent Authentication Models**: Web uses NextAuth.js v5 beta with session cookies (`auth.ts`), whereas Mobile API v1 uses custom JOSE JWT bearer access tokens with SHA-256 hashed refresh tokens (`app/api/v1/auth/*`, `prisma.deviceSession`). Web mutations bypass API v1 entirely, using direct Server Actions.
  - **Duplicated Exam Grading**: Exam scoring logic is implemented twice: pure math helper in `packages/shared/src/exam-grading.ts` (`calculateExamScore`), and database CAS workflow in `lib/exam-grading.ts` (`gradeExamAttempt`).
  - **Shared Package Build Step**: Shared package has no compiled `dist/` and points `main` directly to TypeScript source (`packages/shared/package.json:5: "main": "./src/index.ts"`). Works because Next.js and Metro both transpile monorepo packages, but prevents independent consumption.

### 2. Data Model (`prisma/schema.prisma`)
- **Strengths**: Explicit foreign keys, cascade rules, clear enum definitions, and PII anonymization on deletion (`lib/services/user.service.ts:166-175`).
- **Scale Bottlenecks (10k to 100k Users)**:
  - **`ExamAttemptAnswer` Row Explosion**: Each 150-question mock test generates 150 child rows (`schema.prisma:1060`). For 10,000 active students taking 10 mock tests, the table reaches **15,000,000 rows**. On Supabase Free Tier (500MB storage limit), this single table will exhaust database quota.
  - **Postgres-Backed Rate Limiting**: `schema.prisma:1322` (`model RateLimit`). Every single API call invokes an `INSERT ... ON CONFLICT DO UPDATE` query against PostgreSQL (`lib/rate-limit.ts:60-70`). At 100 req/sec, this creates 100 concurrent DB write transactions, swamping the Postgres connection pool and starving core queries.
  - **Database Chat Polling**: `schema.prisma:436` (`model DemoChatMessage`). The schema explicitly documents 2-second database polling (`// Live Demo Chat (real-time via 2-second DB polling with since-cursor)`). 200 concurrent video learners create 100 queries/sec on PostgreSQL just to check for new chat messages.
  - **Missing Composite Indexes**: `AuditLog` (`schema.prisma:1386`) has individual indexes on `actorId`, `action`, `targetId`, and `createdAt`, but lacks composite indexes for `[actorId, createdAt]` or `[targetId, createdAt]`, causing sequential scans during audit reviews.

### 3. API v1 Design
- **Response Envelope Consistency**: High. All routes utilize `lib/api/v1/response.ts`, guaranteeing uniform `{ ok: true, data }` or `{ ok: false, error: { code, message } }` with `x-request-id` headers. Internal Prisma codes (`P2002`, `P2025`) are sanitized to `409 CONFLICT` and `404 NOT_FOUND` without leaking SQL details.
- **Pagination**: Consistent. Enforced default of 20 and max of 50 items across tests, library, and tutorial routes (`tests/api-v1-budgets.test.ts:58-75`).
- **Caching & ETags**: `apiCachedSuccess` calculates MD5 payload ETags and answers conditional HTTP `If-None-Match` requests with `304 Not Modified`, saving egress bandwidth.
- **Server-Authoritative Timing & Grading**: The grading engine in `lib/exam-grading.ts:152-185` calculates duration using `Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000)` against the database timestamp, strictly capping it at `durationMinutes * 60`. Client device clock changes cannot extend the test window.

### 4. Mobile Architecture
- **Offline Sync Flaw**:
  - **FACT**: In `apps/mobile/src/lib/cbt-sync.ts:16`, local answers are stored in `const localDb = new Map<string, LocalAnswerRecord>()`.
  - **INFERENCE**: The CBT sync queue is **in-memory only**. It is NOT backed by SQLite or SecureStore. If a student is taking an offline test in airplane mode and the app is killed by Android OS battery optimization or a phone call, all un-synced answers are permanently lost.
- **Expo SDK & Binary Dependencies**:
  - `apps/mobile/package.json:18` uses `expo: ^54.0.37` and `react-native: 0.81.5`.
  - The project imports native binary modules (`@config-plugins/react-native-pdf`, `@config-plugins/react-native-blob-util`).
  - **FACT**: In standard Expo Go, `apps/mobile/src/components/common/PdfRenderer.tsx:120-135` catches import failures and falls back to a non-functional placeholder screen ("Expo Go Preview Mode"). True PDF rendering requires building a custom dev client binary via EAS Build or `npx expo prebuild`.
- **Push Notifications**: Clean integration with `expo-notifications`, persisting tokens to `DevicePushToken` with device metadata.

### 5. Operational Readiness
- **Environments**: Docker test DB (`127.0.0.1:54329`) is strictly separated from Dev/Prod Supabase. `lib/boot-guard.ts` terminates startup if `APP_ENV=test` is paired with a non-local database.
- **Monitoring & Logging (CRITICAL GAP)**: There is zero application performance monitoring (APM) or crash reporting. No Sentry, no Winston/Pino logger, no log aggregator. Errors are emitted to stdout via raw `console.error`.
- **First Production Incident Reality**: If a production crash occurs on Vercel or Supabase, the founder has no automated alert, no error stack trace capture, and no telemetry. The first notification will be an angry message from a student.


---

## Stage 3 - BUGS AND FLAWS

| ID | Severity | File:Line | Finding | Evidence Snippet | Direction |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **CRITICAL** | `middleware.ts:13-15`<br>`lib/auth/rbac.ts:22-35`<br>`app/admin/layout.tsx:16-25` | Unauthenticated visitor can set `ts_demo_role=ADMIN` cookie to bypass NextAuth and gain full Admin privileges in production. | ```ts\n// lib/auth/rbac.ts:22-28\nconst demoRoleCookie = cookieStore.get("ts_demo_role")?.value\nif (!rawRole && demoRoleCookie && (demoRoleCookie === "ADMIN")) {\n  rawRole = demoRoleCookie\n}\n``` | Strip all `ts_demo_role` fallbacks unconditionally whenever `process.env.NODE_ENV === "production"`. |
| **BUG-02** | **HIGH** | `auth.config.ts:4` | `trustHost: true` blindly trusts client-supplied Host headers, enabling Host Header Poisoning. | ```ts\n// auth.config.ts:3-5\nexport const authConfig = {\n    trustHost: true,\n    pages: {\n``` | Remove `trustHost: true` and validate origins strictly against `AUTH_URL`. |
| **BUG-03** | **HIGH** | `lib/api/v1/tokens.ts:84-104` | Reauth token single-use tracking uses in-process JavaScript `Map`, failing across serverless lambdas. | ```ts\n// lib/api/v1/tokens.ts:84, 96\nconst usedReauthTokens = new Map<string, number>();\nexport function markReauthTokenUsed(jti: string) {\n  usedReauthTokens.set(jti, Date.now() + ttlMs);\n}\n``` | Persist consumed token JTIs in PostgreSQL or Redis rather than in-process memory. |
| **BUG-04** | **HIGH** | `apps/mobile/src/lib/cbt-sync.ts:15-18` | Mobile CBT offline answer queue stores answers in-memory; OS background kill causes total data loss. | ```ts\n// apps/mobile/src/lib/cbt-sync.ts:15-17\n// Memory-backed store for unit tests or fallback\nconst localDb = new Map<string, LocalAnswerRecord>();\n``` | Persist offline CBT answers to SQLite (`SQLiteKVAdapter`) immediately upon answer selection. |
| **BUG-05** | **HIGH** | `lib/rate-limit.ts:25-39` | Production IP rate limiter defaults all users to `127.0.0.1` if `TRUST_PROXY` env var is missing. | ```ts\n// lib/rate-limit.ts:26, 39\nif (process.env.NODE_ENV === "production" && !isTrustedProxy) {\n  console.warn("[RateLimit] TRUST_PROXY is not set...");\n}\nreturn "127.0.0.1";\n``` | Safely extract platform headers (e.g. `x-vercel-forwarded-for`) or fail startup if `TRUST_PROXY` is unset. |
| **BUG-06** | **MEDIUM** | `auth.ts:290-301` | Global `setMockSessionProvider` test hook is exposed in production auth module without environment guards. | ```ts\n// auth.ts:290-293\nlet mockSessionProvider: (() => any) | null = null\nexport function setMockSessionProvider(provider: (() => any) | null) {\n    mockSessionProvider = provider\n}\n``` | Wrap `setMockSessionProvider` in `if (process.env.APP_ENV !== "test") throw new Error(...)` or exclude from production. |
| **BUG-07** | **HIGH** | `lib/books/bookService.ts:8-9`<br>`lib/books/bookService.ts:536` | Books eCommerce writes to local filesystem JSON (`data/*.json`), failing on serverless deployments. | ```ts\n// lib/books/bookService.ts:8-9\nconst BOOKS_FILE = path.join(DATA_DIR, "books.json")\nconst ORDERS_FILE = path.join(DATA_DIR, "book-orders.json")\n``` | Eliminate filesystem persistence by migrating to PostgreSQL tables or deprecating the Books module. |
| **BUG-08** | **MEDIUM** | `apps/mobile/src/app/(auth)/login.tsx:94-106` | Mobile Google Sign-In and Mobile OTP buttons are stubbed with `Alert.alert` popups. | ```tsx\n// apps/mobile/src/app/(auth)/login.tsx:95\nonPress={() => Alert.alert("Google Sign-In", "Google Sign-In initialized")}\n``` | Remove unintegrated auth buttons from the UI until native SDKs are implemented. |
| **BUG-09** | **LOW** | `tests/e2e/real-only-series-catalogue.spec.ts:15-18` | Playwright E2E tests assert exact database table counts directly, causing false-positive batch failures. | ```ts\n// tests/e2e/real-only-series-catalogue.spec.ts:16-17\nif (scenario === "empty") {\n  expect(rows).toEqual([])\n}\n``` | Scope test assertions to isolated tenant fixtures rather than whole-table count matching. |
| **BUG-10** | **MEDIUM** | `lib/rate-limit.ts:86-94` | Rate limiter fails open on database error, eliminating all protection during DB load spikes. | ```ts\n// lib/rate-limit.ts:86-88\n} catch (error: any) {\n  console.error("[RateLimit] Database error... (failing OPEN):");\n  return { allowed: true, count: 0, ... };\n}\n``` | Fail closed on authentication and sensitive mutation routes when database errors occur. |


---

## Stage 4 - DIRECTION VERDICT

### 1. Honest Scores (1 to 10)
| Dimension | Score | One-Line Reason |
| :--- | :---: | :--- |
| **Product Clarity** | **2 / 10** | Tries to be five unrelated platforms at once without a validated student cohort or single customer interview. |
| **Architecture** | **6 / 10** | Clean CBT grading and uniform API v1 envelopes, crippled by filesystem JSON storage, in-memory state, and DB chat polling. |
| **Code Quality** | **6 / 10** | Strong TypeScript types and database transactions, undermined by non-functional mobile auth stubs and dev bypasses. |
| **Security** | **3 / 10** | Fatal `ts_demo_role` cookie allows complete unauthenticated administrative takeover of the production application. |
| **Test Confidence** | **5 / 10** | High test count, but monolithic E2E runs experience batch failures and tests couple directly to mutable database counts. |
| **Launch Readiness** | **2 / 10** | Severe Play Store anti-steering violations, copyright infringement in book seeds, no real SMS OTP, and zero APM/monitoring. |
| **Likelihood of Income in 6 Mo.** | **3 / 10** | Near zero as a generic app-store product; moderate (~5/10) only if stripped down to a single web-first BPSC test series. |

### 2. Over-Engineering Assessment
**Yes, profoundly over-engineered.** The repository displays textbook "AI-assisted over-engineering syndrome." The project has accumulated over 50 architectural specifications, business cases, QA matrices, multi-hour "audit run reports", and complex sub-systems (Piston multi-language code runner, Agora WebRTC live streaming, eBook authoring studio with PDF DRM, coupon engines with integer paise arithmetic) **before acquiring a single paying user or proving retention on one test**. The engineering effort has been spent optimizing solutions to problems the business does not yet have.

### 3. Next 30 Days Action Plan (Maximum 7 Items)
1. **Seal the Critical Security Backdoor (BUG-01)**: Strip `ts_demo_role` fallbacks from `middleware.ts`, `lib/auth/rbac.ts`, and `app/admin/layout.tsx` so unauthenticated visitors cannot assume the Admin role in production.
2. **Purge the Books Subsystem and Stolen Trademarks**: Delete `lib/books/data.ts`, `data/books.json`, and all associated book studio/store pages to eliminate severe criminal copyright liability under the Indian Copyright Act.
3. **Select ONE Single Exam Wedge**: Formally shelve coding, CBSE, and UPSC tracks. Select one cohort (e.g., 70th/71st BPSC Prelims) where high-quality bilingual questions and syllabus mapping can be verified.
4. **Fix Mobile Play Store Compliance**: Remove `AvailableOnWebsiteModal` external payment links. Either implement Google Play Billing (IAP) or position the mobile app strictly as a free companion runner for tests unlocked via the web.
5. **Persist Mobile CBT Answers to SQLite (BUG-04)**: Replace the in-memory `localDb` Map in `apps/mobile/src/lib/cbt-sync.ts` with SQLite storage so un-synced test answers survive app restarts and background termination.
6. **Execute a Web-First Paid Pilot**: Launch 1 free full-length mock and 5 paid mocks (₹199 total) on the web via Razorpay UPI; manually recruit 50 real BPSC aspirants from Telegram/WhatsApp study groups to test conversion.
7. **Install Basic Error Telemetry**: Add Sentry (`@sentry/nextjs`) to capture production crashes and unhandled exceptions instead of flying blind with `console.error`.

### 4. What to Stop Doing Right Now
- **Stop writing multi-hour audit run reports and QA matrices** that certify readiness for nonexistent users.
- **Stop building secondary feature domains** (no live video streaming, no coding execution, no eBook studios, no gamification badges).
- **Stop optimizing for mobile app store release before validating web checkout conversion**.

### 5. Top 5 Questions Only the Owner Can Answer
1. Which specific examination (e.g., BPSC Prelims) do you possess genuine academic content and authenticated question explanations for?
2. What is the legal provenance of the questions and answers currently in your database—did you write them, or were they scraped from copyrighted competitor materials?
3. With SMS OTP disabled in production to preserve zero cost, what is your plan to prevent massive drop-off among mobile aspirants who refuse to sign up with email and complex passwords?
4. How will you fund production hosting, domain renewals, and database scaling once Supabase free-tier limits (500MB storage ceiling) are exceeded by test answer rows?
5. What is your exact distribution channel to reach your first 100 students (personal coaching contacts, Telegram communities, YouTube, or direct outreach)?

---

## Unverified / Unknown List
1. **Actual User Traction**: UNKNOWN whether any real student outside the author has ever logged in, attempted a test, or paid.
2. **Question Database Provenance**: UNVERIFIED whether test questions in `seed-docker-test-db.ts` and `seed-mobile-test.ts` are legally clear or scraped from third parties.
3. **Production Deployment Target**: UNKNOWN where production Next.js is currently hosted (Vercel, AWS, VPS, or local only).
4. **Razorpay Activation Status**: UNVERIFIED whether the owner has an active, KYC-approved live Razorpay business account or only test-mode credentials.
5. **Current Cloud Database Disk Usage**: UNKNOWN how close the live Supabase database is to the 500MB free tier quota limit.
