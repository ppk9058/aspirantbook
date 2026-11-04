/**
 * Legacy course slug aliases — one map for every consumer.
 *
 * Four API routes each carried an identical copy of this map. Keep it here and
 * keep the entries frozen: they exist so old shared links keep resolving.
 */

export const COURSE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  "half-yearly-678": "half-yearly-6",
  "half-yearly-78": "half-yearly-6",
  "half-yearly-8": "half-yearly-6",
  "upsc-prelims-mains-batch": "upsc-prelims-mains-comprehensive-batch",
  "upsc-gs-primer": "upsc-gs-foundation-primer",
  // Legacy flagship alias — kept so existing shared links keep working.
  "bpsc-prelims-current-affairs": "72nd-bpsc-prelims-current-affairs",
  "bpsc-video-2": "bpsc-2nd-video-tutorial",
  "class-6-mastery": "class-6-complete-mastery-batch",
  "class-6-starter": "class-6-foundation-starter",
  "class-7-excellence": "class-7-academic-excellence-batch",
  "class-7-booster": "class-7-concept-booster",
  "class-8-olympiad": "class-8-olympiad-board-foundation-batch",
  "class-8-essentials": "class-8-pre-foundation-essentials",
  "class-9-target-95": "class-9-target-95-foundation-batch",
  "class-9-bridge": "class-9-cbse-bridge-course",
  "class-10-toppers": "class-10-board-toppers-comprehensive-batch",
  "class-10-revision": "class-10-board-revision-sprint",
})

/** Returns the canonical course identifier for a legacy alias, or the input. */
export function resolveCourseAlias(id: string): string
export function resolveCourseAlias(id: string | number | null | undefined): string | number
export function resolveCourseAlias(id: string | number | null | undefined): string | number {
  if (id === null || id === undefined) return ""
  if (typeof id === "number") return id
  return COURSE_ALIASES[id] ?? id
}
