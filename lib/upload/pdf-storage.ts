export interface PdfUploadResult {
  url: string
  filePath: string
  fileName: string
  fileSizeKb: number
  fileSizeMb: number
  fileSizeBytes: number
  detectedPages?: number
}

/**
 * Validates a PDF file buffer:
 * - Checks size limit (default 50MB)
 * - Checks PDF magic bytes (%PDF)
 */
export function validatePdfBuffer(buffer: Buffer, maxBytes: number = 50 * 1024 * 1024): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty or invalid file buffer" }
  }

  if (buffer.length > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024))
    return { valid: false, error: `File size exceeds maximum limit of ${limitMb} MB` }
  }

  // Validate PDF magic bytes: PDF files start with "%PDF-" (0x25 0x50 0x44 0x46)
  if (buffer.length < 5 || buffer.toString("utf8", 0, 4) !== "%PDF") {
    return { valid: false, error: "Invalid file content. The file does not have a valid PDF signature." }
  }

  return { valid: true }
}

/**
 * Fast best-effort PDF page count detection from raw buffer without external binary dependencies.
 */
export function estimatePdfPageCount(buffer: Buffer): number {
  try {
    const text = buffer.toString("latin1")
    // 1. Check for /Count in page tree root
    const countMatch = text.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/)
    if (countMatch && countMatch[1]) {
      const parsed = parseInt(countMatch[1], 10)
      if (parsed > 0 && parsed < 10000) return parsed
    }

    // 2. Fallback: Count /Type /Page (excluding /Pages)
    const pageMatches = text.match(/\/Type\s*\/Page[^s]/g)
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length
    }
  } catch (err) {
    console.warn("Failed to detect PDF page count:", err)
  }
  return 0
}

/**
 * Saves a PDF through the shared upload policy (validation, server-generated
 * name, object storage with a fail-closed production path). Kept as a thin
 * wrapper so any legacy caller cannot reach the old raw-disk writer.
 */
export async function savePdfFile(
  file: File,
  subFolder: string,
  isPublic: boolean = false
): Promise<PdfUploadResult> {
  const { storeUpload, UploadError } = await import("@/lib/security/upload-policy")

  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = validatePdfBuffer(buffer)
  if (!validation.valid) {
    throw new UploadError(400, validation.error || "Invalid PDF file")
  }

  const stored = await storeUpload({
    file,
    buffer,
    category: "pdf",
    folder: subFolder,
    visibility: isPublic ? "public" : "private",
  })

  const detectedPages = estimatePdfPageCount(buffer)

  return {
    url: stored.url,
    filePath: stored.url,
    fileName: stored.fileName,
    fileSizeKb: stored.sizeKb,
    fileSizeMb: Number((stored.sizeKb / 1024).toFixed(2)),
    fileSizeBytes: stored.sizeKb * 1024,
    detectedPages: detectedPages > 0 ? detectedPages : undefined,
  }
}
