/**
 * Helper to build the URL for the shared page-based PDF reader (/pdf/view).
 */
export interface PdfReaderHrefOptions {
  src: string
  downloadUrl?: string
  title?: string
  subtitle?: string
  badge?: string
}

export function buildPdfReaderHref(options: PdfReaderHrefOptions): string {
  const params = new URLSearchParams()
  params.set("src", options.src)

  if (options.downloadUrl) {
    params.set("dl", options.downloadUrl)
  }
  if (options.title) {
    params.set("title", options.title)
  }
  if (options.subtitle) {
    params.set("subtitle", options.subtitle)
  }
  if (options.badge) {
    params.set("badge", options.badge)
  }

  return `/pdf/view?${params.toString()}`
}
