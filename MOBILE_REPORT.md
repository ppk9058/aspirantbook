# Mobile Reader App Implementation Report (Android / Capacitor)

**Branch:** `mobile-app`  
**Date:** October 21, 2026  
**Target Platform:** Android (Capacitor 8)  
**App Name:** `aspirantbook`  
**App ID:** `com.aspirantbook.app`  
**Scope:** v1 Reader App (Login, Reading, Tests/Exams, Secure PDFs, Dashboard; Zero In-App Purchases)

---

## 1. Executive Summary & Architecture

The mobile application has been created using **Capacitor 8** configured as an Android Reader App that loads the live Next.js web application.

- **Origin & Loading Strategy:** Configured in `capacitor.config.ts`. The WebView loads `server.url` from `process.env.CAPACITOR_SERVER_URL` (defaulting to `http://10.0.2.2:3000` for Android emulator local dev, or the production HTTPS domain). Allowed navigation is restricted exclusively to AspirantBook domains and localhost.
- **Zero Web Regression:** All native capabilities are guarded by `Capacitor.isNativePlatform()` and `isNativeApp()`. Regular browsers on desktop, tablet, and mobile retain 100% of existing behavior and purchase workflows.
- **Reader App Compliance:** In accordance with Google Play Store Reader App guidelines, all digital checkout and purchase triggers ("Buy Now", "Add to Cart", "Get Pass") are concealed within the native application. They are replaced with a clear notice: *"Available on our website"* paired with a button that launches the device's default external browser (`@capacitor/browser`). Existing owned or free content remains fully readable, attemptable, and accessible.
- **Security & Schema Integrity:** Database schema changes are strictly additive (`DevicePushToken`). No existing tables, columns, relations, or payment contracts were altered.
- **Build & Verification Status:** Clean native Android Gradle build (`./gradlew assembleDebug` SUCCESSFUL, 30MB APK), 0 ESLint errors, zero new TypeScript errors (maintained exact 65 baseline legacy count), and full Playwright test suite passes.

---

## 2. Completed Scope & Implementation Details

### Step 1: Capacitor Setup & Android Project Generation (Commit `939ef65`)
- Installed `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/network`, `@capacitor/push-notifications`, `@capacitor/browser`.
- Initialized `capacitor.config.ts`:
  - `appId: "com.aspirantbook.app"`
  - `appName: "aspirantbook"`
  - `server.url: process.env.CAPACITOR_SERVER_URL || "http://10.0.2.2:3000"`
  - `androidScheme: "https"`
  - `server.allowNavigation: ["10.0.2.2:*", "127.0.0.1:*", "localhost:*", "*.aspirantbook.com", "aspirantbook.com"]`
  - `appendUserAgent: " AspirantBookApp/1.0"`
- Scaffolded native Android project in `android/`.

### Step 2: Native Detection Helper & Environment Markers (Commit `9c1c49a`)
- Created `lib/native/platform.ts`:
  - `isCapacitorNative()`: evaluates `Capacitor.isNativePlatform()`.
  - `isNativeApp()`: checks client-side capacitor status, URL parameter `?app=1`, `window.navigator.userAgent` containing `AspirantBookApp`, or `is_native_app` cookie.
  - `isNativeAppServer()`: reads `x-is-native-app` header or request cookies on server components.
  - `getNativePlatform()`: detects `'android'`, `'ios'`, or `'web'`.
- Updated `middleware.ts`:
  - Detects `?app=1` query parameter or `AspirantBookApp` user-agent.
  - Sets `is_native_app=1` HTTP cookie and forwards `x-is-native-app: 1` request header to downstream SSR/RSC routes.

### Step 3: Conceal In-App Purchases (Commit `263d1de`)
- Configured default policy `NEXT_PUBLIC_APP_ALLOW_PURCHASE=false`.
- Implemented `lib/native/browser.ts` (`openExternalUrl` via `@capacitor/browser`).
- Created reusable `components/native/AvailableOnWebsite.tsx` with external browser redirection.
- Replaced purchase/checkout/pass triggers when running inside the app across:
  - `components/course/EnrollButton.tsx` (Courses & Test Series)
  - `components/pricing/PricingPlanButton.tsx` (Subscription Passes)
  - `components/books/BookCard.tsx` & `BookDetailsClient.tsx` (Add to Cart / Buy Now)
  - `components/course/CourseCard.tsx`
  - `components/batches/BatchCardItem.tsx`
  - `app/(dashboard)/test-series/[id]/TestSeriesDetailClient.tsx`
  - `app/(dashboard)/test-series/page.tsx`
  - `app/(dashboard)/checkout/page.tsx` (direct checkout block with external browser redirect)
  - `components/course/CoursePlayerClient.tsx` & `LiveDemoRoomClient.tsx`

