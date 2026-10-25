# SEO Core Architecture & Implementation Decisions

## DECISION 1: Shared Core (`lib/seo/`) with Pure Functional Design
- **Context**: TrillionSkill has multiple public learning verticals (Content Engine MCQs, PYQs, Test Series, Current Affairs Quizzes, and Tutorials). Previously, metadata generation was fragmented, with some pages having custom builders, some having basic Next.js metadata objects, and others lacking `generateMetadata` entirely.
- **Decision**: Author a single, shared pure functional core in `lib/seo/core.ts` accompanied by strict TypeScript types in `lib/seo/types.ts`.
- **Rationale**:
  - Pure functions are zero-side-effect, 100% deterministic, and immediately unit-testable without database mocking.
  - Standardizes canonical URL construction, robots indexing policies, bilingual hreflang linking, JSON-LD serialization, and sitemap entries across the entire application.

## DECISION 2: Canonical Origin Dynamic Resolution
- **Context**: Hardcoded hosts (e.g. `questions.aspirantbook.com`, `http://localhost:3000`) risk leaking staging or incorrect subdomains into production search indexes.
- **Decision**: Canonical base URL is dynamically evaluated via `getBaseUrl()`, prioritizing `NEXT_PUBLIC_SITE_URL`, then `NEXT_PUBLIC_APP_URL`, falling back safely to `https://aspirantbook.com`. No hardcoded dev or port-bound hosts exist in library logic.

## DECISION 3: Bilingual Hreflang Strict Review Gating
- **Context**: Machine-translated Hindi content without human verification may have inaccuracies or OCR artifacts.
- **Decision**: Hindi alternate links (`hreflang="hi"`) are emitted IF AND ONLY IF `isHindiReviewed === true` and the question/page is published. Unreviewed Hindi content receives `robots: "noindex, follow"` and is omitted from `hreflang` alternates to protect domain reputation and prevent search crawl penalties.

## DECISION 4: Inline Script XSS Neutralization
- **Context**: User-supplied or exam-sourced stems can contain strings like `</script><script>alert(1)</script>` or HTML comparison operators (`<`, `>`).
- **Decision**: All structured data embedded in `<script type="application/ld+json">` must be serialized through `safeJsonLdStringify()`, which replaces `<` with its unicode escape `\u003c`.

## DECISION 5: Sitemap Expansion in `app/sitemap.ts`
- **Context**: The existing `app/sitemap.ts` included static pages, courses, books, and quizzes, but lacked `/pyqs` and exam category URLs (`/pyqs/[category]`).
- **Decision**: Add `/pyqs` to `staticRoutes` and query published `pyqCategory` rows to emit `/pyqs/${category.slug}` sitemap entries. `app/robots.ts` maintains additive-only references pointing to `/sitemap.xml`, `/question-answer/sitemap.xml`, and `/hi/question-answer/sitemap.xml`.

## DECISION 6: Strict RBAC on `/admin/seo` Dashboard
- **Context**: The admin SEO audit dashboard queries aggregated database counts and indexing diagnostics.
- **Decision**: Protected with `app/admin/seo/layout.tsx`. Requires `user.role === "ADMIN"`. Teachers are redirected to `/teacher`, unauthorized users to `/login`. In production (`NODE_ENV === "production"`), `demo-` cookie bypass is strictly prohibited.
