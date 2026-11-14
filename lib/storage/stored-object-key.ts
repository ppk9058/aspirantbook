/**
 * Derives a private-bucket object key from a stored URL, and nothing else.
 *
 * Lesson attachments and videos are stored as plain private object URLs
 * (for example https://<bucket>.<account>.r2.cloudflarestorage.com/courses/<uuid>.pdf).
 * Those URLs cannot be handed to a browser: the bucket is private, so the request
 * comes back "InvalidArgument Authorization". The key is what the server needs in
 * order to sign a short-lived GET URL.
 *
 * Security:
 *  - Only URLs that really point at the configured private bucket are accepted
 *    (delegated to isAllowedStorageFileUrl, which matches the configured origin).
 *  - The derived key must sit under one of the lesson-media prefixes below.
 *    Any other key (or any key with traversal) is rejected, so this can never be
 *    used to sign arbitrary objects: no open proxy, no arbitrary src signing.
 *
 * Pure helper: env is read at call time, no AWS SDK import, no side effects.
 */

import { getPrivateBucketName } from "./bucket-name"
import { isAllowedStorageFileUrl } from "./storage-origins"

/** Folders that may hold lesson media. Nothing else is signable. */
export const LESSON_OBJECT_PREFIXES = [
  "courses/",
  "course-docs/",
  "course-videos/",
  "documents/",
  "videos/",
] as const

export function hasAllowedLessonPrefix(key: string): boolean {
  if (!key) return false
  return LESSON_OBJECT_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function isSafeKey(key: string): boolean {
  if (!key) return false
  if (key.startsWith("/")) return false
  if (key.includes("\\") || key.includes("..") || key.includes("//")) return false
  if (/[\x00-\x1f\x7f]/.test(key)) return false
  return true
}

/**
 * Returns the object key (e.g. "courses/<uuid>.pdf") for a stored private-bucket
 * URL, or null when the URL is not one of our bucket objects or the key sits
 * outside the allowed lesson-media prefixes.
 */
export function deriveStoredObjectKey(rawUrl: string | null | undefined): string | null {
  if (typeof rawUrl !== "string") return null
  const url = rawUrl.trim()
  if (!url) return null

  // The URL must belong to the configured private bucket (origin + bucket path).
  if (!isAllowedStorageFileUrl(url)) return null

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(parsed.pathname)
  } catch {
    return null
  }

  const withoutLeadingSlash = decodedPath.replace(/^\/+/, "")
  if (!isSafeKey(withoutLeadingSlash)) return null

  // Virtual-host style: /<key>. Path style: /<bucket>/<key>.
  // isAllowedStorageFileUrl already proved the origin/bucket, so trying both
  // interpretations can only ever yield a key inside our own bucket.
  const bucketPrefix = `${getPrivateBucketName()}/`
  const candidates = [withoutLeadingSlash]
  if (withoutLeadingSlash.startsWith(bucketPrefix)) {
    candidates.push(withoutLeadingSlash.slice(bucketPrefix.length))
  }

  for (const candidate of candidates) {
    if (isSafeKey(candidate) && hasAllowedLessonPrefix(candidate)) {
      return candidate
    }
  }

  return null
}

/** True when a stored value is an http(s) URL that is not one of our bucket objects. */
export function isExternalMediaUrl(rawUrl: string | null | undefined): boolean {
  if (typeof rawUrl !== "string") return false
  const url = rawUrl.trim()
  if (!url) return false
  if (!/^https?:\/\//i.test(url)) return false
  return !isAllowedStorageFileUrl(url)
}
