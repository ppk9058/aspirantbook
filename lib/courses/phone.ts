/**
 * Phone normalisation for callback leads.
 *
 * We only accept Indian mobile numbers (the product's market) and always store
 * E.164. Anything else is rejected so the lead table never holds ambiguous data.
 */

const E164_RE = /^\+[1-9]\d{7,14}$/

export function isE164(value: string | null | undefined): boolean {
  return typeof value === "string" && E164_RE.test(value.trim())
}

export function normalizePhoneToE164(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = String(input).replace(/\D/g, "")
  if (!digits) return null

  let local = digits
  if (local.length === 12 && local.startsWith("91")) local = local.slice(2)
  else if (local.length === 11 && local.startsWith("0")) local = local.slice(1)
  else if (local.length === 13 && local.startsWith("091")) local = local.slice(3)

  // Indian mobile numbers: exactly 10 digits, starting 6-9.
  if (!/^[6-9]\d{9}$/.test(local)) return null
  return `+91${local}`
}

/** Masks a number for logs/CSV previews: never log the full number (PII rule). */
export function maskPhone(e164: string): string {
  if (!isE164(e164)) return "***"
  return `${e164.slice(0, 3)}****${e164.slice(-2)}`
}
