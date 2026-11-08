/**
 * Helper to extract and validate the S3/R2 storage key for private PYQ documents.
 * Uploads are stored with key "pyq-private/<fileName>".
 * Stored URLs may be virtual-hosted style (https://bucket.host/key) or
 * path style (https://host/bucket/key), or already relative keys ("pyq-private/...").
 */
export function extractPyqStorageKey(urlOrKey: string | null | undefined): string | null {
  if (!urlOrKey || typeof urlOrKey !== "string") {
    return null
  }

  const trimmed = urlOrKey.trim()
  if (!trimmed) {
    return null
  }

  // Security checks: reject backslashes anywhere in the input
  if (trimmed.includes("\\")) {
    return null
  }

  let pathname = trimmed
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed)
      pathname = parsed.pathname
    } catch {
      return null
    }
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }

  // Find the start of the "pyq-private/" segment
  const marker = "pyq-private/"
  const index = decoded.indexOf(marker)
  if (index === -1) {
    return null
  }

  const candidateKey = decoded.slice(index)

  // Security checks:
  // Reject path traversal attempts (".."), backslashes, and empty segments ("//")
  if (
    candidateKey.includes("..") ||
    candidateKey.includes("\\") ||
    candidateKey.includes("//")
  ) {
    return null
  }

  // Must have a filename after "pyq-private/"
  const filename = candidateKey.slice(marker.length).trim()
  if (!filename) {
    return null
  }

  return candidateKey
}
