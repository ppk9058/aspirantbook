# Mobile App Diagnosis Report: OTP Login & Performance

**Date:** 2026-11-03  
**Repository:** `/Users/praveenkumar/TrillionSkill`  
**Web Framework:** Next.js 15 App Router, NextAuth v5, Prisma ORM, PostgreSQL (Supabase)  
**Mobile Framework:** Expo SDK 57 (`expo: ^57.0.0`), React Native `0.86.3`, React `19.2.3`, Expo Router `~57.0.29`, `@tanstack/react-query: ^5.62.11`, `expo-sqlite: ~57.0.4`, `expo-secure-store: ~57.0.4`  

---

## Part 1: OTP Login Missing in Mobile App

### 1a. How OTP Login Works on Web
- **UI Component:** [LoginForm.tsx](file:///Users/praveenkumar/TrillionSkill/components/auth/LoginForm.tsx#L205-L217) (lines 205–217) contains the button `"Continue with Mobile OTP (Instant)"`. This triggers the modal managed by [MobileAuthContext.tsx](file:///Users/praveenkumar/TrillionSkill/components/auth/MobileAuthContext.tsx#L121-L200) and [MobileAuthModal.tsx](file:///Users/praveenkumar/TrillionSkill/components/auth/MobileAuthModal.tsx#L1-L120).
- **Client OTP Flow:** In [MobileAuthContext.tsx](file:///Users/praveenkumar/TrillionSkill/components/auth/MobileAuthContext.tsx#L148-L170), OTP verification is explicitly documented: `Auto-verify without clicking: Accepts ANY 6-digit number as valid OTP`. The client does **NOT** call an SMS gateway to dispatch an SMS; it transitions from step `"phone"` to `"otp"`, allows typing any 6 digits, and calls `POST /api/auth/mobile-login`.
- **API Route:** [app/api/auth/mobile-login/route.ts](file:///Users/praveenkumar/TrillionSkill/app/api/auth/mobile-login/route.ts#L28-L167).
  - Rate Limiting: [lib/rate-limit.ts](file:///Users/praveenkumar/TrillionSkill/lib/rate-limit.ts#L6) via key `mobile_login:<ip>`, limiting to 10 requests per 60 seconds (lines 30–38).
  - Dev Bypass Check: Lines 52–62 verify:
    ```ts
    const isDevBypassEnabled =
        (!isProduction && process.env.ALLOW_DEV_MOBILE_LOGIN === "true") ||
        (process.env.APP_ENV === "test" && isLocalTestDb);
    ```
    If not enabled, it returns HTTP 503 (`"SMS OTP service is currently being configured. Mobile dev login is disabled."`).
  - Auto-creation: Creates a user with synthetic email `mobile_${phoneNumber}@aspirantbook.local` (lines 71–89).
- **NextAuth Provider:** [auth.ts](file:///Users/praveenkumar/TrillionSkill/auth.ts#L231-L284) implements `Credentials({ id: "mobile", ... })`. After `POST /api/auth/mobile-login`, the web client calls `signIn("mobile", { phoneNumber, redirect: false })` ([MobileAuthContext.tsx:180](file:///Users/praveenkumar/TrillionSkill/components/auth/MobileAuthContext.tsx#L180)). This creates a standard HTTP-only session cookie (`next-auth.session-token`).
- **SMS Vendor:** **NOT FOUND / NONE**. In [lib/boot-guard.ts](file:///Users/praveenkumar/TrillionSkill/lib/boot-guard.ts#L11-L15), environment variables `FAST2SMS_API_KEY`, `TWILIO_AUTH_TOKEN`, and `MSG91_AUTH_KEY` are checked to guard production boot, but **no SMS vendor integration or SDK exists anywhere in the codebase**. Web mobile OTP is purely a simulated dev bypass.
- **Environment Variables:** `ALLOW_DEV_MOBILE_LOGIN` (must be `"true"`), `NODE_ENV` (blocks bypass in `"production"`), `DATABASE_URL` (requires local test DB when `APP_ENV=test`).

### 1b. Mobile Login Screens & Visibility
- **Screen:** `apps/mobile/src/app/(auth)/login.tsx` (lines 1–382, present in branch `feat/launch-blockers` / `app/main`).
- **Methods Displayed:**
  - Email & Password form (default, line 27).
  - "Create Account" link (navigates to `/(auth)/register`, line 357).
  - "Explore as Guest" button (line 372).
  - **"Phone (OTP)" tab:** **CODED BUT CONDITIONALLY HIDDEN**.
- **Why Phone (OTP) is Hidden:**
  - In `login.tsx` line 44: `const [otpAuthEnabled, setOtpAuthEnabled] = useState(false);`
  - In lines 46–58, `login.tsx` executes `api.getConfig()` (`GET /api/v1/config`):
    ```tsx
    void api.getConfig().then((res) => {
      if (mounted && res.ok && res.data) {
        const enabled = Boolean(res.data.otpAuthEnabled);
        setOtpAuthEnabled(enabled);
        if (!enabled) setAuthMode("password");
      } else if (mounted) {
        setOtpAuthEnabled(false);
        setAuthMode("password");
      }
    });
    ```
  - In lines 197–235, the tab toggle is rendered inside `{otpAuthEnabled && ( ... )}`. If `otpAuthEnabled` is `false` or if `api.getConfig()` fails, the Phone (OTP) toggle is completely omitted from the UI.
  - In `lib/services/config.service.ts:14-16`, the server sets:
    ```ts
    const otpAuthEnabled = Boolean(process.env.SMS_API_KEY || isDevBypassAllowed());
    ```
    Because no SMS gateway is configured (`SMS_API_KEY` is empty) and in non-dev environments `isDevBypassAllowed()` returns `false`, `GET /api/v1/config` responds with `otpAuthEnabled: false`.

### 1c. Authentication Mechanism: Web vs Mobile
- **Current Mobile Auth:**
  - Login calls `POST /api/v1/auth/login` (`apps/mobile/src/lib/api.ts` -> `@aspirantbook/shared/src/client.ts:172`).
  - Refresh calls `POST /api/v1/auth/refresh`.
  - Token type: Custom Dual-Token Architecture — 15-minute Bearer JWT (`accessToken`) and 30-day opaque refresh token (`refreshToken`) tracked in the `DeviceSession` PostgreSQL table.
  - Storage: `Storage` (`apps/mobile/src/lib/storage.ts`) saves `accessToken` and `refreshToken` securely using `expo-secure-store`.
- **Can Mobile Use Web OTP Routes?**
  - **NO**. Web route `/api/auth/mobile-login` combined with NextAuth `signIn("mobile")` only issues a browser session cookie (`next-auth.session-token`). Native mobile clients do not consume browser cookies for API v1 requests; they require an `Authorization: Bearer <token>` header.
- **Is a Mobile-Friendly Token Endpoint Missing?**
  - **PARTIAL**: On branch `feat/launch-blockers`, dedicated native mobile OTP endpoints were implemented:
    - `POST /api/v1/auth/otp/request` ([app/api/v1/auth/otp/request/route.ts](file:///Users/praveenkumar/TrillionSkill/app/api/v1/auth/otp/request/route.ts#L1-L55))
    - `POST /api/v1/auth/otp/verify` ([app/api/v1/auth/otp/verify/route.ts](file:///Users/praveenkumar/TrillionSkill/app/api/v1/auth/otp/verify/route.ts#L1-L177)), which creates a `DeviceSession` and returns `{ tokens: { accessToken, refreshToken }, user }`.
  - **HOWEVER**: Both endpoints hard-block when `isDevBypassAllowed()` is false:
    ```ts
    if (!devBypass) {
      return apiError("NOT_IMPLEMENTED", "SMS OTP service is currently disabled. Please use email & password sign-in.", 501);
    }
    ```
    And in dev bypass, `verify` only accepts hardcoded `"123456"`. Real OTP generation, SMS delivery, and verification do not exist.
  - Furthermore, on the active checkout branch (`perf/exam-runtime`), the entire `app/api/v1/` tree was never merged.

### 1d. Mobile API Base URL & Web API Server Guards
- **Mobile Base URL Resolution:** `apps/mobile/src/lib/api-url.ts:77-133`.
  - Env vars: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_PORT` (default `3045`), `EXPO_PUBLIC_API_URL_SOURCE`.
  - Precedence: (1) `EXPO_PUBLIC_API_URL`, (2) Metro-derived bundler IP (`hostUri`/`linkingUri`), (3) Unconfigured error.
  - Profiles (`apps/mobile/eas.json`): Preview uses `https://api.aspirantbook.com`, production uses `https://aspirantbook.com`.
- **Server Middleware & Request Acceptance:**
  - [middleware.ts](file:///Users/praveenkumar/TrillionSkill/middleware.ts#L128-L157): Matcher protects `/admin/*`, `/api/admin/*`, `/login`, etc., but **does not match `/api/v1/*`**. Native requests to `/api/v1/*` are not blocked by Next.js middleware.
  - Auth resolver [lib/api/v1/viewer.ts](file:///Users/praveenkumar/TrillionSkill/lib/api/v1/viewer.ts#L36-L84) correctly extracts `Authorization: Bearer <token>` and validates against PostgreSQL `DeviceSession`.
  - Rate limiting on API v1 is handled per route via `lib/api/v1/rate-limit.ts` (5 req/min on OTP request, 10 req/min on verify).

### 1e. Root Cause Conclusion & Minimal Fix Plan

#### Root Cause
1. **No SMS Delivery Provider Implemented:** The web app's mobile OTP login is not a real OTP service—it is a dev bypass accepting any 6-digit number that issues NextAuth session cookies. No SMS provider (Twilio/Fast2SMS/MSG91) is wired.
2. **Dynamic Feature Flag Hiding Tab:** The mobile app's `LoginScreen` dynamically queries `GET /api/v1/config`. Because `SMS_API_KEY` is not configured and `isDevBypassAllowed()` is `false` in production, `otpAuthEnabled` is returned as `false`, causing the Phone (OTP) toggle to be completely omitted.
3. **Branch Drift:** The active git branch (`perf/exam-runtime`) does not contain `app/api/v1/` or `apps/mobile/src/` (they were developed on `feat/launch-blockers` / `app/main`).

#### Minimal Fix Plan (Plan Only - No Code Changes)
1. **SMS Gateway Integration:**
   - Create `lib/services/sms-otp.service.ts` connecting to Fast2SMS, Twilio, or MSG91.
   - Add database table or Redis cache for ephemeral OTP verification records (`phoneNumber`, `hashedOtp`, `attempts`, `expiresAt`).
2. **Enable Real Delivery in API v1 Routes:**
   - In `app/api/v1/auth/otp/request/route.ts`: Generate cryptographically secure 6-digit OTP, persist hash with 5-minute TTL, dispatch SMS via `sms-otp.service.ts`.
   - In `app/api/v1/auth/otp/verify/route.ts`: Verify hash, enforce maximum 3 failed attempts, create `DeviceSession`, issue JWT access and refresh tokens.
3. **Expose Feature Flag in Config:**
   - Update `lib/services/config.service.ts` to return `otpAuthEnabled: true` when `SMS_API_KEY` (or provider credentials) are present.
4. **Merge Upstream Branch:**
   - Merge `feat/launch-blockers` into the active working branch so `apps/mobile` and `app/api/v1` are available.

---

## Part 2: Mobile App Slowness

### 2a. Bundle & Dependency Weight
- **Framework & SDK:** Expo SDK 57 (`expo: ^57.0.0`), React Native `0.86.3`, React `19.2.3`.
- **Navigation:** `expo-router: ~57.0.29`, `react-native-screens: ~4.26.0`.
- **State & Data:** `@tanstack/react-query: ^5.62.11`, `expo-sqlite: ~57.0.4`, `expo-secure-store: ~57.0.4`, `zod: ^3.25.76`.
- **Top 15 Largest Dependencies in `apps/mobile/node_modules/`:**
  1. `expo-image`: **136.4 MB** (`.expo-image-pMJspZiZ`)
  2. `expo-sqlite`: **76.9 MB** (`.expo-sqlite-VmemzF1h`)
  3. `lucide-react-native`: **54.5 MB** (`.lucide-react-native-5epY32vO`)
  4. `hermes-compiler`: **47.5 MB** (`.hermes-compiler-yHmDiK64`)
  5. `react-native`: **34.7 MB** (`.react-native-raGQNY62`)
  6. `expo-modules-core`: **34.4 MB** (`.expo-modules-core-3HNnBQmX`)
  7. `typescript`: **24.1 MB** (`.typescript-Ma2AXQBw`)
  8. `react-native-worklets`: **19.2 MB** (`.react-native-worklets-XdjZIVjC`)
  9. `react-devtools-core`: **16.7 MB** (`.react-devtools-core-K1CNSZwu`)
  10. `expo-router`: **13.8 MB** (`.expo-router-PEV32Pm8`)
  11. `react-native-reanimated`: **12.3 MB** (`.react-native-reanimated-qWnWBABo`)
  12. `expo-video`: **11.4 MB** (`.expo-video-dvFHQdry`)
  13. `expo`: **10.3 MB** (`.expo-JodrS6PZ`)
  14. `react-native-screens`: **8.8 MB** (`.react-native-screens-kmNM5Prf`)
  15. `expo-file-system`: **8.3 MB** (`.expo-file-system-UkqagJCm`)
- **Unused & Bloated Libraries:**
  - `react-dom: 19.2.3` (7.3 MB): Listed under production `dependencies` in `apps/mobile/package.json:48`. Native Expo builds do not need `react-dom`.
  - `@expo-google-fonts` (18 MB in node_modules): Installed but never imported in mobile source code.
  - `expo-image` (136 MB in node_modules): Only imported in one single file (`tutorials/[slug]/[lessonId].tsx`).
  - `lucide-react-native`: Imported directly from the barrel (`import { Award, Clock, ... } from "lucide-react-native"`), preventing tree-shaking in Metro and forcing bundler to resolve hundreds of SVG components.
- **Images/Assets Over 300 KB:**
  - `assets/brand/splash-image.png`: **1,094,558 bytes (~1.09 MB)**. High cold-boot decoding penalty.
  - `assets/brand/icon-512.png`: **298,039 bytes (~298 KB)**.
- **Fonts Loaded at Startup:** **NOT FOUND / NONE**. No custom fonts loaded with `useFonts`. System default sans-serif is used throughout `apps/mobile/src/theme/tokens.ts`.

### 2b. Startup Path Bottlenecks
1. **Synchronous SQLite Cache Deserialization on Launch:**
   - `apps/mobile/src/app/_layout.tsx:24` calls `restoreQueryClient(queryClient)`.
   - In `apps/mobile/src/lib/cache-storage.ts:57-61`, `SQLiteKVAdapter.getItem()` executes `db.getFirstSync("SELECT value FROM kv_cache WHERE key = ?", [key])`.
   - In `apps/mobile/src/lib/query-persistence.ts:61-68`, it calls `JSON.parse(serialized)` on the full dehydrated cache of all previously visited screens, blocking the JS thread synchronously before rendering.
2. **Aggressive Cache Re-serialization on Every Query Event:**
   - `apps/mobile/src/app/_layout.tsx:27-31` subscribes to the TanStack Query cache:
     ```tsx
     queryClient.getQueryCache().subscribe((event) => {
       if (event?.type === "updated" && event.query.state.status === "success") {
         persistQueryClient(queryClient);
       }
     });
     ```
   - On **every individual query update**, `persistQueryClient` executes `dehydrate(queryClient)` and `JSON.stringify(dehydrated)` on the entire app's query cache, synchronously writing to SQLite via `db.runSync(...)`.
3. **Duplicate Network Request & Flash Redirect on Bootstrap:**
   - `apps/mobile/src/app/index.tsx:10-33` (`BootstrapScreen`): Displays an ActivityIndicator while calling `await Storage.getAccessToken()` and `await api.getMe()`.
   - Concurrently, `AuthProvider` (`apps/mobile/src/context/AuthContext.tsx:46-99`) also calls `await api.getMe()`.
   - `BootstrapScreen` always calls `router.replace("/(tabs)/home")` regardless of auth success, failure, or offline state, delaying the initial screen view behind redundant network roundtrips.

### 2c. Data Fetching Patterns (Top 5 Screens)
1. **Home (`apps/mobile/src/app/(tabs)/home.tsx:40-45`):**
   - 1 query: `api.getHome()`.
   - Backend `app/api/v1/home/route.ts:6` uses `export const dynamic = "force-dynamic"` and returns no `Cache-Control` header.
   - `lib/services/dashboard.service.ts:98-150` runs 4 database queries via `Promise.all` (`prisma.user.findUnique`, `prisma.examAttempt.findMany`, `prisma.progress.findFirst`, `prisma.progress.aggregate`).
2. **Courses (`apps/mobile/src/app/(tabs)/courses.tsx:55-75`):**
   - 2 queries on open: `api.getCourses()` and `api.getCareerTracks()`.
   - Backend `lib/services/courses.service.ts:16-56` over-fetches heavily: executes `prisma.course.findMany` with deep nested relations `chapters: { include: { lessons: { select: { id: true } } } }` for up to 50 courses just to calculate counts in JS memory (`lessonsCount += ch.lessons.length`), instead of using Prisma `_count` aggregations.
   - Missing Cache-Control header.
3. **Tests / Quizzes (`apps/mobile/src/app/(tabs)/tests.tsx:46-76`):**
   - **3 concurrent queries on initial open** regardless of active tab: `seriesQuery` (`api.getExamSeries`), `pyqQuery` (`api.getPyqExams`), and `caQuery` (`api.getCurrentAffairs`).
   - Tabs are client-side pills, but queries are not lazily loaded or enabled by active tab.
4. **Current Affairs (`apps/mobile/src/app/current-affairs/index.tsx:40-48`):**
   - 1 query: `api.getCurrentAffairs()`.
   - Backend `app/api/v1/current-affairs/route.ts:16-18` includes `Cache-Control: public, max-age=120, stale-while-revalidate=300`.
5. **Profile (`apps/mobile/src/app/(tabs)/profile.tsx:46-60`):**
   - 2 queries on open: `api.getMe()` and `api.getSessions()`.
   - `api.getMe()` is redundant because `AuthContext` already keeps `user` in context state.

### 2d. Rendering Bottlenecks
- **No Virtualization (ScrollView + map):**
  - **9 out of 10 list screens render entire unbounded lists into native memory using `<ScrollView>` + `.map()`:**
    - `courses.tsx:265`: renders up to 50 complex course cards inside `ScrollView`.
    - `tests.tsx:294`: renders all test series packages inside `ScrollView`.
    - `current-affairs/index.tsx:102`: renders all daily/monthly items inside `ScrollView`.
    - `home.tsx:120`: maps all tiles and cards inside `ScrollView`.
  - Only `apps/mobile/src/app/(tabs)/library.tsx:10` uses `@shopify/flash-list`.
- **Zero Memoization:**
  - `React.memo` is used **0 times** across `apps/mobile/src/`. Every state change (search input keystroke, goal change, timer tick) re-renders all child cards and SVG icons.
- **Inline Objects & Functions in Hot Render Paths:**
  - `home.tsx:47-92`: Recreates the `quickActions` 6-element array of objects with inline route references on every render.
  - `courses.tsx:267`: Inline lambda `onPress={() => router.push(...)` allocated for every item in list.
- **Hermes & New Architecture:**
  - Hermes engine is enabled by default in Expo SDK 57 / React Native 0.86.
  - New Architecture is enabled in `app.config.ts:41` (`newArchEnabled: true`).
- **Animations:**
  - `Skeleton.tsx:24-40` correctly configures `useNativeDriver: true` for opacity interpolation.

### 2e. Network & Infrastructure
- **Network Overhead:**
  - Client timeout is set to 10,000ms (`packages/shared/src/client.ts:98`).
  - No request deduplication between standalone `api.getMe()` calls during cold start.
- **Host Disk Full Warning (Infrastructure Finding):**
  - Host macOS volume `/dev/disk3s5` is at **100% capacity (only 148 MiB available out of 228 GiB)**.
  - Running emulators, simulators, Metro bundler caches, and SQLite WAL logs in low-disk environments causes severe I/O throttling and simulator freezing.

---

### 2f. Ranked Findings by Likely Impact

| Rank | Finding | Impact | Evidence (File:Line) | One-Line Fix | Profiling Tool Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **ScrollView + map in all major list screens** | **HIGH** | `courses.tsx:265`, `tests.tsx:294`, `current-affairs/index.tsx:102` | Replace `ScrollView` and `.map()` with `@shopify/flash-list` or `FlatList` with `estimatedItemSize`. | NOT TESTED (React DevTools Profiler / Flipper) |
| **2** | **Full cache dehydrate & SQLite sync write on every query event** | **HIGH** | `_layout.tsx:27-31`, `query-persistence.ts:41-57` | Debounce cache persistence by 2000ms or persist only on app backgrounding via `AppState`. | NOT TESTED (Android Studio Profiler / Flipper) |
| **3** | **Cold startup blocked by duplicate `api.getMe()` in `BootstrapScreen`** | **HIGH** | `app/index.tsx:10-33`, `AuthContext.tsx:46-99` | Eliminate `BootstrapScreen` network blocking; route immediately to `/(tabs)/home` with cached state. | NOT TESTED (React Native Performance Monitor) |
| **4** | **1.09 MB uncompressed splash image** | **MED** | `assets/brand/splash-image.png` (1,094,558 bytes) | Compress splash PNG to under 100 KB WebP/optimized PNG. | NOT TESTED (Xcode / Android Logcat cold-start timer) |
| **5** | **Over-fetching deep nested relations in courses API** | **MED** | `lib/services/courses.service.ts:28-35` | Replace deep `chapters.lessons` loading with Prisma `_count: { select: { chapters: true } }` and cached counts. | PASS (Code Inspection) |
| **6** | **Concurrent un-tabbed queries on Tests tab open** | **MED** | `tests.tsx:46-76` | Add `enabled: activePill === "..."` to `seriesQuery`, `pyqQuery`, and `caQuery` to fetch on demand. | NOT TESTED (React DevTools Profiler) |
| **7** | **Zero component memoization in lists** | **MED** | `apps/mobile/src/` (0 occurrences of `React.memo`) | Wrap `Card`, `Badge`, and list item components in `React.memo`. | NOT TESTED (React DevTools Profiler) |
| **8** | **Unused `react-dom` (7.3 MB) in mobile dependencies** | **LOW** | `apps/mobile/package.json:48` | Remove `react-dom` from mobile dependencies. | PASS (Code Inspection) |
| **9** | **Full barrel import of `lucide-react-native`** | **LOW** | `apps/mobile/node_modules/.lucide-react-native-5epY32vO` (54.5 MB) | Configure Metro transform plugin or import icons directly from subpaths. | NOT TESTED (Metro Bundle Visualizer) |
| **10**| **Host OS disk at 99.9% capacity (148 MiB free)** | **HIGH (OS)**| `df -h` (`/dev/disk3s5` 148Mi available) | Free at least 15 GB disk space on the host machine to allow simulator swap and SQLite WAL writes. | PASS (`df -h` raw output) |

---

## What I Could Not Verify
1. **Real Device Runtime FPS and Memory Consumption:**
   - Could not profile real frame drops, JS thread spikes, or memory leaks on physical iOS/Android devices because this task is strictly a read-only code and architecture diagnosis without hardware connection or emulator launch.
   - Recommended tool: **React DevTools Profiler**, **Flipper / Expo DevTools**, and **Android Studio Profiler (Systrace/CPU Profiler)**.
2. **Production Network Latency to `api.aspirantbook.com`:**
   - Prompt strictly prohibits network calls to production; API latency from edge regions to Supabase poolers could not be actively measured.
3. **Native Release Bundle Size Analysis:**
   - EAS production build artifact (`.aab` / `.ipa`) could not be inspected because no build was triggered or downloaded.
