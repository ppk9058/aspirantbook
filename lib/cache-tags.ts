import { revalidateTag } from "next/cache"

/**
 * Canonical cache-tag registry (B-015).
 *
 * Every `unstable_cache` read in the app must use one of these tags, and every
 * mutation that changes the underlying rows must invalidate the same tag.
 * Keep this list in sync with the reads:
 *
 *   courses          app/(dashboard)/dashboard, /courses, /courses/[slug],
 *                    /tutorials, lib/coupons/badge-query, lib/services/course-matcher
 *   tutorials        app/(dashboard)/tutorials
 *   pyqs             app/(dashboard)/pyqs
 *   tracks           app/(dashboard)/tracks
 *   current-affairs  app/(dashboard)/current-affairs-quizzes
 *   coupons          lib/coupons/badge-query
 *   content-engine   lib/modules/content-engine/db-service (public questions)
 *   batches          lib/batches-service
 *   exam-series      lib/exam-tests, lib/exam-packages
 *   course-syllabus  lib/courses/syllabus (per-course exam-syllabus view)
 */
export const CACHE_TAGS = {
  courses: "courses",
  tutorials: "tutorials",
  pyqs: "pyqs",
  tracks: "tracks",
  currentAffairs: "current-affairs",
  coupons: "coupons",
  contentEngine: "content-engine",
  batches: "batches",
  examSeries: "exam-series",
  courseSyllabus: "course-syllabus",
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

/**
 * Invalidates one or more tags after a mutation.
 *
 * `revalidateTag` requires a Next request scope. Background jobs, CLIs and unit
 * tests run without one, so a failure is logged instead of crashing the mutation
 * (the cache entry then simply expires with its TTL).
 */
export function safeRevalidateTags(...tags: CacheTag[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag)
    } catch (error) {
      console.warn(`[cache] revalidateTag("${tag}") skipped outside a request scope:`, error)
    }
  }
}
