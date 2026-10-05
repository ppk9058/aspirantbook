/**
 * Boot-Time Security Guards
 * Validates critical environment configurations at runtime initialization.
 */

export function validateBootSecurity() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDevBypass = process.env.ALLOW_DEV_MOBILE_LOGIN === "true";
  const otpProviderConfigured = Boolean(
    process.env.FAST2SMS_API_KEY ||
    process.env.TWILIO_AUTH_TOKEN ||
    process.env.MSG91_AUTH_KEY
  );

  // Guard: Dev OTP / Mobile Login bypass MUST NEVER run in production unless a real provider is configured
  // (unless running in explicit synthetic automated test suite IS_E2E_TEST=true)
  if (isProduction && allowDevBypass && !otpProviderConfigured && process.env.IS_E2E_TEST !== "true") {
    const errorMsg =
      "[CRITICAL SECURITY REFUSAL AT BOOT] ALLOW_DEV_MOBILE_LOGIN is enabled in NODE_ENV=production without an active OTP provider configured! " +
      "Dev OTP bypass is strictly forbidden in production.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Execute immediately when module is imported
validateBootSecurity();
