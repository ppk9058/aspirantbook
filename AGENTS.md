# AGENTS.md: Project rules for AI coding agents

Read this file at the start of every task. The full UI standard lives in
`docs/engineering/responsive-ui-standards.md`. Read it before ANY UI work
(new page, component change, bug fix that touches layout or styling).

## 0. SAFE RULES (highest priority, never break)
- Test only on the isolated test server: `PORT=3045 NEXT_DIST_DIR=.next-test npx next dev --hostname 127.0.0.1 --port 3045`, against the Docker test DB (`npm run test:db:up`, 127.0.0.1:54329, `.env.test`).
- Dev (Supabase) DB from `.env` / `.env.local`: SELECT only. No writes. Never touch data on localhost:3000.
- Never run: `prisma db push`, anything against PROD, `git push`, branch create or switch. Stay on the current branch.
- Never print `.env*` values or `.auth/` contents; never commit them.
- Never commit, push, amend or force unless the task says so; the user commits. Before reporting done, tsc, lint and the relevant Playwright tests must pass.
- Do not edit package.json or the lockfile unless the task needs it; say so first.

## 0.1 Branch Map & Repository Invariants
- **Web Canonical Branch**: `TrillionSkill-ver2` (web releases).
- **Mobile App Canonical Branch**: `expo-mobile` (Expo React Native mobile client & v1 API).
- **Stale Branches**: `authwall` is STALE (never branch from or merge into it).
- **Forbidden Branches**: `mobile-app` is legacy Capacitor (NEVER merge into `expo-mobile`).
- **Start-of-Run Checks**:
  1. Confirm `git branch --show-current` matches the target task branch.
  2. Confirm `.git/MERGE_HEAD` does not exist.
  3. Ensure Docker test DB is up on `127.0.0.1:54329` (`npm run test:db:up`).
  4. Never commit `data/books.json`, `.env*`, `apps/mobile/dist`, or test logs.
- **Both-Test-Sets Rule**:
  Any changes touching shared boundaries (`packages/shared`, `lib/services/**`, `lib/exam*`, or `app/api/v1/**`) affect both web and mobile: MUST run BOTH test suites:
  1. Web: `BASE_URL=http://127.0.0.1:3045 npx playwright test`
  2. Mobile & API: `cd apps/mobile && npm test && npx expo-doctor` and `npx tsx --test tests/api-v1-*.ts tests/contract-v1.test.ts`.

## 0.2 Project Map & Scope Tags
- `[WEB]`: Web UI pages & components (`app/(dashboard)/**`, `components/**`, `app/admin/**`).
- `[MOBILE]`: React Native client (`apps/mobile/**`).
- `[SHARED]`: Cross-platform contracts & DTOs (`packages/shared/**`).
- `[API]`: Versioned REST API (`app/api/v1/**`).
- `[LIB]`: Backend core domain services (`lib/services/**`, `lib/exam*`, `lib/authwall/**`).

## 1. Product reality (why these rules exist)
- Most of our learners use phones (and tablets). Mobile is the PRIMARY experience, desktop is an enhancement.
- Stack: Next.js App Router, React, TypeScript, Tailwind, Radix UI, lucide-react, Prisma.
- Below `lg` (1024px) the app uses the mobile shell (mobile header, bottom tabs, drawer). It is controlled by
  `NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL`. Never break the flag-off behaviour.

## 2. UI rules
For any UI work (page, component, layout or styling bug) load the `responsive-ui` skill and read docs/engineering/responsive-ui-standards.md first. Core rules: mobile-first (360px primary), no horizontal page scroll, dvh not vh, 44px touch targets, Tailwind tokens only (no hex, no pure black), dark mode, same features on mobile and desktop, empty/loading/error states.

## 3. Definition of done
- UI changes: follow the responsive-ui skill checklist; one Playwright check per new or changed page. Screenshots only if the user asks.
- All changes: `npm run lint`, `npx tsc --noEmit` (legacy errors exist: compare to baseline, no NEW errors) and the relevant Playwright tests pass; report RAW output.

