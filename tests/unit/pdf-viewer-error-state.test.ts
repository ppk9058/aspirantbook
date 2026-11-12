import test from "node:test"
import assert from "node:assert/strict"
import {
  sanitizeProbeUrl,
  resolveProbeStatus,
  getPdfErrorDetails,
  shouldShowDownloadButton,
  isRemoteStorageUrl,
  probePdfAccess,
  PdfProbeStatus,
} from "@/lib/pdf/pdf-viewer-state"

test("Probe URL sanitation: probe URL never has download parameter", () => {
  // Test stripping ?download=1 and ?download=true
  assert.equal(
    sanitizeProbeUrl("/api/pyqs/file/paper_123?download=1"),
    "/api/pyqs/file/paper_123"
  )
  assert.equal(
    sanitizeProbeUrl("/api/pyqs/file/paper_123?download=true"),
    "/api/pyqs/file/paper_123"
  )

  // Test keeping other query parameters while stripping download
  assert.equal(
    sanitizeProbeUrl("/api/current-affairs/file/ca_456?lang=hi&download=1"),
    "/api/current-affairs/file/ca_456?lang=hi"
  )
  assert.equal(
    sanitizeProbeUrl("/api/books/book_789/download?inline=1&download=true"),
    "/api/books/book_789/download?inline=1"
  )

  // Test absolute remote URLs
  assert.equal(
    sanitizeProbeUrl("https://storage.aspirantbook.com/pyq.pdf?download=1&auth=token"),
    "https://storage.aspirantbook.com/pyq.pdf?auth=token"
  )

  // Test URLs without download parameter are preserved unchanged
  assert.equal(sanitizeProbeUrl("/api/pyqs/file/123"), "/api/pyqs/file/123")
  assert.equal(sanitizeProbeUrl("https://example.com/test.pdf"), "https://example.com/test.pdf")
  assert.equal(sanitizeProbeUrl(""), "")
})

test("Probe status resolution: 2xx/3xx, opaque redirect, and remote CORS errors resolve to ready", () => {
  // 2xx and 3xx
  assert.equal(resolveProbeStatus(200), "ready")
  assert.equal(resolveProbeStatus(206), "ready")
  assert.equal(resolveProbeStatus(302), "ready")
  assert.equal(resolveProbeStatus(307), "ready")

  // Status 0 (opaque redirect returned under redirect: 'manual')
  assert.equal(resolveProbeStatus(0), "ready")

  // Remote storage URLs (R2/S3) blocked by CORS in fetch fallback to ready for iframe
  assert.equal(
    resolveProbeStatus(0, { isNetworkError: true, isRemote: true }),
    "ready",
    "Remote storage CORS errors must allow iframe to attempt load"
  )

  // Internal route network failures resolve to error
  assert.equal(
    resolveProbeStatus(0, { isNetworkError: true, isRemote: false }),
    "error",
    "Internal network errors must resolve to error state"
  )
})

test("Probe status resolution: HTTP access errors (401, 403, 404, 5xx)", () => {
  assert.equal(resolveProbeStatus(401), "unauthenticated")
  assert.equal(resolveProbeStatus(403), "unauthorized")
  assert.equal(resolveProbeStatus(404), "not_found")
  assert.equal(resolveProbeStatus(500), "error")
  assert.equal(resolveProbeStatus(502), "error")
  assert.equal(resolveProbeStatus(503), "error")
})

test("Status to message mapping: 401 unauthenticated", () => {
  const details = getPdfErrorDetails("unauthenticated")
  assert.ok(details)
  assert.equal(details?.title, "Please log in to view this document.")
  assert.equal(details?.action, "login")
})

