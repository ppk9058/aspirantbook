import React from "react"

export const TEST_TYPE_LABELS: Record<string, string> = {
  FULL_MOCK: "Full Mock",
  "FULL MOCK": "Full Mock",
  FULL_TEST: "Full Test",
  "FULL TEST": "Full Test",
  CHAPTER: "Chapter Quiz",
  CHAPTER_TEST: "Chapter Test",
  SECTIONAL: "Sectional Test",
  SECTIONAL_TEST: "Sectional Test",
  PYQ: "Previous Year Paper",
  PREVIOUS_YEAR: "Previous Year Paper",
  LIVE_SPEED: "Live Speed Test",
  CURRENT_AFFAIRS: "Current Affairs Quiz",
  DAILY_QUIZ: "Daily Quiz",
}

export function formatTestType(type?: string | null): string {
  if (!type) return "Full Test"
  const normalized = type.toUpperCase().replace(/\s+/g, "_")
  return TEST_TYPE_LABELS[normalized] || TEST_TYPE_LABELS[type.toUpperCase()] || type
}

export const ACCESS_MODE_LABELS: Record<string, string> = {
  FREE: "Free Tier",
  PRO: "TrillionPass PRO",
}

export function formatAccessMode(mode?: string | null): string {
  if (!mode) return "Free Tier"
  return ACCESS_MODE_LABELS[mode.toUpperCase()] || mode
}

export function formatDifficulty(diff?: string | null): string {
  if (!diff) return "Medium"
  const upper = diff.toUpperCase()
  if (upper === "EASY") return "Easy"
  if (upper === "MEDIUM") return "Medium"
  if (upper === "HARD") return "Hard"
  return diff
}

export function formatLanguage(lang?: string | null): string {
  if (!lang) return "English"
  const lower = lang.toLowerCase()
  if (lower === "en" || lower === "english") return "English"
  if (lower === "hi" || lower === "hindi") return "Hindi"
  if (lower === "bilingual") return "Bilingual"
  return lang
}

export interface StatusBadgeProps {
  status: "PUBLISHED" | "DRAFT" | "LIVE" | "ARCHIVED" | "SCHEDULED" | string
  className?: string
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const norm = String(status || "").toUpperCase()

  let colorClasses = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700"
  let label = norm

  if (norm === "PUBLISHED") {
    colorClasses = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
    label = "Published"
  } else if (norm === "LIVE") {
    colorClasses = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 animate-pulse"
    label = "Live Active"
  } else if (norm === "SCHEDULED") {
    colorClasses = "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
    label = "Scheduled"
  } else if (norm === "DRAFT") {
    colorClasses = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
    label = "Draft"
  } else if (norm === "ARCHIVED") {
    colorClasses = "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20"
    label = "Archived"
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${colorClasses} ${className}`}
    >
      {label}
    </span>
  )
}

export interface AccessBadgeProps {
  accessMode: "FREE" | "PRO" | string
  className?: string
}

export function AccessBadge({ accessMode, className = "" }: AccessBadgeProps) {
  const norm = String(accessMode || "").toUpperCase()
  const isFree = norm === "FREE"

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border tracking-wide uppercase ${
        isFree
          ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
          : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
      } ${className}`}
    >
      {isFree ? "Free" : "Pass PRO"}
    </span>
  )
}

export interface TypeBadgeProps {
  type: string
  className?: string
}

export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider ${className}`}
    >
      {formatTestType(type)}
    </span>
  )
}
