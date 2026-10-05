# Architectural & Product Decisions Log

## 2026-10-05: Product Alignment, Content Flags & Access Control

### 1. Course & Exam Series Flags Approval
The project owner explicitly approved and finalized the content access flags:
- **Exam Series**:
  - `bpsc-72nd-2026`: Free tier (`isFree = true`, `isPro = false`, `isPublished = true`).
  - `upsc-prelims-2026`: Free tier (`isFree = true`, `isPro = false`, `isPublished = true`).
- **Video Courses**:
  - `72nd-bpsc-prelims-current-affairs`: Paid Premium Course (`isPremium = true`, `price = 3299`, `status = PUBLISHED`).
  - `3`: Paid Premium Course (`isPremium = true`, `price = 99`, `status = PUBLISHED`).
  - `generative-ai`: Free Course (`isPremium = false`, `price = 0`, `status = PUBLISHED`).
  - `ai-course-test`: Free Course (`isPremium = false`, `price = 0`, `status = PUBLISHED`).
  - `ai-course`: Internal Draft Course (`isPremium = true`, `price = 0`, `status = DRAFT`).

### 2. Draft Course Visibility Policy
- Draft courses (`status = DRAFT` or `isPublished = false`) must strictly return **HTTP 404 Not Found** across all student and public touchpoints (detail pages, lesson learn viewers, checkout info API, catalog listings, and search).
- Only authenticated users with the `ADMIN` role are permitted to view or preview draft courses (HTTP 200).
- Even if a student somehow acquired an enrollment row for a draft course, student access is strictly gated with 404 until published by an admin.

### 3. Deprecation of Hardcoded DEMO30 & Introduction of Dynamic Admin Coupons
- The static hardcoded `DEMO30` discount coupon is completely removed from all server actions, checkout interfaces, and demo completion handlers.
- Dynamic coupons are managed exclusively via database records (`Coupon` and `CouponRedemption` models) created by administrators in the Course Creation Studio.
- Demo completion endpoints will only return a promotional coupon if the target course has an active, valid coupon configured with `offerAfterDemo = true`.

### 4. Free Tests in Pro Exam Series
- Tests flagged as `isPro = false` (or `isFree = true`) within an overall Pro exam series are designated as free sample tests.
- UI action buttons and badges across Quizzes Hub, Series Detail, and My Tests explicitly display a distinct "Free sample" indicator to clearly communicate zero-cost access to prospective students.
