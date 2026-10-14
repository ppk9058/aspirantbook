import fs from "fs/promises"
import { constants } from "fs"
import path from "path"

/**
 * Cross-process and in-process atomic file locking.
 * Uses POSIX O_CREAT | O_EXCL (mode "wx") to guarantee kernel-level mutual exclusion
 * between separate Node.js processes (dev server, test runner, background scripts).
 */
const inProcessMutex = new Map<string, Promise<void>>()

async function acquireInProcessMutex(filePath: string): Promise<() => void> {
  while (inProcessMutex.has(filePath)) {
    try {
      await inProcessMutex.get(filePath)
    } catch {
      // previous lock released
    }
  }

  let release = () => {}
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve
  })
  inProcessMutex.set(filePath, lockPromise)

  return () => {
    inProcessMutex.delete(filePath)
    release()
  }
}

export interface LockOptions {
  timeoutMs?: number
  staleMs?: number
  retryIntervalMs?: number
}

/**
 * Acquire a cross-process lockfile with stale protection and exponential jitter backoff.
 */
export async function acquireCrossProcessLock(
  filePath: string,
  options: LockOptions = {}
): Promise<() => Promise<void>> {
  const timeoutMs = options.timeoutMs ?? 15_000
  const staleMs = options.staleMs ?? 10_000
  const retryIntervalMs = options.retryIntervalMs ?? 25

  const releaseMutex = await acquireInProcessMutex(filePath)
  const lockFilePath = `${filePath}.lock`
  const startTime = Date.now()

  let fileHandle: any = null

  while (Date.now() - startTime < timeoutMs) {
    try {
      // "wx" flag: fails with EEXIST if lockfile already exists (atomic across processes)
      fileHandle = await fs.open(lockFilePath, "wx")
      // Write lock metadata (process id and timestamp)
      const meta = JSON.stringify({ pid: process.pid, time: Date.now() })
      await fileHandle.writeFile(meta, "utf-8")
      break
    } catch (err: any) {
      if (err.code === "EEXIST") {
        // Check for stale lockfile from crashed process
        try {
          const stat = await fs.stat(lockFilePath)
          if (Date.now() - stat.mtimeMs > staleMs) {
            // Remove stale lock
            await fs.unlink(lockFilePath).catch(() => {})
          }
        } catch {
          // Lockfile may have just been released by another process
        }

        // Sleep with random jitter
        const jitter = Math.floor(Math.random() * 15)
        await new Promise((r) => setTimeout(r, retryIntervalMs + jitter))
      } else {
        releaseMutex()
        throw err
      }
    }
  }

  if (!fileHandle) {
    releaseMutex()
    throw new Error(`Timeout waiting for cross-process file lock on ${filePath} after ${timeoutMs}ms`)
  }

  // Return release function
  return async () => {
    try {
      if (fileHandle) {
        await fileHandle.close().catch(() => {})
      }
      await fs.unlink(lockFilePath).catch(() => {})
    } finally {
      releaseMutex()
    }
  }
}

/**
 * Execute an atomic transaction under cross-process lock protection.
 */
export async function withCrossProcessLock<T>(
  filePath: string,
  fn: () => Promise<T>,
  options?: LockOptions
): Promise<T> {
  const release = await acquireCrossProcessLock(filePath, options)
  try {
    return await fn()
  } finally {
    await release()
  }
}

/**
 * Safely and atomically write JSON data to disk using a temporary file and rename,
 * protected by cross-process mutual exclusion.
 */
export async function atomicWriteJson<T>(filePath: string, data: T): Promise<void> {
  await withCrossProcessLock(filePath, async () => {
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    const tempFile = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`
    const content = JSON.stringify(data, null, 2)

    await fs.writeFile(tempFile, content, "utf-8")
    await fs.rename(tempFile, filePath)
  })
}

/**
 * Safely read JSON data from disk with fallback, guarded against concurrent mid-write states.
 */
export async function safeReadJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    if (!content || !content.trim()) return fallback
    return JSON.parse(content) as T
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return fallback
    }
    console.error(`Error reading ${filePath}:`, err)
    return fallback
  }
}

/**
 * Storage Driver Interface for production pluggability.
 */
export interface BookStorageDriver {
  readJson<T>(key: string, fallback: T): Promise<T>
  writeJson<T>(key: string, data: T): Promise<void>
  saveBinary(destinationPath: string, buffer: Buffer): Promise<string>
  getBinary(sourcePath: string): Promise<Buffer | null>
}

/**
 * Local Filesystem Driver (Active by default for local and persistent VM environments)
 */
export class LocalFilesystemDriver implements BookStorageDriver {
  async readJson<T>(key: string, fallback: T): Promise<T> {
    const filePath = path.isAbsolute(key) ? key : path.join(process.cwd(), key)
    return safeReadJson<T>(filePath, fallback)
  }

  async writeJson<T>(key: string, data: T): Promise<void> {
    const filePath = path.isAbsolute(key) ? key : path.join(process.cwd(), key)
    return atomicWriteJson<T>(filePath, data)
  }

  async saveBinary(destinationPath: string, buffer: Buffer): Promise<string> {
    const filePath = path.isAbsolute(destinationPath)
      ? destinationPath
      : path.join(process.cwd(), destinationPath)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, buffer)
    return destinationPath
  }

  async getBinary(sourcePath: string): Promise<Buffer | null> {
    try {
      const filePath = path.isAbsolute(sourcePath)
        ? sourcePath
        : path.join(process.cwd(), sourcePath)
      return await fs.readFile(filePath)
    } catch {
      return null
    }
  }
}

/**
 * Cloud S3 Driver stub (Ready for multi-instance serverless deployments).
 * Uses AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET.
 */
export class S3StorageDriver implements Partial<BookStorageDriver> {
  async saveBinary(destinationPath: string, buffer: Buffer): Promise<string> {
    throw new Error("S3StorageDriver is not enabled in this environment. Use LocalFilesystemDriver.")
  }
}

export const activeStorageDriver: BookStorageDriver = new LocalFilesystemDriver()
