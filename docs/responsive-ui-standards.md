# Responsive UI Standard (mobile-first)

Applies to all existing and future UI work. `AGENTS.md` links here. If a task conflicts with this
document, stop and ask. Most of our learners are on phones and tablets, so a screen that is not good
on a 360px phone is not finished.

---

## 1. Principles
1. **Mobile-first.** Design and build the 360px phone layout first. Desktop adds space and density, it does not add features that phones lack.
2. **One component, many layouts.** Reuse the same component and the same data loader across devices. Differences come from CSS (breakpoints, container queries), not from copies of the code.
3. **Feature parity.** Anything a student can do on desktop, they can do on mobile.
4. **Progressive enhancement.** Core content works without hover, without large screens, without fast networks.
5. **Content first.** Mobile screens show the primary task and the next action. Secondary information goes behind a tap (accordion, sheet, tab).
6. **Fail gracefully.** Slow network, offline, empty and error states are designed screens.

## 2. Devices, breakpoints and test matrix
| Class | Width | Layout |
|---|---|---|
| Small phone | 320-359 | 1 column, compact spacing. Must not break. |
| Phone (primary target) | 360-430 | 1 column, mobile shell |
| Large phone / small tablet | 431-767 | 1 column or 2 for cards |
| Tablet portrait | 768-1023 | Mobile shell, 2-column cards, wider quick-access row |
| Tablet landscape / laptop | 1024-1279 | Desktop shell (sidebar) |
| Desktop | 1280+ | Desktop shell, max content width |

- Tailwind breakpoints: base = mobile, `sm` 640, `md` 768, `lg` 1024, `xl` 1280. The mobile shell applies below `lg`.
- Use container queries (`@container`) for components that live in different-width parents (cards in a sidebar vs a grid).
- Required test viewports: 320x640, 360x740, 390x844, 430x932, 768x1024 (portrait), 1024x768 (landscape), 1440x900.
- Also test: landscape phone (844x390), browser zoom 200%, text size increased in the OS, light and dark mode.

## 3. Layout rules
- Page padding: 16px on phones, 24px on tablets, container max-width on desktop.
- Spacing scale: 4/8/12/16/24/32. Use tokens, not arbitrary pixel values.
- No fixed pixel widths for text containers. Use `w-full`, `max-w-*`, `min-w-0` on flex children so text can truncate or wrap.
- No horizontal page scroll at any width down to 320px. Check with `document.documentElement.scrollWidth <= innerWidth`.
- Use `dvh` / `svh` for viewport heights, never `100vh` for full-height layouts.
- Sticky elements (headers, tabs, action bars): account for each other. Stack order and offsets come from shared tokens (header height, bottom bar height, safe areas), not magic numbers.
- Safe areas: `padding-bottom: env(safe-area-inset-bottom)` on bottom bars, `padding-top` for notches where relevant. `viewport-fit=cover` is already set.
- Long content: lists use pagination or infinite scroll with a stable scroll position; never render hundreds of heavy cards at once.

## 4. Navigation and shell
- Below `lg`: mobile header (menu, logo, search, notifications, avatar) + bottom tabs (Home, Tests, Courses, Pass) + drawer for everything else. Desktop keeps the sidebar and top bar.
- The active tab follows the route prefix, nested routes keep their parent tab active (`aria-current="page"`).
- No duplicate headers, breadcrumbs or section titles that repeat what the shell already shows. Use a page title only.
- Fullscreen flows hide the bottom bar: test attempt (`/test-series/[id]/attempt`, `/assessments/[id]/take`, `/test-execution`) and video lessons (`/courses/[slug]/learn/[lessonId]`, `/learn/[courseSlug]/[lessonId]`). Add new routes of this kind to the shared list.
- Back navigation: pages deeper than a tab root show a back button in the header.
- Floating buttons (AI assistant, Live pill, palette) use one shared stack positioned above the bottom bar. They never overlap each other, content or the bar.
- Role scoping: students get the student shell. Teacher/admin keep their own navigation. Creator actions (create, edit, package) are never shown to students.

