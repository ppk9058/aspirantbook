/**
 * Pure helpers for the public file bucket (covers, preview images, sample PDFs).
 * Reads env at call time only; no AWS SDK import, no side effects.
 */

export function getPublicBucketName(): string | null {
  const value = process.env.S3_PUBLIC_BUCKET_NAME?.trim()
  return value ? value : null
}

export function getPublicBaseUrl(): string | null {
  const raw = process.env.S3_PUBLIC_BASE_URL?.trim()
  if (!raw) return null

  const base = raw.replace(/\/+$/, "")
  if (!base.startsWith("https://")) return null

  try {
    const parsed = new URL(base)
    if (parsed.protocol !== "https:") return null
    return base
  } catch {
    return null
  }
}

export function isPublicStorageConfigured(): boolean {
  return getPublicBucketName() !== null && getPublicBaseUrl() !== null
}

export function buildPublicUrl(key: string): string {
  const base = getPublicBaseUrl()
  const bucket = getPublicBucketName()

  if (!base || !bucket) {
    throw new Error("Public file storage is not configured.")
  }

  const cleanKey = (key || "").replace(/^\/+/, "")
  if (!cleanKey) {
    throw new Error("A storage key is required to build a public URL.")
  }

  // Encode every segment but keep the path separators.
  const encodedKey = cleanKey.split("/").map(encodeURIComponent).join("/")
  return `${base}/${encodedKey}`
}

/**
 * True only for absolute https URLs served by the configured public base URL.
 * Used to validate stored book assets when the public bucket is configured.
 */
export function isAllowedPublicFileUrl(value: string): boolean {
  const base = getPublicBaseUrl()
  if (!base) return false

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "https:") return false
    if (parsed.username || parsed.password) return false
    return parsed.origin === new URL(base).origin
  } catch {
    return false
  }
}
