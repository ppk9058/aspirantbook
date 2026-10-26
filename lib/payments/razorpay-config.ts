import Razorpay from "razorpay"

/**
 * V3: single place that resolves the Razorpay credentials.
 *
 * The payment action used to build the SDK client at module load with
 * `process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder"`, and it fell back
 * to a *mock order* whenever the secret was missing - in production too. A
 * missing secret therefore produced fake orders that looked successful instead
 * of a loud failure. Both are gone: the client is created lazily and throws a
 * clear error when the credentials are absent.
 */

export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null
}

/** Only explicit test mode may use mock orders; a missing secret never does. */
export function isRazorpayTestMode(): boolean {
  return process.env.APP_ENV === "test" || process.env.NODE_ENV === "test"
}

let client: Razorpay | null = null

/** Throws when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured. */
export function getRazorpayClient(): Razorpay {
  const keyId = getRazorpayKeyId()
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (no placeholder fallback)"
    )
  }

  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret })
  }
  return client
}

/** Test helper: forget the cached client after changing the environment. */
export function resetRazorpayClientForTests(): void {
  client = null
}
