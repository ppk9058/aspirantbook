/**
 * Context-aware returnPath validator and sanitizer.
 * Enforces strict structural origin validation:
 * 1. Rejects tabs, newlines, control characters, backslashes, and @-tricks.
 * 2. Unpacks single and double URL-encoding.
 * 3. Uses new URL(raw, "http://localhost") to assert identical origin and that pathname starts with exactly one '/'.
 * 4. Allows valid internal query strings, e.g. /search?q=what+is+https:
 */
export function sanitizeReturnPath(rawPath: string | null | undefined, fallback: string = "/test-series"): string {
  if (!rawPath || typeof rawPath !== "string") {
    return fallback;
  }

  // Reject raw or injected whitespace, control chars, tabs, newlines, null bytes
  if (/[\r\n\t\0\x00-\x1F\x7F]/.test(rawPath)) {
    return fallback;
  }

  const trimmed = rawPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("\\")) {
    return fallback;
  }

  // Double-decode safely to catch %252f, %255c, etc.
  let decodedOnce = trimmed;
  try {
    decodedOnce = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  let decodedTwice = decodedOnce;
  try {
    decodedTwice = decodeURIComponent(decodedOnce);
  } catch {
    // If not double-encoded, decodeOnce is fine
  }

  // Check for forbidden delimiters/schemes in decoded variations
  for (const candidate of [trimmed, decodedOnce, decodedTwice]) {
    // Reject control characters or newlines
    if (/[\r\n\t\0]/.test(candidate)) return fallback;
    // Reject Windows backslashes
    if (candidate.includes("\\")) return fallback;
    // Reject protocol-relative double slashes
    if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
    // Reject @ symbol in path before query string (prevents http://localhost/path@evil.com parser differential)
    const pathPart = candidate.split("?")[0];
    if (pathPart.includes("@") || pathPart.startsWith("//") || pathPart.startsWith("/\\")) {
      return fallback;
    }
  }

  // Structural URL validation using base URL
  try {
    // If input is an absolute URL with scheme, URL constructor with base will treat it as absolute
    const parsed = new URL(trimmed, "http://localhost");
    // Origin must remain strictly http://localhost
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }
    // Protocol must strictly be http: (from dummy base)
    if (parsed.protocol !== "http:") {
      return fallback;
    }
    // Pathname must begin with exactly one '/' and never '//'
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }
    // Must not have username or password (e.g. /@evil.com)
    if (parsed.username || parsed.password) {
      return fallback;
    }

    // Return the relative pathname + search + hash
    const relativeResult = parsed.pathname + parsed.search + parsed.hash;
    if (!relativeResult.startsWith("/") || relativeResult.startsWith("//")) {
      return fallback;
    }
    return relativeResult;
  } catch {
    return fallback;
  }
}