## 5. Touch and interaction
- Targets at least 44x44 CSS px (WCAG 2.2 AA minimum is 24px; we use 44 for fingers). Gaps at least 8px.
- Hover is an enhancement only. Anything revealed on hover must also be reachable by tap or focus.
- Gestures (swipe, long press, drag) are never the only way to perform an action; give a visible button. Dangerous gestures (swipe to change an answer) are off by default.
- Give instant feedback: pressed states, loading states on buttons, disabled while a request is in flight (prevent double submits).
- Use `touch-action` and `overscroll-behavior` deliberately in carousels and sheets to avoid scroll chaining.
- Avoid accidental taps near screen edges (iOS back swipe); keep carousels' first card inset by 16px.

## 6. Typography
- Body text 16px minimum on mobile (prevents iOS zoom on inputs and keeps text readable). Secondary text 14px minimum. Avoid 10-11px except for badges.
- Line-height 1.5 to 1.7 for reading content. Devanagari (Hindi) needs more line height (1.7+) and must never be clipped.
- Do not rely on truncation alone. Titles clamp to 2 lines (`line-clamp-2`) with the full text available on the detail page or on tap.
- Numbers that change (timers, scores, counts): `tabular-nums`, `whitespace-nowrap`.
- Use the font tokens. Self-host fonts (`woff2`, `font-display: swap`, preload the primary one).

## 7. Component patterns (what to do on mobile)
| Desktop pattern | Mobile pattern |
|---|---|
| Data table | Cards (one per row) or a table inside its own horizontal scroll container with a sticky first column |
| Modal dialog | Bottom sheet (draggable, swipe down to close, focus trapped) or full-screen sheet for long forms |
| Sidebar panel | Bottom sheet or a separate page |
| Dropdown menu | Bottom sheet for long lists, native `<select>` for simple choices |
| Tabs (many) | Single-line, horizontally scrollable chips with scroll-snap; the active chip scrolls into view |
| Hover tooltip | Tap-to-open popover or inline help text |
| Multi-column form | Single column, one primary action sticky at the bottom |
| Wide chart | Simplified chart or horizontal scroll container with a legend below |
| Side-by-side compare | Stacked cards or swipeable comparison |
| Carousel | CSS scroll-snap (`snap-x snap-mandatory`), visible hint of the next card, dots optional |

- Cards: rounded corners, soft shadow, 16px padding, one primary action per card.
- Empty states: icon, one sentence, one action. Loading: skeletons that match the final layout (no layout shift).

## 8. Forms and input
- Single column. Labels always visible (not placeholder-only). Errors under the field, in text, not only colour.
- Correct input types and attributes: `type="email"`, `inputmode="numeric"`, `autocomplete`, `enterkeyhint`. Mobile OTP fields support one-time-code autofill.
- Primary action sticky above the keyboard when the form is long. Keyboard must not cover the focused field (use `visualViewport` or `scrollIntoView`).
- Preserve typed data across failed submits and across refresh for long forms (drafts).
- Validate on blur and on submit; never block the user with a validation popup that hides the field.

## 9. Media
- Images: always `width`/`height` or an aspect-ratio box, `loading="lazy"` below the fold, responsive `sizes`, modern formats (WebP/AVIF), through `next/image`. Never embed base64 images in content.
- Video: 16:9 player, sticky at the top on phones while lesson details scroll. No text or pills over the poster that overlap the play button. Controls reachable with a thumb. Respect data saver; do not autoplay with sound.
- Diagrams and SVG: scale with the container (`viewBox`, `max-width: 100%`). Provide alt text or a text summary.
- Documents (PDF): open in a viewer designed for mobile or offer download; never an iframe that cannot scroll.

## 10. Performance budgets (mobile, mid-range phone, 4G)
- Core Web Vitals "good" thresholds: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.
- JS per route: keep the initial route JS small (target under 170 KB gzipped). Use dynamic imports for editors, charts, players, rich-text and markdown renderers.
- Server components by default; client components only where interaction needs them.
- Fetch only what the screen shows (paginate, select fields). Sidebar and lists need titles and states, not full lesson bodies.
- Cache published content (`revalidate` on publish), prefetch the next likely screen, avoid waterfalls (parallel fetch).
- Compression (Brotli), long-lived cache headers for static assets, CDN for images.
- Animations: transform and opacity only, 60fps, and respect `prefers-reduced-motion`.
- Report Lighthouse mobile numbers (before/after) for pages you touch. A regression blocks the change.

