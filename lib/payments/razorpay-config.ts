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

/**
 * Derived paymentMode: "test" | "live" | "unconfigured" based on key ID prefix.
 * Never prints or leaks the key.
 */
export function getPaymentMode(): "test" | "live" | "unconfigured" {
  const keyId = (getRazorpayKeyId() || "").trim()
  if (keyId.startsWith("rzp_test_")) return "test"
  if (keyId.startsWith("rzp_live_")) return "live"
  return "unconfigured"
}

/** Only explicit test mode may use mock orders; a missing secret never does. */
export function isRazorpayTestMode(): boolean {
  return process.env.APP_ENV === "test" || process.env.NODE_ENV === "test"
}

let client: Razorpay | null = null

/** Throws when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured or mismatched. */
export function getRazorpayClient(): Razorpay {
  const keyId = getRazorpayKeyId()
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (no placeholder fallback)"
    )
  }

  // Refuse mismatched test/live key pair
  const serverKey = process.env.RAZORPAY_KEY_ID?.trim()
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim()
  if (serverKey && publicKey) {
    const serverIsTest = serverKey.startsWith("rzp_test_")
    const serverIsLive = serverKey.startsWith("rzp_live_")
    const publicIsTest = publicKey.startsWith("rzp_test_")
    const publicIsLive = publicKey.startsWith("rzp_live_")
    if ((serverIsTest && publicIsLive) || (serverIsLive && publicIsTest)) {
      throw new Error(
        "Razorpay credential mismatch: RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID must both be test or both be live"
      )
    }
  }

  const isKeyTest = keyId.startsWith("rzp_test_")
  const isKeyLive = keyId.startsWith("rzp_live_")
  if (isKeyTest && (keySecret.startsWith("rzp_live_") || keySecret.startsWith("live_"))) {
    throw new Error("Razorpay credential mismatch: test key ID cannot be paired with a live secret")
  }
  if (isKeyLive && (keySecret.startsWith("rzp_test_") || keySecret.startsWith("test_"))) {
    throw new Error("Razorpay credential mismatch: live key ID cannot be paired with a test secret")
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
