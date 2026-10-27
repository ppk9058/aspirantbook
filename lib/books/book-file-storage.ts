import path from "path"
import fs from "fs/promises"

/** Root for newly uploaded book PDFs. Object storage keys map under here. */
export const BOOK_STORAGE_ROOT = path.resolve(
  process.env.BOOK_STORAGE_ROOT || path.join(process.cwd(), "public", "uploads", "books")
)

const PUBLIC_ROOT = path.resolve(process.cwd(), "public")

export class BookFileError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Canonicalises a stored book file reference into a relative storage key.
 * Rejects absolute paths, `..`, backslash tricks, NUL bytes, URLs and any
 * legacy public path outside /uploads and /images.
 * Returns null for anything that must not be resolved.
 */
export function normalizeBookStorageKey(input: unknown): string | null {
  if (typeof input !== "string") return null
  const value = input.trim()
  if (!value) return null
  if (value.startsWith("http://") || value.startsWith("https://")) return null
  if (value.includes("\0")) return null

  const withoutQuery = value.split(/[?#]/)[0]
  if (!withoutQuery) return null

  let rel = withoutQuery.replace(/\\/g, "/")

  if (rel.startsWith("/")) {
    // Legacy public URL that must keep working for already-stored files.
    if (!rel.startsWith("/uploads/") && !rel.startsWith("/images/")) return null
    rel = rel.slice(1)
  }

  if (path.isAbsolute(rel)) return null

  const parts = rel.split("/")
  if (parts.length === 0) return null
  if (parts.some((part) => part === "" || part === "." || part === "..")) return null

  return rel
}

function baseFor(key: string): string {
  return key.startsWith("uploads/") || key.startsWith("images/") ? PUBLIC_ROOT : BOOK_STORAGE_ROOT
}

/**
 * Resolves a storage key to a path that is guaranteed to sit inside the
 * allowed root, including after symlink resolution. Throws BookFileError.
 */
export async function resolveBookFilePath(input: unknown): Promise<string> {
  const key = normalizeBookStorageKey(input)
  if (!key) {
    throw new BookFileError(400, "Invalid book file reference")
  }

  const base = baseFor(key)
  const resolved = path.resolve(base, key)
  const baseWithSep = base.endsWith(path.sep) ? base : base + path.sep
  if (resolved !== base && !resolved.startsWith(baseWithSep)) {
    throw new BookFileError(403, "Book file reference escapes the storage root")
  }

  let realBase: string
  let realFile: string
  try {
    realBase = await fs.realpath(base)
  } catch {
    throw new BookFileError(404, "Book storage is not available")
  }
  try {
    realFile = await fs.realpath(resolved)
  } catch (err: any) {
    if (err?.code === "ENOENT") throw new BookFileError(404, "Book file not found")
    throw new BookFileError(502, "Book file could not be read")
  }

  const realBaseWithSep = realBase.endsWith(path.sep) ? realBase : realBase + path.sep
  if (realFile !== realBase && !realFile.startsWith(realBaseWithSep)) {
    throw new BookFileError(403, "Book file reference escapes the storage root")
  }
  return realFile
}

/** Reads a book file or throws a BookFileError with an HTTP status. Never fabricates a file. */
export async function readBookFile(input: unknown): Promise<Buffer> {
  const filePath = await resolveBookFilePath(input)
  try {
    return await fs.readFile(filePath)
  } catch (err: any) {
    if (err?.code === "ENOENT") throw new BookFileError(404, "Book file not found")
    throw new BookFileError(502, "Book file could not be read")
  }
}
