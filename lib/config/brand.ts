/**
 * Centralized Brand & Domain Configuration
 *
 * Provides a single source of truth for the platform brand, legal entity names,
 * canonical domains, support contacts, and canonical URL derivation.
 *
 * All values are overridable via environment variables.
 */

export interface BrandConfig {
  brandName: string;
  brandTagline: string;
  legalEntityName: string;
  canonicalDomain: string;
  supportEmail: string;
  supportPhone: string;
  grievanceOfficer: string;
  registeredAddress: string;
  copyrightNotice: string;
  socialLinks: {
    twitter?: string;
    youtube?: string;
    telegram?: string;
    instagram?: string;
  };
}

export function getBrandConfig(): BrandConfig {
  const brandName =
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.BRAND_NAME ||
    "AspirantBook";

  const canonicalDomain =
    process.env.NEXT_PUBLIC_CANONICAL_DOMAIN ||
    process.env.CANONICAL_DOMAIN ||
    "aspirantbook.com";

  const legalEntityName =
    process.env.LEGAL_ENTITY_NAME ||
    "[OWNER TO CONFIRM: Legal Entity Name]";

  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    "[OWNER TO CONFIRM: Support Email]";

  const supportPhone =
    process.env.SUPPORT_PHONE ||
    process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
    "[OWNER TO CONFIRM: Support Phone Number]";

  const grievanceOfficer =
    process.env.GRIEVANCE_OFFICER ||
    "[OWNER TO CONFIRM: Grievance Officer Name and Contact Email]";

  const registeredAddress =
    process.env.REGISTERED_ADDRESS ||
    "[OWNER TO CONFIRM: Registered Address]";

  const currentYear = new Date().getFullYear();

  return {
    brandName,
    brandTagline: "India's Premier Computer-Based Test (CBT) Prep Platform",
    legalEntityName,
    canonicalDomain,
    supportEmail,
    supportPhone,
    grievanceOfficer,
    registeredAddress,
    copyrightNotice: `© ${currentYear} ${brandName}. All rights reserved.`,
    socialLinks: {
      telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/aspirantbook",
      youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://youtube.com/@aspirantbook",
      twitter: process.env.NEXT_PUBLIC_TWITTER_URL || "https://twitter.com/aspirantbook",
    },
  };
}

export function getCanonicalBaseUrl(): string {
  // 1. Explicit app URL from env
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL;

  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // 2. Vercel deployment preview URL
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.trim().replace(/\/+$/, "");
    return host.startsWith("http") ? host : `https://${host}`;
  }

  // 3. Production fallback
  if (process.env.NODE_ENV === "production") {
    const domain =
      process.env.NEXT_PUBLIC_CANONICAL_DOMAIN ||
      process.env.CANONICAL_DOMAIN ||
      "aspirantbook.com";
    return `https://${domain.trim().replace(/\/+$/, "")}`;
  }

  // 4. Local dev / test fallback
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}
