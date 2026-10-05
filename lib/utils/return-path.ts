/**
 * Context-aware returnPath validator and sanitizer.
 * Strictly accepts same-origin relative paths starting with a single '/'
 * and rejects protocol-relative, absolute URLs, encoded delimiters, and non-http schemes.
 */
export function sanitizeReturnPath(rawPath: string | null | undefined, fallback: string = "/test-series"): string {
  if (!rawPath || typeof rawPath !== "string") {
    return fallback;
  }

  const trimmed = rawPath.trim();

  // Must begin with a single forward slash and not a double slash (protocol-relative)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject backslashes or dangerous characters
  if (trimmed.includes("\\") || trimmed.includes("\0")) {
    return fallback;
  }

  // Reject javascript: or data: or vbscript: anywhere in the path
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:") ||
    lower.includes("http:") ||
    lower.includes("https:")
  ) {
    return fallback;
  }

  // Reject URL encoded slashes or protocol schemes (%2f%2f, %3a, etc.)
  if (/%2f%2f/i.test(trimmed) || /%5c/i.test(trimmed) || /%3a/i.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
