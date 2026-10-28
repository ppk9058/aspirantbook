import { getStorageAdapter } from "./cache-storage";

const PAGE_MEMORY_PREFIX = "pdf_last_page_";
const RESUME_PREFIX = "pdf_resume_";
const SECURE_DOCS_DIR_NAME = "secure_docs";

export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB per document guard
export const TOTAL_CACHE_LIMIT_BYTES = 250 * 1024 * 1024; // 250MB total cache guard

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
  } catch (err: unknown) {
    void err;
  }
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
  } catch (err: unknown) {
    void err;
  }
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
  } catch (err: unknown) {
    void err;
  }
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
    // Clear page memory & resume tokens
    await adapter.removeItem(`${PAGE_MEMORY_PREFIX}${id}`);
    await adapter.removeItem(`${RESUME_PREFIX}${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function verifyOwnershipOrDelete(id: string, hasOwnership: boolean): Promise<boolean> {
  if (!hasOwnership) {
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
  } catch (err: unknown) {
    void err;
  }
}

/**
 * Storage-size guard checking document and total cache limits.
 */
export function checkDocumentStorageGuard(expectedBytes?: number): void {
  if (expectedBytes && expectedBytes > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(`Document exceeds maximum allowed offline size of ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB.`);
  }
}

/**
 * Resolves active PDF source URI with graceful fallback to remote streaming
 * when offline cache is absent or deleted.
 */
export async function resolveActivePdfUri(
  documentId: string,
  remoteUri: string
): Promise<{ uri: string; isDownloaded: boolean }> {
  try {
    const downloaded = await isPdfDownloaded(documentId);
    if (downloaded) {
      return {
        uri: getPdfStoragePath(documentId),
        isDownloaded: true,
      };
    }
  } catch {
    // Graceful fallback to remote stream on error
  }
  return {
    uri: remoteUri,
    isDownloaded: false,
  };
}

/**
 * Downloads PDF to secure offline cache with resume-on-failure support and progress tracking.
 */
export async function downloadPdfWithResume(
  documentId: string,
  sourceUri: string,
  onProgress?: (progressFraction: number) => void
): Promise<{ uri: string }> {
  await ensureSecureDocsDir();
  const fs = await getFileSystem();
  if (!fs) {
    throw new Error("File system unavailable for offline downloads");
  }

  const destinationPath = getPdfStoragePath(documentId);
  const resumeData = await getDownloadResumeState(documentId);

  const callback = (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
    if (data.totalBytesExpectedToWrite > 0) {
      checkDocumentStorageGuard(data.totalBytesExpectedToWrite);
      const fraction = Math.min(1, data.totalBytesWritten / data.totalBytesExpectedToWrite);
      onProgress?.(fraction);
    }
  };

  const downloadResumable = fs.createDownloadResumable(
    sourceUri,
    destinationPath,
    {},
    callback,
    resumeData || undefined
  );

  try {
    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) {
      throw new Error("Download completed without destination URI");
    }
    // Successfully downloaded: clear resume token
    await clearDownloadResumeState(documentId);
    return { uri: result.uri };
  } catch (err) {
    // Save resumable state for later continuation
    try {
      const state = downloadResumable.savable();
      if (state) {
        await saveDownloadResumeState(documentId, JSON.stringify(state));
      }
    } catch {
      // Ignore save error on hard failure
    }
    throw err;
  }
}
