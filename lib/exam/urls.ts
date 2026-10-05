import { sanitizeReturnPath } from "@/lib/utils/return-path"

export interface ExamUrlOptions {
  seriesId: string
  testId: string
  attemptId?: string
  title?: string
  returnPath?: string
}

/**
 * Builds the canonical instructions URL:
 * /test-series/[seriesId]/instructions?testId=[testId]&title=...&returnPath=...
 */
export function getExamInstructionsUrl({
  seriesId,
  testId,
  title,
  returnPath,
}: ExamUrlOptions): string {
  const params = new URLSearchParams()
  params.set("testId", testId)
  if (title) params.set("title", title)
  if (returnPath) {
    const sanitized = sanitizeReturnPath(returnPath, "")
    if (sanitized) params.set("returnPath", sanitized)
  }
  return `/test-series/${encodeURIComponent(seriesId)}/instructions?${params.toString()}`
}

/**
 * Builds the canonical attempt URL:
 * /test-series/[seriesId]/attempt?testId=[testId]&attemptId=[attemptId]&title=...&returnPath=...
 */
export function getExamAttemptUrl({
  seriesId,
  testId,
  attemptId,
  title,
  returnPath,
}: ExamUrlOptions): string {
  const params = new URLSearchParams()
  params.set("testId", testId)
  if (attemptId) params.set("attemptId", attemptId)
  if (title) params.set("title", title)
  if (returnPath) {
    const sanitized = sanitizeReturnPath(returnPath, "")
    if (sanitized) params.set("returnPath", sanitized)
  }
  return `/test-series/${encodeURIComponent(seriesId)}/attempt?${params.toString()}`
}

/**
 * Builds the canonical result / full report URL:
 * /test-series/[seriesId]/result?testId=[testId]&attemptId=[attemptId]
 */
export function getExamResultUrl({
  seriesId,
  testId,
  attemptId,
  title,
  returnPath,
}: ExamUrlOptions): string {
  const params = new URLSearchParams()
  params.set("testId", testId)
  if (attemptId) params.set("attemptId", attemptId)
  if (title) params.set("title", title)
  if (returnPath) {
    const sanitized = sanitizeReturnPath(returnPath, "")
    if (sanitized) params.set("returnPath", sanitized)
  }
  return `/test-series/${encodeURIComponent(seriesId)}/result?${params.toString()}`
}

/**
 * Builds the canonical solutions URL:
 * /test-series/[seriesId]/solutions?testId=[testId]&attemptId=[attemptId]
 */
export function getExamSolutionsUrl({
  seriesId,
  testId,
  attemptId,
  title,
}: ExamUrlOptions): string {
  const params = new URLSearchParams()
  params.set("testId", testId)
  if (attemptId) params.set("attemptId", attemptId)
  if (title) params.set("title", title)
  return `/test-series/${encodeURIComponent(seriesId)}/solutions?${params.toString()}`
}

/**
 * Builds the canonical leaderboard URL:
 * /test-series/[testId]/leaderboard
 */
export function getExamLeaderboardUrl(testId: string): string {
  return `/test-series/${encodeURIComponent(testId)}/leaderboard`
}
