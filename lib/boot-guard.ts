/**
 * Boot-Time Security Guards
 * Validates critical environment configurations at runtime initialization.
 */

import { getPersistBackend } from "@/lib/storage/persist-backend";

export function validateBootSecurity() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDevBypass = process.env.ALLOW_DEV_MOBILE_LOGIN === "true";
  const isAppEnvTest = process.env.APP_ENV === "test";
  const dbUrl = process.env.DATABASE_URL || "";
  const otpProviderConfigured = Boolean(
    process.env.FAST2SMS_API_KEY ||
    process.env.TWILIO_AUTH_TOKEN ||
    process.env.MSG91_AUTH_KEY ||
    (process.env.MESSAGE_CENTRAL_CUSTOMER_ID && process.env.MESSAGE_CENTRAL_AUTH_KEY)
  );

  // 0. Guard: production must never persist to local disk (ephemeral / read-only hosts)
  if (isProduction && getPersistBackend() === "fs") {
    const errorMsg =
      "[CRITICAL SECURITY REFUSAL AT BOOT] PERSIST_BACKEND resolves to the local-disk backend in NODE_ENV=production! " +
      "Production deployments are ephemeral and multi-instance: set PERSIST_BACKEND=db.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Guard: APP_ENV=test must only ever be paired with local test database (127.0.0.1 or localhost, ending in _test)
  if (isAppEnvTest) {
    let isLocalTestDb = false;
    try {
      const parsed = new URL(dbUrl);
      const isLocalHost = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
      const isTestDbName = parsed.pathname.endsWith("_test");
      isLocalTestDb = isLocalHost && isTestDbName;
    } catch {
      isLocalTestDb = false;
    }

    if (!isLocalTestDb) {
      const errorMsg =
        `[CRITICAL SECURITY REFUSAL AT BOOT] APP_ENV=test is set with invalid or non-local DATABASE_URL! ` +
        `Test mode is strictly restricted to local PostgreSQL (127.0.0.1/localhost) ending with _test. (got: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ":***@") : "none"})`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  // 2. Guard: Production DATABASE_URL safety for Neon (R12-B)
  if (isProduction && dbUrl) {
    let parsedDb: URL | null = null;
    try {
      parsedDb = new URL(dbUrl);
    } catch {
      // unparseable URL – fail closed
    }

    // 2a. Must not point at localhost/127.0.0.1 in production
    if (!parsedDb || parsedDb.hostname === "localhost" || parsedDb.hostname === "127.0.0.1") {
      throw new Error(
        "[CRITICAL SECURITY REFUSAL AT BOOT] DATABASE_URL points at a local host or is unparseable in production. " +
        "Production must use a remote database."
      );
    }

    // 2b. Must contain sslmode=require
    const sslMode = parsedDb.searchParams.get("sslmode");
    if (sslMode !== "require") {
      throw new Error(
        "[CRITICAL SECURITY REFUSAL AT BOOT] DATABASE_URL is missing sslmode=require in production."
      );
    }

    // 2c. Pooled Neon host (contains -pooler) requires pgbouncer=true
    if (parsedDb.hostname.includes("-pooler") && parsedDb.searchParams.get("pgbouncer") !== "true") {
      throw new Error(
        "[CRITICAL SECURITY REFUSAL AT BOOT] DATABASE_URL uses a Neon pooler host but is missing pgbouncer=true."
      );
    }

    // 2d. DIRECT_URL must be set for migrations
    if (!process.env.DIRECT_URL) {
      throw new Error(
        "[CRITICAL SECURITY REFUSAL AT BOOT] DIRECT_URL is not set in production. It is required for migrations."
      );
    }
  }

  // 3. Guard: Refuse to start when NODE_ENV==="production" and ALLOW_DEV_MOBILE_LOGIN==="true"
  if (isProduction && allowDevBypass) {
    const errorMsg =
      "[CRITICAL SECURITY REFUSAL AT BOOT] ALLOW_DEV_MOBILE_LOGIN is enabled in NODE_ENV=production! " +
      "Dev OTP bypass is strictly forbidden in production.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 4. Guard: Message Central credentials must be complete when used. Both unset
  // is a valid state (OTP simply stays disabled), so boot never breaks for
  // deployments that do not enable OTP.
  const mcCustomerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID?.trim();
  const mcAuthKey = process.env.MESSAGE_CENTRAL_AUTH_KEY?.trim();
  if (Boolean(mcCustomerId) !== Boolean(mcAuthKey)) {
    const errorMsg =
      "[SECURITY REFUSAL AT BOOT] MESSAGE_CENTRAL_CUSTOMER_ID and MESSAGE_CENTRAL_AUTH_KEY " +
      "must be set together (or both left empty to keep OTP disabled).";
    if (isProduction) {
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    console.warn(errorMsg);
  }
  void otpProviderConfigured;
}

// Execute immediately when module is imported
validateBootSecurity();

