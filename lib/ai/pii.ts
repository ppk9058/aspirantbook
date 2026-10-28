import { createHash } from "crypto"

export interface PiiRedactionResult {
  sanitizedText: string
  piiDetected: boolean
  redactionCount: number
}

// Regex patterns for sensitive student data
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

// Phone patterns: +91 or standard 10 digit Indian / international numbers with optional separators
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g

// UUIDs and CUIDs
const UUID_REGEX = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g
const CUID_REGEX = /\bc[a-z0-9]{24}\b/g

// Indian Government IDs (Aadhaar 12 digits, PAN: 5 letters + 4 digits + 1 letter)
const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/g
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g

/**
 * Strips personally identifiable information (PII) before any text
 * is dispatched to an AI model provider.
 */
export function stripPII(
  text: string,
  extraIdentitiesToRedact: string[] = []
): PiiRedactionResult {
  if (!text) {
    return { sanitizedText: "", piiDetected: false, redactionCount: 0 }
  }

  let count = 0
  let sanitized = text

  // 1. Redact Emails
  sanitized = sanitized.replace(EMAIL_REGEX, () => {
    count++
    return "[EMAIL_REDACTED]"
  })

  // 2. Redact Govt IDs
  sanitized = sanitized.replace(AADHAAR_REGEX, () => {
    count++
    return "[GOVT_ID_REDACTED]"
  })
  sanitized = sanitized.replace(PAN_REGEX, () => {
    count++
    return "[GOVT_ID_REDACTED]"
  })

  // 3. Redact Phone numbers (avoid catching short math expressions)
  sanitized = sanitized.replace(PHONE_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, "")
    if (digitsOnly.length >= 10 && digitsOnly.length <= 13) {
      count++
      return "[PHONE_REDACTED]"
    }
    return match
  })

  // 4. Redact CUIDs & UUIDs
  sanitized = sanitized.replace(UUID_REGEX, () => {
    count++
    return "[ID_REDACTED]"
  })
  sanitized = sanitized.replace(CUID_REGEX, () => {
    count++
    return "[ID_REDACTED]"
  })

  // 5. Redact extra user identities (e.g. user's own name, phone, etc.)
  for (const identity of extraIdentitiesToRedact) {
    if (identity && identity.trim().length > 2) {
      const escaped = identity.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`\\b${escaped}\\b`, "gi")
      sanitized = sanitized.replace(regex, () => {
        count++
        return "[STUDENT_IDENTITY_REDACTED]"
      })
    }
  }

  return {
    sanitizedText: sanitized,
    piiDetected: count > 0,
    redactionCount: count,
  }
}

/**
 * Creates a one-way SHA-256 hash of a prompt for audit and debugging logs.
 * Never logs raw student input to ensure zero prompt data leakage.
 */
export function hashPrompt(text: string): string {
  return createHash("sha256").update(text || "").digest("hex")
}
