---
name: responsive-ui
description: Use for ANY UI work: new page, component change, or a bug fix touching layout, styling, responsive behaviour, dark mode or accessibility. Contains the 14 non-negotiable UI rules and the UI definition of done for TrillionSkill.
---

Also read docs/engineering/responsive-ui-standards.md before UI work.

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

## 3. Definition of done (UI changes; include in every UI report)
- [ ] Screenshots at 390x844 and 768x1024 (light + dark) and 1440x900 for every touched screen.
- [ ] No horizontal scroll at 320px; nothing hidden behind bars; keyboard focus visible.
- [ ] Desktop and mobile show the same data and features (differences listed).
- [ ] Empty, loading, error and offline states designed (not blank).
- [ ] Playwright screenshot/e2e tests updated for touched pages; axe check clean.
- [ ] `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.
- [ ] Lighthouse mobile (Performance, Accessibility) not worse than before, numbers reported. (UI-heavy pages only)