## 11. Accessibility (WCAG 2.2 AA)
- Text contrast 4.5:1 (3:1 for large text and UI components) in light and dark mode.
- Visible focus ring on every interactive element; logical focus order; sheets and dialogs trap focus and restore it on close; Esc closes.
- Real `<button>`, `<a>`, `<label>`; icon-only buttons have `aria-label`. Status is never colour-only (add icon, shape or text; the question palette is the key example).
- Reflow: content works at 320px width and at 200% zoom without two-direction scrolling.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Live regions for important updates (timer milestones, save status), not for every tick.
- Test with a screen reader (VoiceOver/TalkBack) on the main flows.

## 12. Theming, dark mode and tokens
- All colours, radii, shadows and fonts come from tokens (Tailwind theme or CSS variables). No hardcoded hex values in components. No pure black anywhere; use the "ink" token.
- Every screen supports light and dark. Check images, shadows, borders and charts in dark mode.
- Tutorial content uses the course theme variables (`--tutorial-*` mapped to `--rz-*`) so each course keeps its own look at any screen size.
- Status colours (success, warning, error, info) come from one shared map so they cannot drift.

## 13. Internationalisation and content growth
- Hindi/English: labels can be 30-50% longer. Design for the longest string. Never fix the width of a button or tab to its English label.
- Use content-language fields (`titleHi`, `questionHi`, ...) and the language preference consistently; fall back to English when Hindi is missing.
- Dates, numbers and currency formatted with `Intl` for the user's locale.
- Right-to-left is not required today, but do not hardcode `left/right` where logical properties (`ms-`, `me-`, `ps-`, `pe-`) work.

## 14. Network resilience and state
- Assume slow, flaky connections and phones that lock or kill the tab.
- Optimistic UI where safe; always show saving/saved/failed state for important writes.
- Offline: show a banner, queue writes, retry automatically, never lose user input (exam answers, notes, forms).
- Long operations show progress and can be retried; no dead ends.
- Persist the minimum needed to resume (current question, scroll position, draft) and restore on return.

## 15. Special flows

### Test attempt (exam)
- Header: one-line timer (HH:MM:SS, no wrapping), Pause if supported, compact title (ellipsis). Timer turns amber under 10 min, red under 2 min; announce at 10/5/1 minutes only.
- Timer is based on the SERVER end time, never only on the client clock. Autosave every change (debounced) with offline queue. Resume restores answers, flags, current question and remaining time.
- Section tabs: scrollable chips, labels never cut mid-word. Question area scrolls between sticky header and sticky bottom bar.
- Options: full-width cards, 48px height, radio/checkbox with clear selected state. Numeric questions use a numeric keypad.
- Bottom bar: Save & Next (primary), Mark for Review & Next, Clear Response. Safe-area aware. Bottom tab bar hidden.
- Palette: floating button with unanswered badge, opens a bottom sheet on phones (persistent right panel on tablet landscape and desktop); statuses distinguishable by shape/icon, not colour only; Question Paper, Instructions and Submit inside.
- Submit: confirmation with counts, double-submit protection, retry that never loses answers. Keep the screen awake (Wake Lock) and guard accidental back/refresh.

### Video lesson
- Player sticky at the top on phones, 16:9; tabs below (Overview, Lessons, Notes, Resources); curriculum as a collapsible list or a sheet; progress saved periodically; "Mark complete" reachable by thumb. Landscape fullscreen supported.

### Tutorials / Rosera content
- Content blocks are fluid: code blocks scroll horizontally inside their own box with a copy button; tables scroll in a container; diagrams scale; quizzes and flows stack on phones.
- Imported full-HTML modules run in a sandboxed iframe (no `allow-same-origin`), with a fixed-height mode for fullscreen apps, and never produce page-level horizontal scroll.

