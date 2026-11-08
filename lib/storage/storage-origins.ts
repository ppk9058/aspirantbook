/**
 * Pure helper for validating direct S3/storage file URLs.
 *
 * Mirrors the URL construction in lib/s3.ts (uploadToS3 legacy branch) without
 * importing the AWS SDK. Reads env at call time only; no side effects.
 */

export function isAllowedStorageFileUrl(value: string): boolean {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return false

  // Reject control characters
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return false

  // Protocol must be https:
  if (!trimmed.startsWith("https://")) return false

  // Raw string must contain no "//" after the scheme and no ".."
  const afterScheme = trimmed.slice("https://".length)
  if (afterScheme.includes("//") || trimmed.includes("..") || trimmed.includes("\\")) {
    return false
  }

  // Decoded string must also have no control characters, no "//" after scheme, and no ".."
  try {
    const decoded = decodeURIComponent(trimmed)
    if (/[\x00-\x1f\x7f]/.test(decoded)) return false
    if (!decoded.startsWith("https://")) return false
    const decodedAfterScheme = decoded.slice("https://".length)
    if (decodedAfterScheme.includes("//") || decoded.includes("..") || decoded.includes("\\")) {
      return false
    }
  } catch {
    return false
  }

  // Parse URL
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:") return false
  if (parsed.username || parsed.password) return false

  // Check bucket env: AWS_S3_BUCKET_NAME || AWS_S3_BUCKET || S3_BUCKET
  // If no bucket env is set, return false. Never hardcode any host or bucket name.
  const bucket = (
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET ||
    process.env.S3_BUCKET ||
    ""
  ).trim()
  if (!bucket) return false

  const s3Endpoint = (process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT || "").trim()

  if (s3Endpoint) {
    let endpointUrl: URL
    try {
      endpointUrl = new URL(s3Endpoint)
    } catch {
      return false
    }

    // An http: endpoint can never match because https is required
    if (endpointUrl.protocol !== "https:") return false
    if (endpointUrl.username || endpointUrl.password) return false

    const isPathStyle =
      process.env.S3_FORCE_PATH_STYLE === "true" ||
      process.env.AWS_S3_FORCE_PATH_STYLE === "true" ||
      Boolean(s3Endpoint.includes("127.0.0.1") || s3Endpoint.includes("localhost"))

    if (isPathStyle) {
      // Path-style: origin of endpoint and pathname must start with "/<bucket>/"
      if (parsed.origin.toLowerCase() !== endpointUrl.origin.toLowerCase()) return false
      const prefix = `/${bucket}/`
      if (!parsed.pathname.startsWith(prefix)) return false
      if (parsed.pathname.length <= prefix.length) return false
      return true
    } else {
      // Virtual-host with endpoint: origin https://<bucket>.<endpoint host>
      const expectedOrigin = `https://${bucket}.${endpointUrl.host}`.toLowerCase()
      if (parsed.origin.toLowerCase() !== expectedOrigin) return false
      if (parsed.pathname.length <= 1) return false
      return true
    }
  }

  // Default AWS virtual-host: https://<bucket>.s3.<region>.amazonaws.com
  const region = (process.env.AWS_REGION || process.env.S3_REGION || "us-east-1").trim() || "us-east-1"
  const expectedOrigin = `https://${bucket}.s3.${region}.amazonaws.com`.toLowerCase()

  if (parsed.origin.toLowerCase() !== expectedOrigin) return false
  if (parsed.pathname.length <= 1) return false

  return true
}