test("Status to message mapping: 403 unauthorized for books, PYQs, and custom messages", () => {
  // Book context (via bookId or /api/books/ in src)
  const bookDetails1 = getPdfErrorDetails("unauthorized", { bookId: "book-1" })
  assert.ok(bookDetails1)
  assert.equal(bookDetails1?.title, "You don't have access to this document.")
  assert.equal(bookDetails1?.description, "Buy this eBook to read the full PDF.")

  const bookDetails2 = getPdfErrorDetails("unauthorized", { src: "/api/books/book-2/download?inline=1" })
  assert.ok(bookDetails2)
  assert.equal(bookDetails2?.title, "You don't have access to this document.")
  assert.equal(bookDetails2?.description, "Buy this eBook to read the full PDF.")

  // PYQ context (via /api/pyqs/ in src)
  const pyqDetails = getPdfErrorDetails("unauthorized", { src: "/api/pyqs/file/pyq-1" })
  assert.ok(pyqDetails)
  assert.equal(pyqDetails?.title, "You don't have access to this document.")
  assert.equal(pyqDetails?.description, "This paper needs the AspirantBook Pass.")

  // Custom 403 message override
  const customDetails = getPdfErrorDetails("unauthorized", {
    custom403Message: "Custom access denied message",
  })
  assert.ok(customDetails)
  assert.equal(customDetails?.title, "You don't have access to this document.")
  assert.equal(customDetails?.description, "Custom access denied message")
})

test("Status to message mapping: 404 not found and 5xx / generic error with retry", () => {
  const notFoundDetails = getPdfErrorDetails("not_found")
  assert.ok(notFoundDetails)
  assert.equal(notFoundDetails?.title, "File not found.")

  const errorDetails = getPdfErrorDetails("error")
  assert.ok(errorDetails)
  assert.equal(errorDetails?.title, "Could not load the document.")
  assert.equal(errorDetails?.action, "retry")

  const customErrorDetails = getPdfErrorDetails("error", {
    customErrorMessage: "Custom server failure message",
  })
  assert.ok(customErrorDetails)
  assert.equal(customErrorDetails?.title, "Custom server failure message")
  assert.equal(customErrorDetails?.action, "retry")

  // Ready and loading return null (no error banner)
  assert.equal(getPdfErrorDetails("loading"), null)
  assert.equal(getPdfErrorDetails("ready"), null)
})

test("Download button visibility: hidden when probe says user has no access", () => {
  const baseConfig = {
    downloadAllowed: true,
    downloadUrl: "/api/books/b1/download?download=true",
  }

  // Only visible when probeStatus is "ready"
  assert.equal(shouldShowDownloadButton({ ...baseConfig, probeStatus: "ready" }), true)

  // Hidden when access is unauthenticated, unauthorized, not_found, error, or loading
  assert.equal(shouldShowDownloadButton({ ...baseConfig, probeStatus: "loading" }), false)
  assert.equal(shouldShowDownloadButton({ ...baseConfig, probeStatus: "unauthenticated" }), false)
  assert.equal(shouldShowDownloadButton({ ...baseConfig, probeStatus: "unauthorized" }), false)
  assert.equal(shouldShowDownloadButton({ ...baseConfig, probeStatus: "not_found" }), false)
  assert.equal(shouldShowDownloadButton({ ...baseConfig, probeStatus: "error" }), false)

  // Hidden if downloadAllowed is false or downloadUrl is missing
  assert.equal(
    shouldShowDownloadButton({
      downloadAllowed: false,
      downloadUrl: "/api/books/b1/download?download=true",
      probeStatus: "ready",
    }),
    false
  )
  assert.equal(
    shouldShowDownloadButton({
      downloadAllowed: true,
      downloadUrl: undefined,
      probeStatus: "ready",
    }),
    false
  )
})

test("probePdfAccess: executes with sanitized URL and returns resolved status", async () => {
  let calledUrl = ""
  let calledOptions: any = null

  const mockFetch = (async (url: string, options?: any) => {
    calledUrl = url
    calledOptions = options
    return {
      status: 403,
      type: "basic",
      body: {
        cancel: async () => {},
      },
    } as any
  }) as typeof fetch

  const result = await probePdfAccess(
    "/api/pyqs/file/p123?download=1&kind=paper",
    mockFetch
  )

  // Verify URL was sanitized before probing
  assert.equal(calledUrl, "/api/pyqs/file/p123?kind=paper")
  assert.ok(!calledUrl.includes("download=1"), "Probed URL must never contain download param")
  assert.equal(calledOptions.method, "GET")
  assert.equal(calledOptions.redirect, "manual")
  assert.equal(result, "unauthorized")
})