### Step 4: Hide Placeholder Google Sign-In (Commit `e9f5c1b`)
- In `components/auth/LoginForm.tsx` and `components/auth/RegisterForm.tsx`, wrapped the Google Sign-in alert placeholder behind `!isNativeApp()`.
- Prevents deceptive or non-functional OAuth buttons in native view; standard email/password authentication remains active.

### Step 5: PDF.js Canvas Renderer for Android & Mobile (Commit `dc7b1db`)
- Deployed worker asset: `public/pdf.worker.min.mjs` (from `pdfjs-dist`).
- Created `components/pdf/PdfCanvasViewer.tsx`:
  - Pure HTML5 `<canvas>` rendering using `pdfjs-dist/legacy/build/pdf.mjs`.
  - Page-by-page lazy rendering to avoid WebView out-of-memory crashes on 100+ page documents.
  - Zoom controls (50% to 250% step adjustments).
  - Page navigation & current page indicator.
  - Dynamic memory management: calls `page.cleanup()` on unmount/re-render.
  - Preserved anti-copy security overlay, watermark display, and authorization token header forwarding.
- Updated `components/pdf/SecurePdfViewer.tsx` to automatically serve `PdfCanvasViewer` on native app and mobile viewports.

### Step 6 & 7: Hardware Back Button, Exam Lifecycle & Safety (Commit `0786570`)
- Created `components/native/NativeAppListener.tsx` mounted in `app/layout.tsx`:
  - Hardware back button listener via `@capacitor/app`.
  - Exam attempt pages: emits custom `nativeExamBack` DOM event to trigger the existing "Leave Examination?" confirmation dialog instead of abandoning the test.
  - Root screens (`/`, `/dashboard`, `/home`): requires double back-press within 2 seconds with toast notification before exiting application.
  - Standard screens: navigates `window.history.back()`.
- Exam Safety in `AttemptClient.tsx`:
  - Subscribed to `@capacitor/app` `appStateChange`.
  - Implemented 5-second grace window when app goes to background (pause) before recording any cheating/tab-switch violation (preventing false flags from incoming calls, OS permission dialogs, or notification shade pulls).
  - Triggers autosave on pause.
  - Web `requestFullscreen()` guarded to web browsers only; status bar styled to `#0F172A` dark theme.
  - Added `overscroll-behavior-y: none` to `body.is-native-app` in `app/globals.css` to eliminate pull-to-refresh rubber-banding.

### Step 8: NextAuth Cookie Persistence in Android WebView (Commit `b0616aa`)
- Configured `android/app/src/main/java/com/aspirantbook/app/MainActivity.java`:
  - Enabled `CookieManager.getInstance().setAcceptCookie(true)`.
  - Enabled `CookieManager.getInstance().setAcceptThirdPartyCookies(bridge.getWebView(), true)`.
  - Preserves NextAuth session tokens across app restarts, Authwall gates, forgot password, and backgrounding.

### Step 9: PWA Assets & Offline Fallback (Commit `ce9c35f`)
- Generated full icon set using source asset `public/aspirant-logo-square.jpg`:
  - `icon-48.png`, `icon-72.png`, `icon-96.png`, `icon-144.png`, `icon-192.png`, `icon-512.png`.
  - `icon-maskable-192.png`, `icon-maskable-512.png`.
  - `apple-touch-icon.png`, `splash-image.png`.
  - Replaced Android launcher mipmap assets in `android/app/src/main/res/mipmap-*`.
- Configured `public/manifest.json` with theme color `#0F172A` and `start_url: "/"`.
- Created lightweight `public/sw.js` and `public/offline.html`:
  - Intercepts navigation requests only when offline.
  - Zero caching of authenticated, private, paid, or API endpoints.

### Step 10: Legal Pages, Account Deletion & 13+ Consent (Commit `db30ab1`)
- Created `app/privacy/page.tsx` with dedicated Section 4: *User Data Deletion & Account Erasure* outlining self-service deletion in `/settings` and email deletion request procedures.
- Created `app/terms/page.tsx` with Section 1: *13+ Age Eligibility*, Anti-Cheating rules, and Intellectual Property terms.
- Created `components/layout/Footer.tsx` with links to Privacy Policy and Terms of Service. Added compliance links into `app/(dashboard)/settings/SettingsClient.tsx`.
- Updated `components/auth/RegisterForm.tsx` to include age & consent checkbox: *"I am 13+ and agree to Terms and Privacy"*.

### Step 11: Push Notification Prerequisites (Commit `c73a731`)
- Added additive Prisma schema model:
  ```prisma
  model DevicePushToken {
    id        String   @id @default(cuid())
    userId    String
    token     String   @unique
    platform  String   // 'android' | 'ios'
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@index([userId])
  }
  ```
