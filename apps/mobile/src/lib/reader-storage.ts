export interface ReaderStorageTarget {
  /** App-private `secure_docs` directory, or null when storage is unavailable. */
  directory: string | null;
  /** Full path to the cached PDF, or null when storage is unavailable. */
  filePath: string | null;
}

/**
 * Builds the app-private path for a document without ever concatenating a null
 * document directory (some Android devices/emulators return null, which would
 * otherwise produce a bogus relative path and silently fail).
 */
export function resolveReaderStorageTarget(
  documentDirectory: string | null | undefined,
  documentId: string
): ReaderStorageTarget {
  if (!documentDirectory) {
    return { directory: null, filePath: null };
  }
  const directory = `${documentDirectory}secure_docs`;
  // Route params are user-controllable: strip path separators and traversal.
  const safeId = String(documentId || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  return { directory, filePath: `${directory}/doc_${safeId}.pdf` };
}

/**
 * A download only yields a usable local file when the platform returned a URI.
 * Never hand the renderer a path that was not written (false "Saved Offline").
 */
export function resolveDownloadedFileUri(uri: string | null | undefined): string | null {
  return typeof uri === "string" && uri.length > 0 ? uri : null;
}
