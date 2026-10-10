# AGENTS.md: Project rules for AI coding agents

Read this file at the start of every task. The full UI standard lives in
`docs/engineering/responsive-ui-standards.md`. Read it before ANY UI work
(new page, component change, bug fix that touches layout or styling).

## 0. SAFE RULES (highest priority, never break)
- Test only on the isolated test server: `PORT=3045 NEXT_DIST_DIR=.next-test npx next dev --hostname 127.0.0.1 --port 3045`, against the Docker test DB (`npm run test:db:up`, 127.0.0.1:54329, `.env.test`).
- Dev (Supabase) DB from `.env` / `.env.local`: SELECT only. No writes. Never touch data on localhost:3000.
- Never run: `prisma db push`, anything against PROD, `git push`, branch create or switch. Stay on the current branch.
- Never print `.env*` values or `.auth/` contents; never commit them.
- Commit only after `npx tsc --noEmit`, `npm run lint` and the relevant Playwright tests pass. Never push, amend or force.
- Do not edit package.json or the lockfile unless the task needs it; say so first.

## 1. Product reality (why these rules exist)
- Most of our learners use phones (and tablets). Mobile is the PRIMARY experience, desktop is an enhancement.
- Stack: Next.js App Router, React, TypeScript, Tailwind, Radix UI, lucide-react, Prisma.
- Below `lg` (1024px) the app uses the mobile shell (mobile header, bottom tabs, drawer). It is controlled by
  `NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL`. Never break the flag-off behaviour.

## 2. UI rules
For any UI work (page, component, layout or styling bug) load the `responsive-ui` skill and read docs/engineering/responsive-ui-standards.md first. Core rules: mobile-first (360px primary), no horizontal page scroll, dvh not vh, 44px touch targets, Tailwind tokens only (no hex, no pure black), dark mode, same features on mobile and desktop, empty/loading/error states.

## 3. Definition of done
- UI changes: checklist in skill `responsive-ui`; include screenshots at 390x844, 768x1024 and 1440x900 (light + dark).
- All changes: `npm run lint`, `npx tsc --noEmit` (legacy errors exist: compare to baseline, no NEW errors) and the relevant Playwright tests pass; report RAW output.

## 4. Working method
1. Stay on the current branch (never create or switch). Small commits, only after checks pass; never push.
2. Any bug: (a) reproduce the exact bug on real data first, read-only (DB SELECT / curl); (b) fix the root cause; (c) add a regression test that fails before the fix and passes after; (d) report RAW command output as proof.
3. Large work: first a read-only report or plan (file:line), wait for approval, then build in milestones.
4. Changing an existing screen: update every place the same UI exists (desktop, mobile variant, studio/preview, tutorials/Rosera renderer) together.
5. "Build passes" or string checks like "Matches: true" are not proof. For UI, provide screenshots from a logged-in STUDENT account.
6. If you assume something or cannot verify something, say so. Never claim "fixed" without evidence.

## 5. Data and safety
- Never delete user data, lessons, courses or progress. Archive instead. Never change existing internal ids.
- Destructive DB operations or migrations: ask first. Use `prisma migrate`; never `db push` (see section 0).
- Do not write runtime data to disk (serverless is read-only and multi-instance). Use the database.
- Validate all server action input; check roles on the server (ADMIN / TEACHER / STUDENT). Creator actions are never shown to students.
- Sanitize any imported or user-supplied HTML/SVG. Untrusted HTML runs only in a sandboxed iframe without `allow-same-origin`.

## 6. Areas with their own rules
- Test attempt screens: server-based timer, autosave on every change, resume after refresh, one-line timer, palette as bottom sheet on phones.
- Video lessons: player sticky at the top on phones, tabs below, no overlay text on the poster.
- Tutorials / Rosera renderer: content is themed through CSS variables (`--tutorial-*`, `--rz-*`); never hardcode colours; all text goes through the shared inline formatter.
- Importers (tutorial packages): match by external ids, never by title alone; imports create drafts; no deletions.

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

