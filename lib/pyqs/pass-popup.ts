/**
 * Pure helpers for the PYQ "Pass" upsell popup.
 *
 * The locked PYQ surfaces open the Rs 499 yearly Pass Razorpay checkout on the
 * same page. Guests are sent to /login with a safe return path that carries the
 * `passPopup=1` trigger, so the popup opens once when they land back on the
 * same PYQ page.
 *
 * Kept free of React / Next / Prisma imports so it can be unit tested without a DB.
 */
import { sanitizeReturnPath } from "@/lib/utils/return-path"

/** Query param that asks a PYQ page to open the Pass popup once after login. */
export const PASS_POPUP_QUERY_PARAM = "passPopup"
export const PASS_POPUP_QUERY_VALUE = "1"

/**
 * sessionStorage key marking that this browser tab already auto-opened the
 * popup from a return path. A refresh or a Back navigation into the login
 * callback must not reopen it.
 */
export const PASS_POPUP_HANDLED_STORAGE_KEY = "pyq-pass-popup-handled"

/** Safe fallback when a locked PYQ click has no usable current path. */
export const PYQ_PASS_FALLBACK_PATH = "/pyqs"
export const PASS_LOGIN_PATH = "/login"

export type PyqLockState = "free" | "unlocked" | "locked"

/**
 * Builds the return path for a locked PYQ click, preserving the page (and its
 * query, e.g. a pdf-view paperId) and adding the one-shot `passPopup=1` trigger.
 * Anything unsafe is replaced by the fallback page.
 */
export function buildPassReturnPath(
  rawPath?: string | null,
  fallback: string = PYQ_PASS_FALLBACK_PATH
): string {
  const safePath = sanitizeReturnPath(rawPath, fallback)
  const url = new URL(safePath, "http://localhost")
  url.searchParams.delete(PASS_POPUP_QUERY_PARAM)
  url.searchParams.set(PASS_POPUP_QUERY_PARAM, PASS_POPUP_QUERY_VALUE)
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * /login link for a guest who clicked a locked PYQ button. The callbackUrl is
 * sanitized (never an external origin) and keeps the same PYQ page + trigger.
 */
export function buildPassLoginHref(
  rawPath?: string | null,
  fallback: string = PYQ_PASS_FALLBACK_PATH
): string {
  const returnPath = buildPassReturnPath(rawPath, fallback)
  return `${PASS_LOGIN_PATH}?callbackUrl=${encodeURIComponent(returnPath)}`
}

/**
 * Reads and consumes the one-shot trigger. Returns the cleaned path (the URL
 * the browser should replace itself with) so a refresh or a Back navigation
 * cannot reopen the popup.
 */
export function consumePassPopupParam(path: string): {
  requested: boolean
  cleanPath: string
} {
  const url = new URL(path, "http://localhost")
  const requested = url.searchParams.get(PASS_POPUP_QUERY_PARAM) === PASS_POPUP_QUERY_VALUE
  if (requested) {
    url.searchParams.delete(PASS_POPUP_QUERY_PARAM)
  }
  return { requested, cleanPath: `${url.pathname}${url.search}${url.hash}` }
}

/**
 * "Open the popup once" guard: only when the page was reached with the
 * trigger, nothing has handled it yet in this mount, and the page still needs
 * the Pass (an active Pass holder must never see the popup).
 */
export function hasPendingPassPopup(input: {
  requested: boolean
  alreadyHandled: boolean
  passUnlockRequired: boolean
}): boolean {
  return input.requested && !input.alreadyHandled && input.passUnlockRequired
}

/**
 * Locked-state decision for a PYQ paper card. `canAccess` comes from the server
 * (admin, paper owner, active Pass and legacy unlocks are already `true`), with
 * `accessType` as a fallback for payloads that omit it.
 */
export function evaluatePyqLockState(paper: {
  accessType?: string | null
  canAccess?: boolean | null
}): PyqLockState {
  if (paper.canAccess === true) return "unlocked"
  if (paper.canAccess === false) return "locked"

  const accessType = (paper.accessType || "").trim().toUpperCase()
  return accessType === "PAID" || accessType === "PASS_ONLY" ? "locked" : "free"
}