- Created migration `prisma/migrations/20261021010000_add_device_push_token/migration.sql` and `rollback.sql`.
- Verified and applied migration to Docker test database.
- Created secure endpoint `POST /api/user/push-token` with NextAuth authentication, Zod input validation, IP rate limiting (`checkRateLimit`), and upsert semantics.
- Created `lib/native/push.ts` with registration listener (graceful no-op until Firebase keys are present).

### Step 12: Reverse Proxy & Rate Limiting Documentation (Commit `161baae`)
- Updated `lib/rate-limit.ts` to inspect `cf-connecting-ip` and `x-forwarded-for` when `TRUST_PROXY=true`.
- Added `TRUST_PROXY=true` documentation to `.env.example`.

### Step 13: Android Build Verification
- Installed Android Commandline Tools (SDK 36, Build-Tools 35.0.0 / 36.0.0).
- Configured `android/local.properties`.
- Executed `./gradlew assembleDebug` in `android/`:
  - **Result:** `BUILD SUCCESSFUL in 2m 13s`
  - **Output APK:** `android/app/build/outputs/apk/debug/app-debug.apk` (30 MB).

### Step 14: Automated Test Suite & Regression Verification (Commit `7fc28d7`)
- Created Playwright spec: `tests/e2e/mobile-reader-app.spec.ts` (12/12 passing).
- Verified `npx tsc --noEmit`: exactly 65 baseline legacy errors (0 new errors).
- Verified `npm run lint`: 0 errors.
- Verified `npm run db:check`: 0 drift.
- Verified Next.js production build (`npm run build`): compiled 159 static and dynamic routes successfully.
- Verified Playwright e2e test suites against `next start` on port 3045 (`mobile-reader-app`, `ca-pdf`, `registration`, `ui-login`, `home-mobile`, `session-invalidation` all passing).

---

## 3. Database Migration Deployment Instructions

The `DevicePushToken` model was verified and migrated on the isolated Docker test database (`trillionskill_test`). Per project safe rules, the dev/production database was never touched during development.

To apply this additive migration to your Supabase dev or production database:

```bash
# 1. Ensure your .env / .env.local has the target DATABASE_URL
npx prisma migrate deploy

# 2. Verify schema sync
npm run db:check
```

*Rollback plan (if ever needed):*
Execute the SQL in `prisma/migrations/20261021010000_add_device_push_token/rollback.sql`:
```sql
DROP TABLE IF EXISTS "DevicePushToken";
```

---

## 4. Reverse Proxy & Rate-Limiting on Mobile Networks

When users access the app on mobile cellular networks (Jio, Airtel, Vodafone, T-Mobile), requests traverse Carrier-Grade NAT (CGNAT) where thousands of mobile subscribers share a single egress IPv4 address.

- **Requirement:** Ensure `TRUST_PROXY="true"` is set in production `.env`.
- **Behavior:** With `TRUST_PROXY="true"`, `lib/rate-limit.ts` prioritizes Cloudflare's `cf-connecting-ip` and client `x-forwarded-for` headers over the socket address.
- **Push Token & Auth Endpoints:** Rate limit keys for authenticated routes (such as `/api/user/push-token`) combine `userId` and IP address, ensuring one cellular subscriber's activity does not throttle another subscriber on the same cell tower.

---

## 5. What Could Not Be Tested Locally (Real Device Items)

Due to running in a headless server environment without physical cellular hardware and external third-party push services:

1. **Hardware Push Notification Delivery:**
   Physical APNs / FCM push token dispatch requires an active Google Firebase project with `google-services.json` placed in `android/app/`. The code currently registers the token gracefully and logs a no-op when Firebase credentials are not yet bundled.
2. **Physical Mobile Carrier CGNAT Roaming:**
   Simulated via headers; real cellular network handover (e.g. WiFi to 5G switching during an exam session) must be tested on physical hardware.
3. **OEM Custom Android Gestures:**
   Different Android skins (Samsung OneUI, Xiaomi HyperOS/MIUI, OnePlus OxygenOS) handle edge swipe back gestures with subtle differences compared to standard Android 3-button navigation.
4. **Physical GSM Phone Call Interruption:**
   The Android app pause/resume lifecycle and 5-second grace period were validated; physical hardware radio interruptions (incoming SIM voice call while taking a timed test) require a real handset with a SIM card.

---

## 6. Manual Testing Checklist for an Android Phone

Follow these steps when testing `app-debug.apk` on a physical Android device:

