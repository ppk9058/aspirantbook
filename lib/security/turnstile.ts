/**
 * Cloudflare Turnstile Server-Side Verification
 *
 * Controlled by process.env.TURNSTILE_ENABLED (default: false).
 * When false, requests pass through without verification so development,
 * CI, and unit tests run without external dependencies or CAPTCHA blockers.
 *
 * When true, missing or invalid Turnstile tokens reject requests with 400.
 * If TURNSTILE_ENABLED is true but TURNSTILE_SECRET_KEY is missing, it fails
 * closed with HTTP 500 to prevent silent security degradation.
 */

export interface TurnstileVerifyResult {
  success: boolean
  status?: number
  error?: string
  errorCodes?: string[]
}

export function isTurnstileEnabled(): boolean {
  return process.env.TURNSTILE_ENABLED === "true"
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  // If flag is OFF, pass through immediately (safe default for dev/test)
  if (!isTurnstileEnabled()) {
    return { success: true }
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    console.error(
      "[Turnstile] Security failure: TURNSTILE_ENABLED=true but TURNSTILE_SECRET_KEY is not configured! Failing closed."
    )
    return {
      success: false,
      status: 500,
      error: "Bot protection service is misconfigured on the server",
    }
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      status: 400,
      error: "Security check required. Please complete the CAPTCHA verification.",
      errorCodes: ["missing-input-response"],
    }
  }

  const verifyUrl =
    process.env.TURNSTILE_VERIFY_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify"

  const formParams = new URLSearchParams()
  formParams.append("secret", secretKey)
  formParams.append("response", token.trim())
  if (remoteIp && remoteIp !== "127.0.0.1") {
    formParams.append("remoteip", remoteIp)
  }

  try {
    const timeoutMs = Number.parseInt(process.env.TURNSTILE_TIMEOUT_MS || "6000", 10) || 6000
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formParams.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (!response.ok) {
      console.warn(`[Turnstile] Cloudflare verification returned HTTP ${response.status}`)
      return {
        success: false,
        status: 502,
        error: "Unable to verify CAPTCHA with Cloudflare. Please try again.",
      }
    }

    const result = (await response.json()) as {
      success: boolean
      "error-codes"?: string[]
      challenge_ts?: string
      hostname?: string
    }

    if (result.success) {
      return { success: true }
    }

    const codes = result["error-codes"] || []
    console.warn(`[Turnstile] Token verification failed with codes:`, codes)

    return {
      success: false,
      status: 400,
      error: "Bot verification failed. Please try again.",
      errorCodes: codes,
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("[Turnstile] Cloudflare siteverify request timed out")
      return {
        success: false,
        status: 504,
        error: "Verification service timed out. Please try again.",
      }
    }
    console.error("[Turnstile] Network error contacting Cloudflare:", err)
    return {
      success: false,
      status: 502,
      error: "Verification service unreachable. Please try again.",
    }
  }
}
