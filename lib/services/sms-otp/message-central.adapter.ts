import {
  OtpProvider,
  OtpProviderError,
  SendOtpInput,
  SendOtpResult,
  VerifyOtpInput,
  VerifyOtpResult,
} from "./types";

/**
 * Message Central "Verify Now" adapter (API V3).
 *
 * Docs: https://www.messagecentral.com/product/verify-now/api
 *   base URL        https://cpaas.messagecentral.com
 *   token           GET  /auth/v1/authentication/token?customerId=&key=&scope=NEW&country=91
 *   send OTP        POST /verification/v3/send?countryCode=91&flowType=SMS&mobileNumber=&otpLength=6
 *   validate OTP    GET  /verification/v3/validateOtp?verificationId=&code=
 *   header          authToken: <token>
 *
 * The customer id + base64-encrypted password are read from
 * MESSAGE_CENTRAL_CUSTOMER_ID and MESSAGE_CENTRAL_AUTH_KEY. No SDK, no new
 * dependency: plain fetch.
 */

const DEFAULT_BASE_URL = "https://cpaas.messagecentral.com";
const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_SAFETY_WINDOW_MS = 60_000;
const TOKEN_FALLBACK_TTL_MS = 30 * 60_000;

interface TokenCache {
  token: string;
  expiresAtMs: number;
}

let tokenCache: TokenCache | null = null;

function getBaseUrl(): string {
  const raw = process.env.MESSAGE_CENTRAL_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

function getCredentials(): { customerId: string; authKey: string } | null {
  const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID?.trim();
  const authKey = process.env.MESSAGE_CENTRAL_AUTH_KEY?.trim();
  if (!customerId || !authKey) return null;
  return { customerId, authKey };
}

export function isMessageCentralConfigured(): boolean {
  return getCredentials() !== null;
}

/** Decodes the `exp` claim without verifying the signature (we only need a cache TTL). */
function tokenExpiryMs(token: string): number {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return Date.now() + TOKEN_FALLBACK_TTL_MS;
    const json = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    if (typeof json?.exp === "number") {
      return json.exp * 1000 - TOKEN_SAFETY_WINDOW_MS;
    }
  } catch {
    // Fall through to the conservative default.
  }
  return Date.now() + TOKEN_FALLBACK_TTL_MS;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestToken(force = false): Promise<string> {
  const credentials = getCredentials();
  if (!credentials) {
    throw new OtpProviderError("Message Central credentials are not configured", "provider_misconfigured");
  }

  if (!force && tokenCache && tokenCache.expiresAtMs > Date.now()) {
    return tokenCache.token;
  }

  const url = new URL(`${getBaseUrl()}/auth/v1/authentication/token`);
  url.searchParams.set("customerId", credentials.customerId);
  url.searchParams.set("key", credentials.authKey);
  url.searchParams.set("scope", "NEW");
  url.searchParams.set("country", "91");

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), {
      method: "GET",
      headers: { accept: "*/*" },
    });
  } catch {
    throw new OtpProviderError("Message Central token request failed", "provider_unavailable");
  }

  const json = await response.json().catch(() => null);
  const token = typeof json?.token === "string" ? json.token : null;
  if (!response.ok || !token) {
    throw new OtpProviderError(
      "Message Central rejected the token request",
      "provider_misconfigured",
      typeof json?.status === "number" ? json.status : response.status
    );
  }

  tokenCache = { token, expiresAtMs: tokenExpiryMs(token) };
  return token;
}

function numericCode(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export class MessageCentralOtpProvider implements OtpProvider {
  readonly name = "message-central";

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    const url = new URL(`${getBaseUrl()}/verification/v3/send`);
    url.searchParams.set("countryCode", input.countryCode);
    url.searchParams.set("flowType", "SMS");
    url.searchParams.set("mobileNumber", input.nationalNumber);
    url.searchParams.set("otpLength", String(input.otpLength));

    const send = async (forceToken: boolean): Promise<Response> => {
      const token = await requestToken(forceToken);
      return fetchWithTimeout(url.toString(), {
        method: "POST",
        headers: { authToken: token, accept: "*/*" },
      });
    };

    let response: Response;
    try {
      response = await send(false);
      if (response.status === 401 || response.status === 403) {
        tokenCache = null;
        response = await send(true);
      }
    } catch (error) {
      if (error instanceof OtpProviderError) throw error;
      throw new OtpProviderError("Message Central send request failed", "provider_unavailable");
    }

    const json = await response.json().catch(() => null);
    const code = numericCode(json?.responseCode);

    if (response.ok && code === 200 && typeof json?.data?.verificationId === "string") {
      const timeout = numericCode(json.data.timeout);
      return { verificationId: json.data.verificationId, timeoutSeconds: timeout };
    }

    if (code === 800) {
      throw new OtpProviderError("Message Central rate limit reached", "provider_rate_limited", code);
    }
    if (code === 501 || code === 511) {
      throw new OtpProviderError("Message Central rejected the sender configuration", "provider_misconfigured", code);
    }
    throw new OtpProviderError("Message Central could not send the OTP", "provider_rejected", code);
  }

  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const url = new URL(`${getBaseUrl()}/verification/v3/validateOtp`);
    url.searchParams.set("verificationId", input.verificationId);
    url.searchParams.set("code", input.code);

    const validate = async (forceToken: boolean): Promise<Response> => {
      const token = await requestToken(forceToken);
      return fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: { authToken: token, accept: "*/*" },
      });
    };

    let response: Response;
    try {
      response = await validate(false);
      if (response.status === 401 || response.status === 403) {
        tokenCache = null;
        response = await validate(true);
      }
    } catch (error) {
      if (error instanceof OtpProviderError) throw error;
      throw new OtpProviderError("Message Central validate request failed", "provider_unavailable");
    }

    const json = await response.json().catch(() => null);
    const code = numericCode(json?.responseCode) ?? numericCode(json?.data?.responseCode);
    const status = typeof json?.data?.verificationStatus === "string" ? json.data.verificationStatus : "";

    if (response.ok && code === 200 && status === "VERIFICATION_COMPLETED") {
      return { verified: true, providerCode: code };
    }

    switch (code) {
      case 702:
        return { verified: false, reason: "invalid_code", providerCode: code };
      case 705:
        return { verified: false, reason: "expired", providerCode: code };
      case 703:
        return { verified: false, reason: "already_verified", providerCode: code };
      case 505:
        return { verified: false, reason: "not_found", providerCode: code };
      default:
        return { verified: false, reason: "provider_error", providerCode: code };
    }
  }
}
