/**
 * Pure helpers for opening PYQ PDFs in the shared SecurePdfViewer modal.
 *
 * The listing page no longer navigates to /pyqs/pdf-view: unlocked papers open
 * the modal on the same page, locked papers open the Pass popup first, and a
 * guest is sent to /login. None of this changes WHO may read a paper — the
 * access check stays on the server (app/api/pyqs/file/[paperId]/route.ts).
 */
import type { PyqLockState } from "@/lib/pyqs/pass-popup"

export const PYQ_PDF_BADGE_LABEL = "Official PYQ Paper"
export const PYQ_PDF_MODAL_TEST_ID = "pyq-pdf-modal"

/** Shown when the file endpoint still returns 403 right after a Pass payment. */
export const PYQ_UNLOCK_PENDING_MESSAGE =
    "Payment received, unlocking. Retry in a few seconds."

/** Inline viewer source. */
export function buildPyqPdfSource(paperId: string): string {
    return `/api/pyqs/file/${encodeURIComponent(paperId)}`
}

/**
 * `?download=1` is supported by the file route (see
 * app/api/pyqs/file/[paperId]/route.ts, where `download` is parsed), and it is
 * the same download URL /pyqs/pdf-view uses today.
 */
export function buildPyqPdfDownloadUrl(paperId: string): string {
    return `/api/pyqs/file/${encodeURIComponent(paperId)}?download=1`
}

export type PyqPdfAction = "login" | "pass" | "pdf"

/**
 * What a PYQ card click does. Guests log in, locked papers sell the Pass first,
 * everything else opens the modal.
 */
export function resolvePyqPdfAction(input: {
    isAuthenticated: boolean
    lockState: PyqLockState
}): PyqPdfAction {
    if (!input.isAuthenticated) return "login"
    if (input.lockState === "locked") return "pass"
    return "pdf"
}

export type PostPaymentPdfAction = "open" | "pending" | "error"

/**
 * Decides what to do with the status of the access probe that runs after a
 * verified Pass payment:
 * - 2xx / opaque redirect (0) -> access is ready, open the modal
 * - 403 -> fulfilment may still be writing the Pass: show the retry message
 * - anything else -> show an error with a Retry button
 * The caller only runs this after a successful payment, never in a loop.
 */
export function resolvePostPaymentPdfAction(status: number): PostPaymentPdfAction {
    if (status === 403) return "pending"
    if (status >= 400) return "error"
    return "open"
}
