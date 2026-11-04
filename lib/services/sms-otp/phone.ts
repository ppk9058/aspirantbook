/**
 * Single source of truth for phone normalisation and masking.
 *
 * Product rule: India only for now. A valid number is a 10-digit Indian mobile
 * number starting with 6-9. `+91`, `91` and a leading `0` prefix are accepted
 * and stripped; everything else is rejected with a clear, non-PII message.
 */

export interface NormalizedPhone {
  ok: true;
  /** E.164 form, e.g. +919876543210. */
  e164: string;
  /** Numeric country code, e.g. "91". */
  countryCode: string;
  /** National number, e.g. "9876543210". */
  nationalNumber: string;
}

export interface InvalidPhone {
  ok: false;
  error: string;
}

export type PhoneNormalization = NormalizedPhone | InvalidPhone;

const INDIA_COUNTRY_CODE = "91";

export function normalizeIndianPhone(raw: unknown): PhoneNormalization {
  if (typeof raw !== "string") {
    return { ok: false, error: "Please enter a valid 10-digit mobile number." };
  }

  // Keep digits and a single leading "+" only. Spaces, dashes, dots and
  // parentheses are formatting noise users paste from contacts.
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return { ok: false, error: "Please enter a valid 10-digit mobile number." };
  }

  let national = digits;

  if (hasPlus) {
    if (!digits.startsWith(INDIA_COUNTRY_CODE)) {
      return { ok: false, error: "Only Indian (+91) mobile numbers are supported right now." };
    }
    national = digits.slice(INDIA_COUNTRY_CODE.length);
  } else if (national.length === 12 && national.startsWith(INDIA_COUNTRY_CODE)) {
    national = national.slice(INDIA_COUNTRY_CODE.length);
  } else if (national.length === 11 && national.startsWith("0")) {
    national = national.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(national)) {
    return { ok: false, error: "Please enter a valid 10-digit mobile number starting with 6-9." };
  }

  return {
    ok: true,
    e164: `+${INDIA_COUNTRY_CODE}${national}`,
    countryCode: INDIA_COUNTRY_CODE,
    nationalNumber: national,
  };
}

/**
 * Masks a phone for logs: +91******1234. Never log the full number.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  const last4 = digits.slice(-4);
  return `+91******${last4}`;
}
