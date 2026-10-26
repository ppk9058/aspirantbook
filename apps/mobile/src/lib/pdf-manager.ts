import { getStorageAdapter } from "./cache-storage";

const PAGE_MEMORY_PREFIX = "pdf_last_page_";
const RESUME_PREFIX = "pdf_resume_";
const SECURE_DOCS_DIR_NAME = "secure_docs";

async function getFileSystem() {
  try {
    return await import("expo-file-system");
  } catch {
    return null;
  }
}

export function getPdfStorageDir(): string {
  let baseDir = "file:///data/user/0/com.aspirantbook.app/files/";
  try {
    const fs = require("expo-file-system");
    if (fs?.documentDirectory) {
      baseDir = fs.documentDirectory;
    }
  } catch {}
  return `${baseDir}${SECURE_DOCS_DIR_NAME}/`;
}

export function getPdfStoragePath(id: string): string {
  const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${getPdfStorageDir()}doc_${sanitizedId}.pdf`;
}

export async function ensureSecureDocsDir(): Promise<void> {
  const fs = await getFileSystem();
  if (!fs) return;
  const dir = getPdfStorageDir();
  try {
    const info = await fs.getInfoAsync(dir);
    if (!info.exists) {
      await fs.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {}
}

export async function isPdfDownloaded(id: string): Promise<boolean> {
  const fs = await getFileSystem();
  if (!fs) return false;
  try {
    const path = getPdfStoragePath(id);
    const info = await fs.getInfoAsync(path);
    return Boolean(info.exists && !info.isDirectory && (info.size ?? 0) > 0);
  } catch {
    return false;
  }
}

export async function saveLastReadPage(id: string, page: number): Promise<void> {
  const adapter = getStorageAdapter();
  const clampedPage = Math.max(1, Math.floor(page));
  await adapter.setItem(`${PAGE_MEMORY_PREFIX}${id}`, String(clampedPage));
}

export async function getLastReadPage(id: string): Promise<number> {
  const adapter = getStorageAdapter();
  try {
    const raw = await adapter.getItem(`${PAGE_MEMORY_PREFIX}${id}`);
    if (!raw) return 1;
    const page = parseInt(raw, 10);
    return isNaN(page) || page < 1 ? 1 : page;
  } catch {
    return 1;
  }
}

export async function saveDownloadResumeState(id: string, resumeData: string): Promise<void> {
  const adapter = getStorageAdapter();
  await adapter.setItem(`${RESUME_PREFIX}${id}`, resumeData);
}

export async function getDownloadResumeState(id: string): Promise<string | null> {
  const adapter = getStorageAdapter();
  try {
    return await adapter.getItem(`${RESUME_PREFIX}${id}`);
  } catch {
    return null;
  }
}

export async function clearDownloadResumeState(id: string): Promise<void> {
  const adapter = getStorageAdapter();
  try {
    await adapter.removeItem(`${RESUME_PREFIX}${id}`);
  } catch {}
}

export async function deleteCachedPdf(id: string): Promise<boolean> {
  const path = getPdfStoragePath(id);
  const adapter = getStorageAdapter();
  try {
    const fs = await getFileSystem();
    if (fs) {
      const info = await fs.getInfoAsync(path);
      if (info.exists) {
        await fs.deleteAsync(path, { idempotent: true });
      }
    }
    // 2. Clear page memory & resume tokens
    await adapter.removeItem(`${PAGE_MEMORY_PREFIX}${id}`);
    await adapter.removeItem(`${RESUME_PREFIX}${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function verifyOwnershipOrDelete(id: string, hasOwnership: boolean): Promise<boolean> {
  if (!hasOwnership) {
    // Ownership revoked or unowned: purge local file immediately
    await deleteCachedPdf(id);
    return false;
  }
  return isPdfDownloaded(id);
}

export async function clearAllCachedPdfs(): Promise<void> {
  const dir = getPdfStorageDir();
  try {
    const fs = await getFileSystem();
    if (fs) {
      const info = await fs.getInfoAsync(dir);
      if (info.exists) {
        await fs.deleteAsync(dir, { idempotent: true });
        await ensureSecureDocsDir();
      }
    }
  } catch {}
}
