/**
 * Auto-generated 16:10 vector cover SVG for courses.
 * Used as server fallback when thumbnailUrl is empty or invalid,
 * and as client-side onError fallback.
 */

import { BRAND_NAME } from "../brand"

interface CoverParams {
  title?: string | null
  category?: string | null
  brand?: string | null
  bg?: string
  gold?: string
  cream?: string
}

export function generateCourseCoverSvg({
  title = "Course Cover",
  category = "COURSE",
  brand = BRAND_NAME,
  bg = "#1B1F4A",
  gold = "#F5C842",
  cream = "#F0EAD9",
}: CoverParams): string {
  const safeTitle = (title || "Course Cover").trim()
  const safeCategory = (category || "COURSE").trim().toUpperCase()
  const safeBrand = (brand || BRAND_NAME).trim().toUpperCase()

  const truncatedTitle = safeTitle.length > 50 ? `${safeTitle.substring(0, 48)}...` : safeTitle

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
    <defs>
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg}" />
        <stop offset="100%" stop-color="#0B0F2A" />
      </linearGradient>
    </defs>
    <rect width="1600" height="1000" fill="url(#bg-grad)" />
    <circle cx="1400" cy="200" r="300" fill="${gold}" opacity="0.15" />
    <circle cx="200" cy="800" r="250" fill="${gold}" opacity="0.1" />
    <rect x="120" y="140" width="120" height="8" rx="4" fill="${gold}" />
    <text x="120" y="240" fill="${gold}" font-family="sans-serif" font-size="32" font-weight="900" letter-spacing="4">
      ${escapeXml(safeBrand)} • ${escapeXml(safeCategory)}
    </text>
    <text x="120" y="440" fill="${cream}" font-family="sans-serif" font-size="76" font-weight="900">
      ${escapeXml(truncatedTitle)}
    </text>
    <text x="120" y="550" fill="#CBD5E1" font-family="sans-serif" font-size="36" font-weight="500">
      Structured comprehensive curriculum &amp; interactive study resources
    </text>
    <rect x="120" y="760" width="360" height="70" rx="20" fill="${gold}" />
    <text x="300" y="805" fill="#1B1F4A" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="middle">
      ENROLL NOW
    </text>
  </svg>`.trim()

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * Server-side validator: checks if a thumbnail URL is present and looks like a valid URL or data URI.
 */
export function isValidThumbnailUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false
  const trimmed = url.trim()
  if (trimmed === "" || trimmed === "/placeholder-course.svg") return false
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("/")
  )
}