### Importers and studio (teacher/admin)
- Studio screens must be usable on a tablet. Heavy editors are lazy-loaded and may show a "best on larger screen" hint on phones, but must not break.
- Preview shows the learner view at phone, tablet and desktop widths.

## 16. Security that affects UI
- Escape all text; allow only our own inline markers (`==highlight==`, `**bold**`, `` `code` ``) through the shared formatter. Sanitize SVG/HTML (DOMPurify). Raw HTML only inside sandboxed iframes or admin-only blocks.
- No secrets or tokens in client bundles. Role checks happen on the server; the UI hides actions but never relies on hiding alone.

## 17. Testing and automation
- **Playwright**: projects for the viewports in section 2; screenshot tests for the main screens (Home, Tests, Test series detail, Courses, Video lesson, Tutorial reader, Attempt, Login) in light and dark; assert no horizontal overflow and bar overlap.
- **Accessibility**: `@axe-core/playwright` on each main screen; fail on serious/critical issues.
- **Lighthouse CI**: mobile budgets (Performance >= 85, Accessibility >= 95 as starting targets; tighten over time).
- **Real devices**: before a release, smoke-test one iPhone (Safari) and one mid-range Android (Chrome), including slow-network throttling.
- Visual baselines change only in reviewed commits.
- Use a seeded student account and a seeded teacher account for tests; never test only logged-out pages.

## 18. Anti-patterns (do not do)
- Separate `MobileX` and `DesktopX` copies of the same component with duplicated logic.
- `window.innerWidth` or user-agent checks to switch layouts (use CSS; if JS is unavoidable, `matchMedia` with a server-safe default).
- `100vh` for full-height layouts; fixed pixel widths for text; text smaller than 14px for content.
- Hover-only controls; icon-only buttons without labels; colour-only status.
- Tables forced into narrow screens; modals taller than the screen with no scroll.
- Hardcoded hex colours or `#000`; inline styles for theme values.
- Fake data or placeholder numbers in production UI (ratings, learner counts, live counts). Hide the element when there is no real value.
- Disabling zoom (`user-scalable=no`) or removing focus outlines.
- Loading entire lessons, courses or lists when the screen needs a summary.
- Silent failures: swallowing errors without a visible state.

## 19. Change workflow

### Adding a new screen or feature
1. Sketch the 390px layout first. Decide the primary task and the single primary action.
2. Reuse existing components and tokens; create a new shared component if you need one (responsive by default).
3. Load data in a server component; pass it down; client components only for interaction.
4. Build empty/loading/error/offline states.
5. Verify the checklist below and attach screenshots.

### Changing an existing screen
1. Search the codebase for every use of the component and every variant of the same UI (mobile variant, studio preview, reader, tutorials renderer).
2. Change them together in one PR. List anything intentionally left different.
3. Re-run the screenshot tests; review the diffs on mobile first.

### Auditing existing screens (one-time or periodic)
1. Run the overflow and overlap checks at 320, 360, 390, 768.
2. List violations of this standard per screen with severity (blocks use, hurts use, polish).
3. Fix blockers first (cut-off content, unreachable buttons, hidden actions, broken flows), then polish.

## 20. Pull request checklist
- [ ] Mobile-first: base styles are the phone layout.
- [ ] No duplicate component for the same UI; shared data and hooks.
- [ ] Works at 320/360/390/430/768/1024/1440; no horizontal scroll.
- [ ] Tap targets >= 44px; spacing >= 8px; nothing hover-only.
- [ ] Nothing hidden behind the bottom bar, keyboard or sticky elements; safe areas respected.
- [ ] Tokens only; no hardcoded colours; no pure black; dark mode checked.
- [ ] Hindi/long text checked; no fixed-width text containers.
- [ ] Empty, loading, error, offline states present.
- [ ] Accessibility: focus, labels, contrast, reduced motion, 200% zoom.
- [ ] Performance: Lighthouse mobile before/after, bundle impact noted.
- [ ] Desktop unchanged unless intended; feature flag still works.
- [ ] Screenshots (390, 768, 1440; light and dark) attached; tests updated and passing.
