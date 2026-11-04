/**
 * Course Detail design tokens.
 *
 * Exposes palette and typography as CSS custom properties so components never
 * hardcode hex values or fonts. Per-course overridable from Course.theme or metadata.
 */
import type { CSSProperties } from "react"

export interface CourseTheme {
  navy: string
  navyLight: string
  gold: string
  cream: string
  creamCard: string
  creamDark: string
  olive: string
  ink: string
  fontHeading: string
  fontBody: string
}

export const DEFAULT_COURSE_THEME: CourseTheme = {
  navy: "#1B1F4A",
  navyLight: "#252B5C",
  gold: "#F5C842",
  cream: "#F0EAD9",
  creamCard: "#FAF5E8",
  creamDark: "#EAE3CC",
  olive: "#3A3510",
  ink: "#1E1A0F",
  fontHeading: `'Roboto Condensed', 'Archivo Narrow', sans-serif`,
  fontBody: `'Mukta', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
}

export type CourseThemeTokens = CourseTheme
export const DEFAULT_THEME_TOKENS = DEFAULT_COURSE_THEME

function readColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed
  if (/^(rgb|hsl)a?\([0-9.,%\s/]+\)$/i.test(trimmed)) return trimmed
  if (/^[a-z]+$/i.test(trimmed)) return trimmed
  return fallback
}

export function resolveCourseTheme(theme: unknown): CourseTheme {
  const source = (theme && typeof theme === "object" ? theme : {}) as Record<string, any>
  return {
    navy: readColor(source.navy ?? source.primary, DEFAULT_COURSE_THEME.navy),
    navyLight: readColor(source.navyLight, DEFAULT_COURSE_THEME.navyLight),
    gold: readColor(source.gold ?? source.accent, DEFAULT_COURSE_THEME.gold),
    cream: readColor(source.cream ?? source.background, DEFAULT_COURSE_THEME.cream),
    creamCard: readColor(source.creamCard, DEFAULT_COURSE_THEME.creamCard),
    creamDark: readColor(source.creamDark ?? source.sectionBand, DEFAULT_COURSE_THEME.creamDark),
    olive: readColor(source.olive ?? source.secondary, DEFAULT_COURSE_THEME.olive),
    ink: readColor(source.ink, DEFAULT_COURSE_THEME.ink),
    fontHeading: typeof source.fontHeading === "string" && source.fontHeading.trim() ? source.fontHeading : DEFAULT_COURSE_THEME.fontHeading,
    fontBody: typeof source.fontBody === "string" && source.fontBody.trim() ? source.fontBody : DEFAULT_COURSE_THEME.fontBody,
  }
}

/** CSS custom properties consumed by the detail components. */
export function themeVariables(theme: CourseTheme): CSSProperties {
  return {
    ["--cd-navy" as any]: theme.navy,
    ["--cd-navy-light" as any]: theme.navyLight,
    ["--cd-gold" as any]: theme.gold,
    ["--cd-cream" as any]: theme.cream,
    ["--cd-cream-card" as any]: theme.creamCard,
    ["--cd-cream-dark" as any]: theme.creamDark,
    ["--cd-olive" as any]: theme.olive,
    ["--cd-ink" as any]: theme.ink,
    ["--cd-font-heading" as any]: theme.fontHeading,
    ["--cd-font-body" as any]: theme.fontBody,
  }
}

export function fontStackFor(lang: "en" | "hi"): string {
  return lang === "hi"
    ? `'Mukta', 'Noto Sans Devanagari', 'Nirmala UI', sans-serif`
    : DEFAULT_COURSE_THEME.fontBody
}
