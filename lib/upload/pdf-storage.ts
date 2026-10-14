import fs from "fs/promises"
import path from "path"

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
 * Saves a PDF to the specified subdirectory (e.g. "books-sample", "books-secure", "ca-private", "pyq-private")
 */
export async function savePdfFile(
  file: File,
  subFolder: string,
  isPublic: boolean = false
): Promise<PdfUploadResult> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  if (!isPdf) {
    throw new Error("Invalid file format. Only PDF files are permitted.")
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = validatePdfBuffer(buffer)
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid PDF file")
  }

  const timestamp = Date.now()
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80)
  const fileName = `${timestamp}-${safeBaseName || "document"}.pdf`

  // Public files can be placed in public/uploads/ or uploads/
  const targetDir = isPublic
    ? path.join(process.cwd(), "public", "uploads", subFolder)
    : path.join(process.cwd(), "uploads", subFolder)

  await fs.mkdir(targetDir, { recursive: true })
  const destinationPath = path.join(targetDir, fileName)
  await fs.writeFile(destinationPath, buffer)

  const detectedPages = estimatePdfPageCount(buffer)
  const fileSizeBytes = buffer.length
  const fileSizeKb = Math.round(fileSizeBytes / 1024)
  const fileSizeMb = Number((fileSizeBytes / (1024 * 1024)).toFixed(2))

  const url = isPublic
    ? `/uploads/${subFolder}/${fileName}`
    : `/uploads/${subFolder}/${fileName}`

  return {
    url,
    filePath: destinationPath,
    fileName: file.name,
    fileSizeKb,
    fileSizeMb,
    fileSizeBytes,
    detectedPages: detectedPages > 0 ? detectedPages : undefined,
  }
}
