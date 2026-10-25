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
