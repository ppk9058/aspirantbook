# SEO Audit Before (Baseline State Analysis)
**Date**: October 26, 2026  
**Target Repository**: `/Users/praveenkumar/TrillionSkill`  
**Purpose**: Document how title, description, canonical, robots, hreflang, JSON-LD, and sitemap entries are produced across modules prior to SEO core extraction.

---

## 1. Summary of Modules in Scope

| Module | Public Routes | Title & Description | Canonical | Robots | Hreflang | JSON-LD | Sitemap Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Content Engine** | `/question-answer/**`<br>`/hi/question-answer/**` | Dynamic via `seo-model.ts` (Clean & verified) | Dynamic (`baseUrl + path`) | `index, follow` (EN / Rev HI); `noindex, follow` (Unrev HI) | Bidirectional (EN <-> HI) | Quiz + BreadcrumbList | Dedicated sitemaps (`/question-answer/sitemap.xml`, `/hi/...`) |
| **2. PYQs / Test Series** | `/pyqs`<br>`/pyqs/[examId]`<br>`/test-series`<br>`/test-series/[id]` | Static metadata in `/pyqs`; missing in `/pyqs/[examId]` & `/test-series/[id]` | **MISSING** on all 4 routes | Default / unspecified | **MISSING** | **MISSING** | `/test-series` & published series in main sitemap; `/pyqs` catalog **MISSING** |
| **3. Current Affairs** | `/current-affairs-quizzes`<br>`/current-affairs-quizzes/[slug]` | Static on index; dynamic on quiz slug | Present on quiz slug; **MISSING** on index | `index: isPublished` on quiz slug; default on index | **MISSING** | **MISSING** | Index & published quizzes in main sitemap (`app/sitemap.ts:107-113`) |
| **4. Tutorials** | `/tutorials`<br>`/tutorials/[slug]` | Static on index; `course.title` on slug | **MISSING** on index & slug | Default / unspecified | **MISSING** | **MISSING** | Index & non-video courses in main sitemap (`app/sitemap.ts:115-125`) |

---

## 2. Detailed File:Line Audit Per Module

### Module 1: Content Engine (Reference Architecture)
- **Files**:
  - `lib/modules/content-engine/seo-model.ts:1-222`
  - `app/question-answer/[exam]/[subject]/[slug]/page.tsx:22-75`
  - `app/hi/question-answer/[exam]/[subject]/[slug]/page.tsx:18-77`
  - `app/question-answer/sitemap.ts:1-79`
  - `app/hi/question-answer/sitemap.ts:1-78`
- **How Metadata is Produced**:
  - `buildSeoModel()` is a pure function that takes question record, language ("en"|"hi"), and base URL.
  - Constructs title: `{stem} | {Exam} {Year} {Subject} Q&A | TrillionSkill`.
  - Constructs canonical: strict `qaPath(lang, exam, sub, slug)`.
  - Constructs robots: unreviewed Hindi twin strictly receives `noindex, follow`.
  - Constructs hreflang: bidirectional alternates pointing to English and reviewed Hindi twins.
  - Constructs JSON-LD: Schema.org `Quiz` with `Question`, `SuggestedAnswer`, and `BreadcrumbList`. Raw `<` characters are escaped to `\u003c` via `safeJsonLdStringify()`.
- **Verdict**: Gold standard reference architecture. Shared `lib/seo/` core will generalize this pattern for all modules.

---

