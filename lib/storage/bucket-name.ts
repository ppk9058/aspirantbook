/**
 * The single source of truth for the private bucket name.
 *
 * Reads env at call time only; no AWS SDK import, no side effects, so it is safe
 * in pure unit tests and in any module graph that must not pull the SDK in.
 */

/** Bucket name used when nothing is configured (legacy default). */
export const DEFAULT_PRIVATE_BUCKET = "aspirantbook-uploads"

/** Raw bucket name, or null when no bucket env var is set. */
export function getPrivateBucketNameOrNull(): string | null {
  const value = (
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET ||
    process.env.S3_BUCKET ||
    ""
  ).trim()
  return value ? value : null
}

/** Bucket name, falling back to the legacy default. */
export function getPrivateBucketName(): string {
  return getPrivateBucketNameOrNull() || DEFAULT_PRIVATE_BUCKET
}
