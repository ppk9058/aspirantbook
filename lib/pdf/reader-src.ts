import { isAllowedPublicFileUrl } from "@/lib/storage/public-url"
import { isAllowedStorageFileUrl } from "@/lib/storage/storage-origins"

/**
 * Validates a PDF source or download URL on the server before passing it to the reader.
 *
 * A value is allowed only if either:
 * (a) it is a same-origin path that starts with exactly one "/" then "api/",
 *     with no "//", no backslash, no ".." segment (also after decodeURIComponent),
 *     and no control characters.
 * (b) isAllowedPublicFileUrl(value) from lib/storage/public-url.ts returns true.
 * (c) isAllowedStorageFileUrl(value) returns true for matching storage bucket URLs.
 *
 * Rejects empty, "#", javascript:, data:, http:, and any unapproved external URLs.
 */
export function isAllowedReaderSrc(value: unknown): boolean {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return false

  // Reject explicit dangerous schemes and anchors
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("http:") ||
    lower.startsWith("#") ||
    lower.startsWith("//")
  ) {
    return false
  }

  // Check for control characters
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return false
  }

  // Check condition (a): same-origin /api/... path
  if (trimmed.startsWith("/api/")) {
    if (trimmed.includes("//") || trimmed.includes("\\") || trimmed.includes("..")) {
      return false
    }

    try {
      const decoded = decodeURIComponent(trimmed)
      if (
        !decoded.startsWith("/api/") ||
        decoded.includes("//") ||
        decoded.includes("\\") ||
        decoded.includes("..") ||
        /[\x00-\x1f\x7f]/.test(decoded)
      ) {
        return false
      }
    } catch {
      return false
    }

    return true
  }

  // Check condition (b): approved public file URL
  if (isAllowedPublicFileUrl(trimmed)) {
    return true
  }

  // Check condition (c): approved storage file URL
  if (isAllowedStorageFileUrl(trimmed)) {
    return true
  }

  return false
}
