/**
 * B7: money helpers.
 *
 * Payment rows store `amount` as a Float, which cannot represent every price
 * exactly (499.1 is not representable) and is easy to round the wrong way when
 * values are summed. `Payment.amountMinor` stores the same value in the
 * currency's smallest unit as an Int; new rows dual-write both so reporting can
 * move to minor units without a backfill.
 *
 * Exponents follow ISO 4217 (2 for INR/USD/EUR, 0 for JPY, 3 for KWD).
 */

const CURRENCY_EXPONENTS: Record<string, number> = {
    INR: 2,
    USD: 2,
    EUR: 2,
    GBP: 2,
    AED: 2,
    SGD: 2,
    JPY: 0,
    KRW: 0,
    KWD: 3,
    BHD: 3,
}

/** Decimal places for a currency (defaults to 2 for unknown codes). */
export function currencyExponent(currency: string | null | undefined): number {
    return CURRENCY_EXPONENTS[(currency || "INR").toUpperCase()] ?? 2
}

/** Converts a major-unit amount (499.5) to minor units (49950) for a currency. */
export function toMinorUnits(amount: number, currency: string | null | undefined = "INR"): number {
    if (!Number.isFinite(amount)) {
        throw new Error(`Cannot convert a non-finite amount to minor units: ${amount}`)
    }
    return Math.round(amount * 10 ** currencyExponent(currency))
}

/** Converts minor units (49950) back to a major-unit amount (499.5). */
export function fromMinorUnits(minor: number, currency: string | null | undefined = "INR"): number {
    if (!Number.isFinite(minor)) {
        throw new Error(`Cannot convert a non-finite minor amount: ${minor}`)
    }
    return minor / 10 ** currencyExponent(currency)
}
