import fs from "fs"
import path from "path"

/**
 * Legacy local-disk JSON store.
 *
 * B3 introduced `PERSIST_BACKEND=db` as the supported backend and kept the old
 * file-based behaviour only as an opt-in fallback (`PERSIST_BACKEND=fs`, the
 * default, unchanged). The filesystem code lives here so the service modules
 * that own the database path do not import `fs` at all: on a serverless or
 * multi-instance deployment they can never accidentally touch local disk.
 *
 * Do not add new callers. New persistence must go through Prisma/S3.
 */

export function readJsonArray<T>(file: string): T[] {
  try {
    if (!fs.existsSync(file)) return []
    const content = fs.readFileSync(file, "utf-8")
    return JSON.parse(content) as T[]
  } catch {
    return []
  }
}

export function writeJsonArray<T>(file: string, value: T[]): void {
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8")
}
