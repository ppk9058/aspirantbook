import { isDevBypassAllowed } from "@/lib/api/v1/dev-bypass";
import { DevOtpProvider } from "./dev.adapter";
import { isMessageCentralConfigured, MessageCentralOtpProvider } from "./message-central.adapter";
import { OtpProvider } from "./types";

/**
 * The ONLY place that knows which SMS provider is active.
 *
 * Swapping providers (e.g. to MSG91) means adding an adapter and changing this
 * factory. Routes, the service, and both clients stay untouched.
 */

let testProviderOverride: OtpProvider | null | undefined;

/**
 * Test-only seam. The provider is mocked at the adapter boundary so no real SMS
 * is ever sent by the suites. Refuses to operate in production.
 */
export function __setOtpProviderForTests(provider: OtpProvider | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("OTP provider test override is forbidden in production");
  }
  testProviderOverride = provider;
}

export function __resetOtpProviderForTests(): void {
  testProviderOverride = undefined;
}

/**
 * Dev bypass requires BOTH a non-production build AND the repo's existing
 * explicit dev-flag policy. In NODE_ENV=production it is impossible.
 */
export function isOtpDevBypassAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return isDevBypassAllowed();
}

export function isOtpProviderConfigured(): boolean {
  if (testProviderOverride !== undefined) {
    return testProviderOverride !== null;
  }
  return isMessageCentralConfigured();
}

/** True when a real provider or an allowed dev bypass can serve OTP requests. */
export function isOtpEnabled(): boolean {
  return isOtpProviderConfigured() || isOtpDevBypassAllowed();
}

export function getOtpProvider(): OtpProvider | null {
  if (testProviderOverride !== undefined) {
    return testProviderOverride;
  }
  if (isOtpProviderConfigured()) {
    return new MessageCentralOtpProvider();
  }
  if (isOtpDevBypassAllowed()) {
    return new DevOtpProvider();
  }
  return null;
}
