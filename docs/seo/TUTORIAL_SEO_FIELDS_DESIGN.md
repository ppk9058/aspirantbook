# Tutorial SEO Fields & URL Hierarchy Design (Phase H)

## 1. Overview & Architectural Context
Tutorials on TrillionSkill are backed by the `Course` model in `prisma/schema.prisma`. Currently, the SEO adapter `adaptTutorialDetailSeo` (`lib/seo/adapters/tutorials.ts`) automatically generates:
- Page Title: `${course.title} | TrillionSkill`
- Canonical URL: `${baseUrl}/tutorials/${course.slug}`
- Meta Description: `course.description` (or fallback platform default)
- Robots: `index, follow` (when `status === "PUBLISHED"`) or `noindex, follow` (draft)
- JSON-LD: `Course` Schema with `Organization` provider.

To provide editorial teams with fine-grained SEO controls, this document presents the proposed field design, database migration SQL draft, adapter fallback hierarchy, and URL architecture.

---

## 2. Chapter URL Hierarchy Confirmation (H4)
- **Current Architecture**: In `app/(dashboard)/tutorials/[slug]/page.tsx:40-60`, each tutorial renders all chapters and lessons within a single consolidated view (`AspirantbookTutorialView`).
- **URL Pattern**: All chapters **share a single canonical URL**: `/tutorials/[slug]`.
- **SEO Implication ("One Page = One Keyword")**:
  - Because all chapters exist under a single URL, the page ranks for the overarching topic/course keyword rather than granular sub-chapter long-tail keywords.
  - *Future Recommendation*: If individual chapters are to target distinct search queries (e.g. "React Hooks Tutorial" vs "React State Tutorial"), a child route `/tutorials/[slug]/[chapterSlug]` should be introduced, with each chapter emitting its own unique metadata, canonical, and `TechArticle` Schema.org JSON-LD.

---

## 3. Proposed Editable Fields for Tutorials

| Field Name | Prisma Type | SQL Type | Description | Editorial Validation |
|---|---|---|---|---|
| `seoDescription` | `String?` | `TEXT NULL` | Custom SERP snippet description | Max 160 characters; recommended 120–155 chars. |
| `focusKeyword` | `String?` | `TEXT NULL` | Primary search keyword/intent | Single phrase or comma-separated tags. |
| `authorName` | `String?` | `TEXT NULL` | Displayed author / educator name | For Google E-E-A-T rich snippet signals. |
| `seoUpdatedAt` | `DateTime?` | `TIMESTAMPTZ NULL` | Explicit editorial content review date | Emitted in `dateModified` Schema.org. |

---

## 4. Exact Nullable Migration SQL Draft

> [!IMPORTANT]
> **Owner Pending Decision**: Per Global Hard Rules, **no database migrations or schema alterations were applied tonight**. The schema remains 100% untouched. The following SQL migration is drafted for future owner execution:

```sql
-- Migration Draft: add_tutorial_seo_fields.sql
-- Additive, nullable columns only (100% backward-compatible, zero downtime)

ALTER TABLE "Course"
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "focusKeyword" TEXT,
  ADD COLUMN IF NOT EXISTS "authorName" TEXT,
  ADD COLUMN IF NOT EXISTS "seoUpdatedAt" TIMESTAMP(3) WITH TIME ZONE;

-- Add index for focus keyword lookups (optional for internal search)
CREATE INDEX IF NOT EXISTS "Course_focusKeyword_idx" ON "Course"("focusKeyword") WHERE "focusKeyword" IS NOT NULL;
```

---

## 5. Adapter Fallback Architecture (`adaptTutorialDetailSeo`)

When the fields above are added to the Prisma schema, `adaptTutorialDetailSeo` will implement the following fallback hierarchy:

```ts
export function adaptTutorialDetailSeo(
  course: CourseWithSeoFields,
  baseUrl?: string
): SharedSeoOutput {
  // 1. Meta Description Fallback
  const description =
    course.seoDescription?.trim() ||
    course.description?.trim() ||
    `Master ${course.title} with step-by-step interactive lessons and structured documentation on TrillionSkill.`

  // 2. Author Fallback
  const author = course.authorName?.trim() || "TrillionSkill Editorial Team"

  // 3. Date Modified Fallback
  const lastModified = course.seoUpdatedAt || course.updatedAt || new Date()

  // 4. Schema.org Course + TechArticle JSON-LD
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Course",
      name: course.title,
      description,
      provider: {
        "@type": "Organization",
        name: "TrillionSkill",
        url: canonicalUrl("/", baseUrl),
      },
      author: {
        "@type": "Person",
        name: author,
      },
      dateModified: lastModified.toISOString(),
      ...(course.focusKeyword ? { keywords: course.focusKeyword } : {}),
    },
  ]

  return buildSeoPackage({
    title: `${course.title} | TrillionSkill`,
    description,
    canonicalPath: `/tutorials/${course.slug || course.id}`,
    isPublished: course.status === "PUBLISHED" && course.isPublished !== false,
    jsonLd,
  }, baseUrl)
}
```

---

## 6. Publish Readiness Checklist in Admin UI (H2)
The `/admin/seo` page now includes a dedicated "Publish Readiness Audit" section that performs non-blocking editorial quality checks:
- Missing description warning
- Thin content warning (< 80 characters)
- Duplicate title warning across active tutorials/PYQs
- Missing author warning

These checks provide immediate visibility to course creators without impeding the publishing lifecycle.