### A. Installation & Launch
- [ ] Transfer `app-debug.apk` to phone or run `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
- [ ] Confirm app launches with splash screen and dark status bar (`#0F172A`).
- [ ] Confirm no horizontal scroll on the home screen.

### B. Authentication & Session Persistence
- [ ] Log in using email and password.
- [ ] Verify Google Sign-In button is hidden.
- [ ] Close the app completely from recent apps (swipe away) and reopen: verify user remains logged in (cookie persistence).
- [ ] Log out: verify session clears and redirects to login.

### C. Reader App Purchase Hiding
- [ ] Navigate to `/pricing`, `/courses`, or `/books`.
- [ ] Verify "Buy Now", "Add to Cart", and "Get Pass" buttons are not visible.
- [ ] Tap "Available on our website": verify device opens Chrome / system default browser to the web store.
- [ ] Open previously enrolled or free content: verify it opens directly in-app.

### D. Secure PDF Viewer
- [ ] Open a Current Affairs or Course PDF document.
- [ ] Verify PDF renders on HTML5 canvas (no broken iframe or gray box).
- [ ] Test Zoom In (`+`), Zoom Out (`-`), and Reset buttons.
- [ ] Navigate multiple pages: verify smooth rendering and no app slowdown or memory crashes.

### E. Exam Safety & Android Back Button
- [ ] Start a Test Series exam attempt.
- [ ] Tap the Android hardware back button (or swipe back gesture): confirm the "Leave Examination?" dialog appears rather than exiting the screen. Tap "Cancel" to remain in the test.
- [ ] Minimize app or pull down the notification shade: wait 3 seconds, reopen: verify NO cheating violation was recorded (within 5-second grace window).
- [ ] Simulate receiving a phone call or switching apps for > 6 seconds: verify state auto-saves and resumes upon return.
- [ ] On the dashboard root screen, tap back once: verify "Press back again to exit" toast appears. Tap back again within 2 seconds: verify app exits cleanly.

### F. Offline Fallback
- [ ] Turn on Airplane Mode.
- [ ] Tap a new link: verify clean offline fallback page is displayed with a "Try Again" button.
- [ ] Turn off Airplane Mode and tap "Try Again": verify normal navigation resumes.

---

## 7. Google Play Store Submission Guide

### A. How to Run on Emulator
```bash
# Start Android Emulator via Android Studio or CLI:
$ANDROID_HOME/emulator/emulator -avd <your_avd_name>

# Run Capacitor Android
npx cap run android
```

### B. How to Run on Physical Device
```bash
# Connect phone via USB with USB Debugging enabled:
adb devices

# Install debug build:
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### C. How to Build Signed Release AAB (Android App Bundle)
1. Generate release keystore (do not commit keystores or passwords to git):
   ```bash
   keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
   ```
2. Configure credentials in `android/key.properties` (ignored by git):
   ```properties
   storePassword=your-keystore-password
   keyPassword=your-key-password
   keyAlias=my-key-alias
   storeFile=/path/to/my-release-key.jks
   ```
3. Build production bundle:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   Output bundle: `android/app/build/outputs/bundle/release/app-release.aab`.

### D. Play Console Data Safety Form Guidance (Based on Codebase)
When completing the Google Play Data Safety form:

| Data Category | Collected? | Shared? | Purpose | Ephemeral? |
|---|---|---|---|---|
| **Name** | Yes | No | Account management, profile display | Stored until account deletion |
| **Email Address** | Yes | No | Authentication, password reset, account notices | Stored until account deletion |
| **Phone Number** | Optional | No | User profile (optional) | Stored until account deletion |
| **Device ID / Push Token** | Yes | No | Push notifications (`DevicePushToken`) | Stored; cascade deleted with user |
| **User Content (Test Answers)** | Yes | No | Exam attempt scoring, rank calculations | Stored with student records |
| **Crash / Diagnostics** | No third-party SDK currently | No | App performance | N/A |

- **Security Practices:**
  - All data is encrypted in transit over HTTPS (TLS 1.3).
  - Data deletion: Self-service deletion available directly at `/settings`, with manual request procedures documented at `/privacy`.

### E. Content Rating Questionnaire
- Category: **Education / Reference**.
- Violence, Sexual Content, Controlled Substances: **None**.
- User interaction: **13+ age restriction** declared in Terms of Service and registration checkbox.

---

## 8. Final Verdict

### **READY FOR INTERNAL TESTING**

**Next Actions for User:**
1. Deploy database migration to Supabase/dev DB: `npx prisma migrate deploy`.
2. Connect Firebase project (`google-services.json`) when ready to enable remote push notification dispatches.
3. Distribute `android/app/build/outputs/apk/debug/app-debug.apk` to internal team testers following the manual checklist in Section 6.
