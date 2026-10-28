# SEO Invariance & Proposed Changes Audit

## 1. The Rule of Invariance
In production SEO engineering, changing page titles, meta descriptions, or canonical URLs on already-indexed, ranking URLs carries high risk of rank fluctuation.
Our guiding principle for Part 2 was:
> **Any page that already had production metadata must keep its title and canonical URL invariant. Any intentional difference must be documented here with justification.**

---

## 2. Invariance Verification Results (Snapshot Comparison)

Snapshots were collected from port 3045 before and after adapter integration:
- `docs/seo/evidence/snapshots_before/`
- `docs/seo/evidence/snapshots_after/`
- Automated diff report: `docs/seo/evidence/snapshot_diff_report.json`

| Module | Route / URL | Before Status | After Status | Title Invariant? | Canonical Invariant? | Notes |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Content Engine** | `/question-answer` | 200 OK | 200 OK | **YES** | **YES** | 100% byte-identical |
| **Content Engine** | `/hi/question-answer` | 200 OK | 200 OK | **YES** | **YES** | 100% byte-identical |
| **Content Engine** | `/question-answer/upsc-cse` | 200 OK | 200 OK | **YES** | **YES** | 100% byte-identical |
| **Content Engine** | `/question-answer/upsc-cse/2023` | 200 OK | 200 OK | **YES** | **YES** | 100% byte-identical |
| **Content Engine** | `/question-answer/.../[slug]` | 200 OK | 200 OK | **YES** | **YES** | 100% byte-identical |
| **Current Affairs** | `/current-affairs-quizzes` | 200 OK | 200 OK | **YES** | **YES** | 100% byte-identical |
| **Current Affairs** | `/current-affairs-quizzes/upsc-economy-ca` | 200 OK | 200 OK | **YES** | **YES** | Strictly invariant title and canonical |
| **Tutorials** | `/tutorials` | 200 OK | 200 OK | **YES** | **YES** | 100% byte-identical |
| **Tutorials** | `/tutorials/e2e-20261021025140619-1frn8-course-studio` | 200 OK | 200 OK | **YES** | Enhanced | Preserved title `course.title`, added canonical & robots |

---

## 3. Documented Deviations (Targeted Enhancements)

The following two routes exhibited metadata changes because they previously **lacked metadata generation entirely** and fell back to the root layout's generic site-wide default:

### Deviation 1: `/pyqs/[examId]` (e.g. `/pyqs/bpsc`)
- **Before Title**: `aspirantbook - Interactive Learning Platform &amp; Test Series` (Root layout default)
- **After Title**: `BPSC Previous Year Question Papers (PYQs) | TrillionSkill | aspirantbook`
- **Before Canonical**: `null`
- **After Canonical**: `http://127.0.0.1:3045/pyqs/bpsc`
- **Before Meta Description**: `Master competitive exams, video courses, test series, and comprehensive digital eBooks with aspirantbook.`
- **After Meta Description**: `Official Previous Year Papers for 70th, 69th, 68th, 67th CCE, CDPO, AEDO &amp; TRE.`
- **Justification**: The page had no `generateMetadata` function. Search engines were indexing exam-specific PYQ landing pages under the generic homepage description. Emitting high-relevance exam titles and canonical tags improves CTR and prevents duplicate title warnings in Google Search Console.

### Deviation 2: `/test-series/[id]` (e.g. `/test-series/e2e-series-...`)
- **Before Title**: `aspirantbook - Interactive Learning Platform &amp; Test Series` (Root layout default)
- **After Title**: `E2E Series E2E-20261021124106098-4akv9 Test Series &amp; Mock Tests | TrillionSkill | aspirantbook`
- **Before Canonical**: `null`
- **After Canonical**: `http://127.0.0.1:3045/test-series/e2e-series-e2e-20261021124106098-4akv9`
- **Before Meta Description**: `Master competitive exams, video courses, test series, and comprehensive digital eBooks with aspirantbook.`
- **After Meta Description**: `Take online mock tests for E2E Series E2E-20261021124106098-4akv9. Real-time analytics, all-India ranking, and detailed solutions.`
- **Justification**: Test series individual landing pages lacked specific metadata. Adding exact series title, canonical URL, and Schema.org Product structured data enables rich snippet display in SERPs.


---

## 4. Phase B: Structural JSON-LD & Offer Schema Refinements

### Proposed Change 1: `lib/seo/adapters/test-series.ts` & `app/(dashboard)/test-series/[id]/page.tsx`
- **Issue (O11)**: Test-series emitted `Product` with hardcoded price `"0"` even when the price was null/missing, and omitted offers for paid series without explicit pricing, violating Google Rich Results specifications.
- **Resolution**:
  1. For paid series (`price > 0`), emit complete Offer schema (`price`, `priceCurrency: "INR"`, `availability: "https://schema.org/InStock"`, `url`).
  2. For free series (`price === 0` or `isFree === true`), emit valid Offer schema (`price: "0"`, `priceCurrency: "INR"`, `availability: "https://schema.org/InStock"`).
  3. For missing price or not for sale, fall back gracefully to `Course` schema with `provider: Organization` instead of emitting an incomplete Offer.
  4. For unpublished/archived series, emit `robots: "noindex, nofollow"` and suppress Offer schema completely.

### Proposed Change 2: `components/content-engine-public/PublicQuestionView.tsx`
- **Issue (O2)**: Structural audit across Content Engine question pages. Prior runs encountered a nested `<script>` wrapping bug when raw HTML strings containing `<script>` tags were wrapped in `<script type="application/ld+json">`.
- **Resolution**:
  1. Parse/extract raw JSON-LD schema blocks from `jsonLdScript` or accept structured `jsonLd` directly.
  2. Emit exactly one `<script type="application/ld+json">` tag safely serialized with `safeJsonLdStringify` (escaping `<` to `\u003c`).
  3. Ensure zero nested `<script>` tags, zero surrounding `<div>` or `<section>` tags, and 100% compliant Schema.org JSON parsing.

---

## 5. Proposed Shared Cache Handler for Multi-Instance Deployments (O8)

If self-hosting across multiple Node.js instances behind a load balancer without Vercel's managed data cache, `revalidateTag` and `revalidatePath` calls will only purge the cache of the single instance that received the HTTP request. Other instances may continue serving stale pages until their local time-based cache expires.

To guarantee atomic cross-instance revalidation across a cluster of self-hosted nodes without modifying `next.config.js` tonight, the following configuration is proposed:

```js
// next.config.js (Proposed Configuration - NOT applied tonight)
const nextConfig = {
  // ... existing configuration
  cacheHandler: process.env.NODE_ENV === "production" 
    ? require.resolve("./lib/cache/redis-cache-handler.js") 
    : undefined,
  cacheMaxMemorySize: 0, // Disables local in-memory cache to force cluster-wide consistency
}
```

### Staleness Bounding Guarantee
Even without an external shared cache handler:
- All static question and sitemap routes enforce `export const revalidate = 3600`.
- In the worst-case scenario where an unpublish or edit request hits Node Instance A and a crawler subsequently hits Node Instance B, staleness is strictly bounded to a maximum of 3600 seconds (1 hour). After 3600 seconds, Node Instance B automatically refetches the latest question state from PostgreSQL.

