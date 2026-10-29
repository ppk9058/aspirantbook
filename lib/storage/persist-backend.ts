export type PersistBackend = "fs" | "db";

/**
 * Returns the active persistence backend.
 * Default is "fs" (legacy behaviour); "db" routes all persistence to Postgres/S3 without local disk writes.
 */
export function getPersistBackend(): PersistBackend {
  const backend = (process.env.PERSIST_BACKEND || "fs").toLowerCase().trim();
  return backend === "db" ? "db" : "fs";
}

export function isDbPersist(): boolean {
  return getPersistBackend() === "db";
}
