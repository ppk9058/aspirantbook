export type PersistBackend = "fs" | "db";

/**
 * Returns the active persistence backend.
 * Production always defaults to "db": local disk is ephemeral on serverless and
 * multi-instance hosts. Development/test keep the legacy "fs" default.
 */
export function getPersistBackend(): PersistBackend {
  const configured = process.env.PERSIST_BACKEND?.toLowerCase().trim();
  const fallback: PersistBackend = process.env.NODE_ENV === "production" ? "db" : "fs";
  if (!configured) return fallback;
  return configured === "db" ? "db" : "fs";
}

export function isDbPersist(): boolean {
  return getPersistBackend() === "db";
}
