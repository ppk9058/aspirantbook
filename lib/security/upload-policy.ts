import crypto from "crypto"
import path from "path"
import fs from "fs/promises"
import { validateUpload } from "./upload-validator"
import { isPublicStorageConfigured } from "@/lib/storage/public-url"

export type UploadCategory = "image" | "pdf" | "video" | "dataset"

export class UploadError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Extensions that must never be accepted, wherever they appear in a name. */
export const DANGEROUS_EXTENSIONS = [
  ".php",
  ".phtml",
  ".php3",
  ".php4",
  ".php5",
  ".phar",
  ".exe",
  ".sh",
  ".bash",
  ".js",
  ".mjs",
  ".cjs",
  ".html",
  ".htm",
  ".xhtml",
  ".svg",
  ".svgz",
  ".cgi",
  ".pl",
  ".py",
  ".jsp",
  ".asp",
  ".aspx",
  ".htaccess",
  ".jar",
  ".bat",
  ".cmd",
  ".com",
  ".scr",
  ".vbs",
]

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "text/csv": ".csv",
  "application/json": ".json",
  "text/plain": ".txt",
}

/** Rejects traversal, double extensions, hidden files and dangerous suffixes. */
export function assertSafeUploadName(name: string): void {
  if (!name || typeof name !== "string") {
    throw new UploadError(400, "A file name is required")
  }
  if (name.includes("\0")) {
    throw new UploadError(400, "Invalid file name")
  }
  if (name !== path.basename(name) || name.includes("/") || name.includes("\\")) {
    throw new UploadError(400, "Invalid file name: path segments are not allowed")
  }
  if (name.startsWith(".") || name.trim() !== name) {
    throw new UploadError(400, "Invalid file name")
  }

  const lower = name.toLowerCase()
  const parts = lower.split(".")
  if (parts.length < 2) {
    throw new UploadError(400, "File must have an extension")
  }

  // Double extension: any interior segment that is dangerous (e.g. a.php.jpg).
  for (const part of parts.slice(1, -1)) {
    if (DANGEROUS_EXTENSIONS.includes(`.${part}`)) {
      throw new UploadError(400, `File extension .${part} is strictly prohibited`)
    }
  }

  const ext = `.${parts[parts.length - 1]}`
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new UploadError(400, `File extension ${ext} is strictly prohibited`)
  }
}

export interface ValidatedUpload {
  /** Server-generated name. Callers never control this. */
  fileName: string
  mimeType: string
  sizeBytes: number
}

/**
 * Validates an upload and returns a server-generated file name.
 * The caller-supplied name is only used for inspection, never for storage.
 */
export function validateUploadForStorage(
  file: { name: string; size: number; type: string },
  buffer: Buffer,
  category: UploadCategory,
  maxBytes?: number
): ValidatedUpload {
  assertSafeUploadName(file.name)

  if (maxBytes && buffer.length > maxBytes) {
    throw new UploadError(413, `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit`)
  }

  const result = validateUpload(file, buffer, category)
  if (!result.valid) {
    throw new UploadError(400, result.error || "Invalid upload")
  }

  const mimeType = result.mimeType || file.type || "application/octet-stream"
  const ext = MIME_EXTENSIONS[mimeType] || path.extname(file.name).toLowerCase()
  if (!ext || !/^\.[a-z0-9]{1,8}$/.test(ext)) {
    throw new UploadError(400, "Unsupported file type")
  }

  return {
    fileName: `${crypto.randomUUID()}${ext}`,
    mimeType,
    sizeBytes: buffer.length,
  }
}

function isS3Configured(): boolean {
  const hasKey = Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY)
  const hasSecret = Boolean(process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY)
  const hasBucket = Boolean(process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || process.env.S3_BUCKET)
  return Boolean(hasKey && hasSecret && hasBucket)
}

export interface StoredUpload {
  url: string
  fileName: string
  mimeType: string
  sizeKb: number
  storage: "s3" | "local"
  key: string
}

