/**
 * Pure state and URL helpers for SecurePdfViewer error-state and access probing.
 *
 * Requirements:
 * - One-shot probe before rendering the iframe.
 * - Strip or omit ?download=1 so download count is never incremented during probing.
 * - Status resolution:
 *   - 2xx / 3xx / opaque redirect (status 0) -> "ready" (render iframe)
 *   - Remote URLs (S3/R2) blocked by CORS in fetch -> "ready" (iframe handles cross-origin)
 *   - 401 -> "unauthenticated"
 *   - 403 -> "unauthorized"
 *   - 404 -> "not_found"
 *   - >= 400 or internal network error -> "error"
 */

export type PdfProbeStatus =
  | "loading"
  | "ready"
  | "unauthenticated"
  | "unauthorized"
  | "not_found"
  | "error"

export interface PdfErrorDetails {
  title: string
  description: string
  action?: "login" | "retry"
}

/** Check if the URL points to an external/remote storage endpoint (e.g. S3, Cloudflare R2). */
export function isRemoteStorageUrl(url: string): boolean {
  if (!url) return false
  return url.startsWith("http://") || url.startsWith("https://")
}

/**
 * Strips any download parameter (?download=... or &download=...) from the probe URL.
 * Probing must NEVER increment download counts.
 */
export function sanitizeProbeUrl(src: string): string {
  if (!src) return ""
  try {
    const isRelative = src.startsWith("/") || !src.includes("://")
    const parsed = new URL(src, "http://localhost")
    parsed.searchParams.delete("download")
    if (isRelative) {
      return parsed.pathname + (parsed.search ? parsed.search : "") + (parsed.hash ? parsed.hash : "")
    }
    return parsed.toString()
  } catch {
    // Fallback regex strip
    return src
      .replace(/([?&])download=[^&]*(&|$)/, (_, p1, p2) => (p2 && p1 === "?" ? "?" : ""))
      .replace(/[?&]$/, "")
  }
}

/**
 * Resolves an HTTP status code or fetch event to a PdfProbeStatus.
 */
export function resolveProbeStatus(
  statusCode: number,
  options?: {
    isNetworkError?: boolean
    isRemote?: boolean
  }
): PdfProbeStatus {
  if (options?.isNetworkError) {
    // Remote storage URLs (S3 / R2) may fail fetch due to browser CORS restrictions,
    // but the <iframe> can still load and render them safely.
    if (options?.isRemote) {
      return "ready"
    }
    return "error"
  }

  // 0 / opaque redirect (with redirect: "manual")
  if (statusCode === 0) {
    return "ready"
  }

  // 2xx and 3xx
  if (statusCode >= 200 && statusCode < 400) {
    return "ready"
  }

  if (statusCode === 401) {
    return "unauthenticated"
  }

  if (statusCode === 403) {
    return "unauthorized"
  }

  if (statusCode === 404) {
    return "not_found"
  }

  return "error"
}

/**
 * Maps a probe status to user-facing title, description, and optional action.
 */
export function getPdfErrorDetails(
  status: PdfProbeStatus,
  options?: {
    src?: string
    bookId?: string
    custom403Message?: string
    customErrorMessage?: string
  }
): PdfErrorDetails | null {
  if (status === "loading" || status === "ready") {
    return null
  }

  if (status === "unauthenticated") {
    return {
      title: "Please log in to view this document.",
      description: "You must be signed in to access this document.",
      action: "login",
    }
  }

  if (status === "unauthorized") {
    let description = "You don't have access to this document."
    if (options?.custom403Message) {
      description = options.custom403Message
    } else if (options?.bookId || options?.src?.includes("/api/books/")) {
      description = "Buy this eBook to read the full PDF."
    } else if (options?.src?.includes("/api/pyqs/")) {
      description = "This paper needs the AspirantBook Pass."
    }

    return {
      title: "You don't have access to this document.",
      description,
    }
  }

  if (status === "not_found") {
    return {
      title: "File not found.",
      description: "The requested document could not be found.",
    }
  }

  // "error" (status >= 400 or internal network failure)
  return {
    title: options?.customErrorMessage || "Could not load the document.",
    description: "An unexpected error occurred while loading this document.",
    action: "retry",
  }
}

/**
 * Download button is only shown when download is allowed, a downloadUrl exists,
 * and the probe confirmed access is ready (not blocked by 401/403/404/error/loading).
 */
export function shouldShowDownloadButton(options: {
  downloadAllowed?: boolean
  downloadUrl?: string
  probeStatus: PdfProbeStatus
}): boolean {
  if (!options.downloadAllowed) return false
  if (!options.downloadUrl) return false
  return options.probeStatus === "ready"
}

/**
 * Performs a one-shot probe using GET with manual redirect and body cancellation.
 */
export async function probePdfAccess(
  src: string,
  fetchFn: typeof fetch = fetch
): Promise<PdfProbeStatus> {
  const cleanUrl = sanitizeProbeUrl(src)
  if (!cleanUrl) return "ready"

  const isRemote = isRemoteStorageUrl(cleanUrl)

  try {
    const res = await fetchFn(cleanUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    })

    try {
      await res.body?.cancel()
    } catch {
      // Body may already be consumed or closed
    }

    if (res.type === "opaqueredirect") {
      return "ready"
    }

    return resolveProbeStatus(res.status, { isRemote })
  } catch {
    return resolveProbeStatus(0, { isNetworkError: true, isRemote })
  }
}
