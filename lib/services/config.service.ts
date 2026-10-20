import { AppConfigDto, DEFAULT_CONFIG } from "@aspirantbook/shared";

export function getAppConfig(): AppConfigDto {
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";
  const allowPurchases = process.env.NEXT_PUBLIC_APP_ALLOW_PURCHASE === "true";
  const googleAuthEnabled = Boolean(
    process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID
  );
  const otpAuthEnabled = Boolean(
    process.env.SMS_API_KEY ||
      (process.env.APP_ENV === "test" && process.env.ALLOW_DEV_MOBILE_LOGIN === "true")
  );

  return {
    minSupportedVersion: process.env.MIN_SUPPORTED_APP_VERSION || DEFAULT_CONFIG.minSupportedVersion,
    latestVersion: process.env.LATEST_APP_VERSION || DEFAULT_CONFIG.latestVersion,
    isMaintenance,
    maintenanceMessage: isMaintenance
      ? "AspirantBook is currently undergoing scheduled maintenance. Please check back shortly."
      : null,
    allowPurchases,
    googleAuthEnabled,
    otpAuthEnabled,
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact.aspirantbook@gmail.com",
    websiteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://aspirantbook.com",
  };
}
