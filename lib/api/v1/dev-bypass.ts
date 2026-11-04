/**
 * Central Dev/Test Bypass Security Helper
 *
 * Enforces unified policy for dev/test credentials and bypass routes across API v1.
 *
 * Invariants:
 * 1. MUST return false whenever NODE_ENV === "production" and APP_ENV !== "test".
 * 2. MUST return true ONLY for ALLOW_DEV_MOBILE_LOGIN === "true" OR (APP_ENV === "test" and connected to local *_test DB).
 */
export function isDevBypassAllowed(): boolean {
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "test") {
    return false;
  }

  let isLocalTestDb = false;
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const parsed = new URL(dbUrl);
    isLocalTestDb =
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") &&
      parsed.pathname.endsWith("_test");
  } catch {
    isLocalTestDb = false;
  }

  return (
    process.env.ALLOW_DEV_MOBILE_LOGIN === "true" ||
    (process.env.APP_ENV === "test" && isLocalTestDb)
  );
}