### Module 2: PYQs and Test Series
- **Files**:
  - `app/(dashboard)/pyqs/page.tsx:13-16`:
    ```typescript
    export const metadata = {
      title: "Previous Year Question Papers (PYQs) | TrillionSkill",
      description: "Download and practice verified previous year examination papers...",
    }
    ```
    - Canonical: **MISSING**
    - Robots: **MISSING**
    - Hreflang: **MISSING**
    - JSON-LD: **MISSING**
    - Sitemap: `/pyqs` is omitted from `app/sitemap.ts:10-53` static routes.
  - `app/(dashboard)/pyqs/[examId]/page.tsx`:
    - `generateMetadata`: **MISSING** (returns Next.js default root title).
    - Canonical, robots, hreflang, JSON-LD: **MISSING**.
    - Category URLs (e.g. `/pyqs/upsc`, `/pyqs/bpsc`) are omitted from `app/sitemap.ts`.
  - `app/(dashboard)/test-series/page.tsx:1`:
    - `"use client"` component without server metadata export.
  - `app/(dashboard)/test-series/[id]/page.tsx`:
    - `generateMetadata`: **MISSING**. Series title and description are rendered in React components but missing in `<head>`.
    - Canonical: **MISSING**.
    - Sitemaps: `app/sitemap.ts:97-104` maps published series to `/test-series/${s.slug}`.

---

### Module 3: Current Affairs Quizzes
- **Files**:
  - `app/(dashboard)/current-affairs-quizzes/page.tsx:9-12`:
    ```typescript
    export const metadata: Metadata = {
      title: "Current Affairs and Quizzes | aspirantbook",
      description: "Daily speed tests, monthly current affairs roundups...",
    }
    ```
    - Brand suffix: Hardcoded "aspirantbook".
    - Canonical: **MISSING**.
    - Robots: **MISSING**.
    - JSON-LD: **MISSING**.
  - `app/(dashboard)/current-affairs-quizzes/[slug]/page.tsx:30-58`:
    - Title: `${quiz.title} - Current Affairs Quiz | aspirantbook`.
    - Canonical: `${baseUrl}/current-affairs-quizzes/${canonicalSlug}`.
    - Robots: `{ index: quiz.isPublished, follow: quiz.isPublished }`.
    - Hreflang: **MISSING**.
    - JSON-LD: **MISSING** (no Quiz or BreadcrumbList schema).
  - Sitemaps:
    - Index route at `app/sitemap.ts:42-46`.
    - Individual quizzes at `app/sitemap.ts:107-113` via `getQuizSlug(q)`.

---

### Module 4: Text-Based Tutorials
- **Files**:
  - `app/(dashboard)/tutorials/page.tsx:9-12`:
    ```typescript
    export const metadata: Metadata = {
      title: "Text-Based Tutorials | aspirantbook",
      description: "In-depth, step-by-step reading tutorials with interactive code blocks...",
    }
    ```
    - Canonical: **MISSING**.
    - Robots: **MISSING**.
    - JSON-LD: **MISSING**.
  - `app/(dashboard)/tutorials/[slug]/page.tsx:11-34`:
    ```typescript
    return {
      title: course.title,
      description: course.description,
    }
    ```
    - Title: Raw course title without site branding or schema.
    - Canonical: **MISSING**.
    - Robots: **MISSING**.
    - Hreflang: **MISSING**.
    - JSON-LD: **MISSING** (no Article or Course schema).
  - Sitemaps:
    - Index route at `app/sitemap.ts:36-40`.
    - Individual tutorials at `app/sitemap.ts:115-125` for non-video published courses.

---

## 3. Safest Strategy & Migration Guidelines
1. **Rule of Invariance on Existing Indexed Metadata**:
   - For all live pages that already possess metadata (e.g. `/current-affairs-quizzes/[slug]`), do NOT modify existing title, canonical, or robots directives without explicit owner approval.
   - Any difference in title or canonical must be placed in `docs/seo/PROPOSED_CHANGES.md`.
2. **Additive-Only Improvements**:
   - Missing canonicals on `/pyqs`, `/tutorials/[slug]`, and `/test-series/[id]` can be safely added.
   - Missing JSON-LD schemas (Schema.org `Quiz`, `Article`, `BreadcrumbList`) can be safely added to enrich Google search appearance.
   - Missing sitemap entries for `/pyqs` can be safely added to `app/sitemap.ts`.
