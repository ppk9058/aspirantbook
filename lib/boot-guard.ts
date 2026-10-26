/**
 * Boot-Time Security Guards
 * Validates critical environment configurations at runtime initialization.
 */

export function validateBootSecurity() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDevBypass = process.env.ALLOW_DEV_MOBILE_LOGIN === "true";
  const isAppEnvTest = process.env.APP_ENV === "test";
  const dbUrl = process.env.DATABASE_URL || "";
  const otpProviderConfigured = Boolean(
    process.env.FAST2SMS_API_KEY ||
    process.env.TWILIO_AUTH_TOKEN ||
    process.env.MSG91_AUTH_KEY
  );

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

  // 2. Guard: Refuse to start when NODE_ENV==="production" and ALLOW_DEV_MOBILE_LOGIN==="true"
  if (isProduction && allowDevBypass) {
    const errorMsg =
      "[CRITICAL SECURITY REFUSAL AT BOOT] ALLOW_DEV_MOBILE_LOGIN is enabled in NODE_ENV=production! " +
      "Dev OTP bypass is strictly forbidden in production.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Execute immediately when module is imported
validateBootSecurity();

