/**
 * WCAG 2.1 Luminance and Contrast Ratio calculation utility.
 * Used by Course Studio Theme tab to validate theme readability.
 */

function parseRgb(color: string): [number, number, number] | null {
  if (!color || typeof color !== "string") return null
  const hex = color.trim().replace(/^#/, "")

  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    return [r, g, b]
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return [r, g, b]
  }

  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)]
  }

  return null
}

function sRgbToLinear(c: number): number {
  const norm = c / 255
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4)
}

export function getLuminance(color: string): number {
  const rgb = parseRgb(color)
  if (!rgb) return 0
  const [r, g, b] = rgb
  return 0.2126 * sRgbToLinear(r) + 0.7152 * sRgbToLinear(g) + 0.0722 * sRgbToLinear(b)
}

export function getContrastRatio(foreground: string, background: string): number {
  const lumA = getLuminance(foreground)
  const lumB = getLuminance(background)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

export const computeContrastRatio = getContrastRatio

export function hasContrastWarning(theme: {
  navy: string
  gold: string
  cream: string
  creamCard: string
  olive: string
  ink: string
}): boolean {
  return evaluateThemeContrast(theme).some((r) => !r.passes)
}

export interface ContrastCheckResult {
  pair: string
  fg: string
  bg: string
  ratio: number
  isLargeTextOnly: boolean
  passes: boolean
  rating: "AAA" | "AA" | "FAIL"
  warning?: string
}

export function evaluateThemeContrast(theme: {
  navy: string
  gold: string
  cream: string
  creamCard: string
  olive: string
  ink: string
}): ContrastCheckResult[] {
  const results: ContrastCheckResult[] = []

  // 1. Hero text (White on Navy) - Normal & Large Text
  const heroWhiteRatio = getContrastRatio("#FFFFFF", theme.navy)
  results.push({
    pair: "Hero Title & Body (White on Navy)",
    fg: "#FFFFFF",
    bg: theme.navy,
    ratio: heroWhiteRatio,
    isLargeTextOnly: false,
    passes: heroWhiteRatio >= 4.5,
    rating: heroWhiteRatio >= 7 ? "AAA" : heroWhiteRatio >= 4.5 ? "AA" : "FAIL",
    warning: heroWhiteRatio < 4.5 ? "Low contrast for white text on hero background (< 4.5:1)" : undefined,
  })

  // 2. Gold CTA text or accents on Navy
  const goldOnNavyRatio = getContrastRatio(theme.gold, theme.navy)
  results.push({
    pair: "Gold Accent on Navy",
    fg: theme.gold,
    bg: theme.navy,
    ratio: goldOnNavyRatio,
    isLargeTextOnly: true,
    passes: goldOnNavyRatio >= 3.0,
    rating: goldOnNavyRatio >= 4.5 ? "AAA" : goldOnNavyRatio >= 3.0 ? "AA" : "FAIL",
    warning: goldOnNavyRatio < 3.0 ? "Gold accent contrast on navy is below WCAG AA (< 3.0:1)" : undefined,
  })

  // 3. Body text (Ink on Cream)
  const inkOnCreamRatio = getContrastRatio(theme.ink, theme.cream)
  results.push({
    pair: "Body Text (Ink on Cream)",
    fg: theme.ink,
    bg: theme.cream,
    ratio: inkOnCreamRatio,
    isLargeTextOnly: false,
    passes: inkOnCreamRatio >= 4.5,
    rating: inkOnCreamRatio >= 7 ? "AAA" : inkOnCreamRatio >= 4.5 ? "AA" : "FAIL",
    warning: inkOnCreamRatio < 4.5 ? "Body text on cream page has low readability (< 4.5:1)" : undefined,
  })

  // 4. Active Tab (White on Olive)
  const tabRatio = getContrastRatio("#FFFFFF", theme.olive)
  results.push({
    pair: "Active Tab Pill (White on Olive)",
    fg: "#FFFFFF",
    bg: theme.olive,
    ratio: tabRatio,
    isLargeTextOnly: false,
    passes: tabRatio >= 4.5,
    rating: tabRatio >= 7 ? "AAA" : tabRatio >= 4.5 ? "AA" : "FAIL",
    warning: tabRatio < 4.5 ? "Active tab fill does not provide enough contrast for white text (< 4.5:1)" : undefined,
  })

  return results
}
