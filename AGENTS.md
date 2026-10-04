# AGENTS.md: Project rules for AI coding agents

Read this file at the start of every task. The full UI standard lives in
`docs/engineering/responsive-ui-standards.md`. Read it before ANY UI work
(new page, component change, bug fix that touches layout or styling).

## 1. Product reality (why these rules exist)
- Most of our learners use phones (and tablets). Mobile is the PRIMARY experience, desktop is an enhancement.
- Stack: Next.js App Router, React, TypeScript, Tailwind, Radix UI, lucide-react, Prisma.
- Below `lg` (1024px) the app uses the mobile shell (mobile header, bottom tabs, drawer). It is controlled by
  `NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL`. Never break the flag-off behaviour.

## 2. Non-negotiable UI rules (summary of the full standard)
1. **Mobile-first, always.** Write base styles for a 360px phone, then add `sm:`, `md:`, `lg:`, `xl:`. Every UI change must work at 320, 360, 390, 430, 768, 1024 and 1440 px.
2. **One component, one data source, responsive layout.** Do NOT create a separate mobile copy of a component when a responsive version is possible. A separate mobile component is allowed only when the layout is fundamentally different (example: question palette = side panel on desktop, bottom sheet on mobile) and it must share the same hooks, types and server data.
3. **Same features everywhere.** If desktop gets a field, button or section, mobile gets it in the same change. Anything intentionally different must be listed in the PR.
4. **Never use the user agent to decide layout.** Use CSS breakpoints and container queries.
5. **No horizontal page scroll.** Wide content (tables, code, diagrams) scrolls inside its own container or becomes cards.
6. **Touch first.** Tap targets at least 44x44px, 8px gaps, nothing important behind hover, no gesture as the only way to do something.
7. **Use `dvh`, not `vh`.** Respect `env(safe-area-inset-*)`. Nothing may hide behind the bottom tab bar, the on-screen keyboard or a sticky bar.
8. **Tokens only.** Use Tailwind theme tokens or CSS variables. No hardcoded hex colours, no pure black (`#000`, `black`). Support dark mode.
9. **New pages live inside the existing shell.** Do not add headers or breadcrumbs that duplicate the mobile shell.
10. **Fullscreen flows** (test attempt, video lesson) hide the bottom tab bar.
11. **Accessibility is part of done:** visible focus, labels on icon buttons, contrast 4.5:1, works at 200% zoom and with reduced motion.
12. **Performance budget:** mobile LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 on a mid-range phone on 4G. Do not make them worse.
13. **Server components by default.** Client components only for interactivity. Lazy-load heavy parts (editors, charts, players).
14. **Text can grow.** Hindi and translated labels are longer. Never use fixed widths for text containers; always allow wrap or truncate with a full-text fallback.

## 3. Definition of done (include this in every report)
- [ ] Screenshots at 390x844 and 768x1024 (light + dark) and 1440x900 for every touched screen.
- [ ] No horizontal scroll at 320px; nothing hidden behind bars; keyboard focus visible.
- [ ] Desktop and mobile show the same data and features (differences listed).
- [ ] Empty, loading, error and offline states designed (not blank).
- [ ] Playwright screenshot/e2e tests updated for touched pages; axe check clean.
- [ ] `npm run lint`, `npm run typecheck` (or `npx tsc --noEmit`) and `npm run build` pass.
- [ ] Lighthouse mobile (Performance, Accessibility) not worse than before, numbers reported.

## 4. Working method
1. Work on a NEW git branch. Small, reviewable commits.
2. For anything large: first a read-only report or plan (file:line), then wait for approval, then build in milestones.
3. For changes to an existing screen: find every place the same UI exists (desktop, mobile variant, studio/preview, tutorials/Rosera renderer) and update them together.
4. "Build passes" is not proof. Provide screenshots from a logged-in STUDENT account, not only the login page.
5. If you assume something, say so. If you cannot verify something, say so. Never claim "fixed" without evidence.

## 5. Data and safety
- Never delete user data, lessons, courses or progress. Archive instead. Never change existing internal ids.
- Destructive DB operations or migrations: ask first and remind me to back up. Prefer `prisma migrate`; do not use `db push` on production.
- Do not write runtime data to disk (serverless is read-only and multi-instance). Use the database.
- Validate all server action input; check roles on the server (ADMIN / TEACHER / STUDENT). Creator actions are never shown to students.
- Sanitize any imported or user-supplied HTML/SVG. Untrusted HTML runs only in a sandboxed iframe without `allow-same-origin`.

## 6. Areas with their own rules
- Test attempt screens: server-based timer, autosave on every change, resume after refresh, one-line timer, palette as bottom sheet on phones.
- Video lessons: player sticky at the top on phones, tabs below, no overlay text on the poster.
- Tutorials / Rosera renderer: content is themed through CSS variables (`--tutorial-*`, `--rz-*`); never hardcode colours; all text goes through the shared inline formatter.
- Importers (tutorial packages): match by external ids, never by title alone; imports create drafts; no deletions.

## 7. Commands
- Dev: `npm run dev`   Build: `npm run build`   Lint: `npm run lint`   Types: `npx tsc --noEmit`
- E2E / visual: `npx playwright test` (update snapshots only when the change is intentional and reviewed)