## 4. Working method
1. Stay on the current branch (never create or switch). Never commit or push unless the task says so. The user commits.
2. Any bug: (a) reproduce the exact bug on real data first, read-only (DB SELECT / curl); (b) fix the root cause; (c) add a regression test that fails before the fix and passes after; (d) report RAW command output as proof.
3. Large work (a new module, or a change touching 5+ files): first a read-only report or plan (file:line), wait for approval, then build in milestones. Small fixes and single-feature tasks go straight to build.
4. Changing an existing screen: if the same UI exists elsewhere (desktop, mobile variant, studio/preview, tutorials/Rosera renderer), list those places in the report and ask before changing them.
5. 'Build passes' or string checks like 'Matches: true' are not proof. For a new or changed UI page, one Playwright check (page loads, no empty/error state, one known fixture value).
6. If you assume something or cannot verify something, say so. Never claim "fixed" without evidence.
- Never use a silent catch (`.catch(() => {})` or empty catch). Every fetch/action needs a visible success and error state.
- Page and API must agree on the response shape. When adding a page that reads an API, open the API route and match its shape.
- Touch only the files the task names. If another file needs a change, stop and ask first.
- New or changed UI page: add ONE Playwright check that the page loads, shows no empty/error state, and shows one known fixture value.
- Mutation proofs (break, show FAIL, revert) only for security rules: ownership, role blocks, data exclusion. Other fixes need fail-before / pass-after only.
- Run the regression suites once, at the end, not repeatedly.

## 5. Data and safety
- Never delete user data, lessons, courses or progress. Archive instead. Never change existing internal ids.
- Destructive DB operations or migrations: ask first. Use `prisma migrate`; never `db push` (see section 0).
- Never change the Prisma schema without asking.
- Do not write runtime data to disk (serverless is read-only and multi-instance). Use the database.
- Validate all server action input; check roles on the server (ADMIN / TEACHER / STUDENT). Creator actions are never shown to students.
- Sanitize any imported or user-supplied HTML/SVG. Untrusted HTML runs only in a sandboxed iframe without `allow-same-origin`.

## 6. Areas with their own rules
- Test attempt screens: server-based timer, autosave on every change, resume after refresh, one-line timer, palette as bottom sheet on phones.
- Video lessons: player sticky at the top on phones, tabs below, no overlay text on the poster.
- Tutorials / Rosera renderer: content is themed through CSS variables (`--tutorial-*`, `--rz-*`); never hardcode colours; all text goes through the shared inline formatter.
- Importers (tutorial packages): match by external ids, never by title alone; imports create drafts; no deletions.
- Mobile App (React Native + Expo SDK 54): code lives in `apps/mobile/`, shared logic/types in `packages/shared/`, mobile REST API in `app/api/v1/`. Workspaces are decoupled: web uses plain `npm ci --omit=dev` at root; mobile dependencies are installed via `cd apps/mobile && npm install` (generates `apps/mobile/package-lock.json`). Test commands: `npm run seed:mobile-test`, `cd apps/mobile && npm test`, `npx expo-doctor`. Run on physical phone via Expo Go: `npm run dev:lan` (auto-detects LAN IP, launches Next.js on 3045 and Expo Metro on 8081 with interactive QR code). See `docs/RUN_ON_PHONE.md`.

## 7. Commands
- Dev: `npm run dev`  Build: `npm run build`  Lint: `npm run lint`  Types: `npx tsc --noEmit`
- Test DB: `npm run test:db:up` / `npm run test:db:reset` / `npm run seed:test`
- E2E: `BASE_URL=http://127.0.0.1:3045 npx playwright test` against the 3045 test server only, or `npm run test:e2e:test-series`. Never run playwright without BASE_URL pointing at 3045. Update snapshots only when the change is intentional and reviewed.

## 8. Canonical helpers (reuse; never create a third copy)
- Uploads: `lib/aws-s3.ts` (presigned URLs, validation; used by the presigned-url route, admin course and profile actions) and `lib/s3.ts` (upload route: uploadToS3, FILE_CONFIGS) are both live. Follow what neighbouring code in the same feature imports. Do not merge or delete either without asking.
- Razorpay: checkout uses `createRazorpayOrder` from `lib/actions/payment/razorpay.ts`. `lib/payments/razorpay.ts` is the SDK instance, plans and signature/webhook verification.
- Stripe: UI calls `lib/actions/payment/stripe.ts` (createCheckoutSession), which wraps `lib/payments/stripe.ts`. Webhooks use `lib/payments/stripe.ts`.
- Rate limiting: use `lib/rate-limit.ts` (Postgres-backed). `checkRateLimit` in `lib/redis.ts` is unused: do not use it. `lib/redis.ts` is for leaderboard/XP caching only.
- Chapters: use `lib/actions/admin/chapters.ts`. Chapter functions in `lib/actions/admin/courses.ts` are unused duplicates; do not call them.
- Before writing any new helper, search lib/ (graphify explain or grep) for an existing one.

