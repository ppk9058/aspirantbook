import { AppConfigDto, DEFAULT_CONFIG } from "@aspirantbook/shared";
import { NextRequest } from "next/server";
import { getCanonicalBaseUrl } from "@/lib/config/brand";
import { isDevBypassAllowed } from "@/lib/api/v1/dev-bypass";

export function getAppConfig(req?: NextRequest | Request): AppConfigDto {
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";
  const allowPurchases = process.env.NEXT_PUBLIC_APP_ALLOW_PURCHASE === "true";
  const googleAuthEnabled = Boolean(
    process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID
  );
  const otpAuthEnabled = Boolean(
    process.env.SMS_API_KEY || isDevBypassAllowed()
  );

  let websiteUrl = process.env.WEBSITE_URL;
  if (!websiteUrl) {
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev && req) {
      const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
      const hostWithoutPort = hostHeader.split(":")[0]?.trim();
      if (hostWithoutPort && hostWithoutPort !== "localhost" && hostWithoutPort !== "127.0.0.1") {
        websiteUrl = `http://${hostWithoutPort}:3000`;
      }
    }
    if (!websiteUrl) {
      websiteUrl = getCanonicalBaseUrl();
    }
  }

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
    websiteUrl,
  };
}