/**
 * Stores a validated upload.
 *
 * Production never falls back to local disk: without object storage the route
 * fails closed with 503 so the owner must configure the bucket (OWNER-ACTION).
 * Non-production (the isolated test server) keeps a local fallback so the
 * existing upload flows stay testable.
 */
export async function storeUpload(input: {
  file: File
  buffer: Buffer
  category: UploadCategory
  folder: string
  maxBytes?: number
  /** "private" keeps the local fallback outside /public, matching legacy pyq/ca paths. */
  visibility?: "public" | "private"
  /**
   * Explicit opt-in used only by Book Studio. Omitted keeps every other
   * caller on the existing private-bucket behaviour.
   */
  storageClass?: "public" | "private"
}): Promise<StoredUpload> {
  const folder = (input.folder || "general").replace(/[^a-zA-Z0-9_-]/g, "")
  if (!folder) throw new UploadError(400, "Invalid upload folder")

  const validated = validateUploadForStorage(input.file, input.buffer, input.category, input.maxBytes)
  const key = `${folder}/${validated.fileName}`

  const wantsPublicStorage = input.storageClass === "public"

  if (isS3Configured()) {
    if (wantsPublicStorage && !isPublicStorageConfigured()) {
      throw new UploadError(503, "Public file storage is not configured.")
    }

    const { uploadToS3 } = await import("@/lib/s3")
    const safeFile = new File([new Uint8Array(input.buffer)], validated.fileName, {
      type: validated.mimeType,
    })
    try {
      const { url } = await uploadToS3(
        safeFile,
        storageTypeFor(input.category),
        key,
        input.storageClass ? { storageClass: input.storageClass } : {}
      )
      return {
        url,
        key,
        fileName: validated.fileName,
        mimeType: validated.mimeType,
        sizeKb: Math.round(validated.sizeBytes / 1024),
        storage: "s3",
      }
    } catch (err) {
      if (wantsPublicStorage) {
        // Never fall back to the private bucket or local disk when S3 mode is on.
        console.error("[upload] Public object storage upload failed; not falling back.", err)
        throw new UploadError(502, "Public file storage is unavailable. Please try again later.")
      }
      if (process.env.NODE_ENV === "production") {
        console.error("[upload] Object storage upload failed; failing closed.", err)
        throw new UploadError(502, "File storage is unavailable. Please try again later.")
      }
      console.error(
        "[upload] Object storage upload failed in a non-production environment; using the local test fallback.",
        err
      )
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[upload] Object storage is not configured (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_S3_BUCKET_NAME). Failing closed with 503."
    )
    throw new UploadError(
      503,
      "File storage is not configured. Please contact the administrator."
    )
  }

  const visibility = input.visibility ?? "public"
  const localBase =
    visibility === "private"
      ? path.join(process.cwd(), "uploads")
      : path.join(process.cwd(), "public", "uploads")
  const targetDir = path.join(localBase, folder)
  const resolved = path.resolve(targetDir, validated.fileName)
  const baseWithSep = path.resolve(localBase) + path.sep
  if (!resolved.startsWith(baseWithSep)) {
    throw new UploadError(400, "Invalid upload path")
  }
  await fs.mkdir(targetDir, { recursive: true })
  await fs.writeFile(resolved, input.buffer)

  return {
    url: `/uploads/${key}`,
    key,
    fileName: validated.fileName,
    mimeType: validated.mimeType,
    sizeKb: Math.round(validated.sizeBytes / 1024),
    storage: "local",
  }
}

function storageTypeFor(category: UploadCategory): "image" | "pdf" | "video" | "dataset" {
  return category
}

/** Maps an UploadError to a JSON response status, without leaking internals. */
export function uploadErrorResponse(err: unknown): { status: number; error: string } {
  if (err instanceof UploadError) return { status: err.status, error: err.message }
  return { status: 500, error: "Failed to process upload" }
}
