/**
 * Brand configuration — single source of truth.
 *
 * The final site name is not decided yet, so every surface that shows the brand
 * reads it from here instead of hardcoding a string. Override with
 * NEXT_PUBLIC_BRAND_NAME (or the older NEXT_PUBLIC_SITE_NAME) without touching code.
 */

const rawBrand =
  process.env.NEXT_PUBLIC_BRAND_NAME ||
  process.env.NEXT_PUBLIC_SITE_NAME ||
  "AspirantBook"

export const BRAND_NAME = rawBrand

/** Lowercase, URL-safe variant (used for handles/domains where casing looks odd). */
export const BRAND_SLUG = BRAND_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/** Short line used under the brand in page headers. */
export const BRAND_TAGLINE = "Structured preparation for every exam"

export function brandContainsBrandName(value: string): boolean {
  return value.toLowerCase().includes(BRAND_NAME.toLowerCase())
}
