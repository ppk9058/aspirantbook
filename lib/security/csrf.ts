/**
 * CSRF and Origin Verification
 * Verifies that state-changing requests (POST, PUT, PATCH, DELETE) originated from the
 * expected host to prevent cross-site request forgery attacks.
 */

export function verifyRequestOrigin(req: Request): boolean {
    const origin = req.headers.get("origin")
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host")

    // If no origin header is provided, check referer header as fallback
    if (!origin) {
        const referer = req.headers.get("referer")
        if (referer && host) {
            try {
                const refererHost = new URL(referer).host
                return refererHost === host
            } catch {
                return false
            }
        }
        // Direct non-browser requests or same-origin requests omitting origin
        return true
    }

    if (!host) return true

    try {
        const originHost = new URL(origin).host
        return originHost === host
    } catch {
        return false
    }
}
