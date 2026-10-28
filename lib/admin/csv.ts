/**
 * A10 / C1: CSV helpers for the admin user export.
 *
 * These two exports used to live in `lib/actions/admin/users.ts`, which is a
 * `"use server"` module. Next only permits async function exports in such a
 * file, so `next build` failed with
 *   "Only async functions are allowed to be exported in a \"use server\" file."
 * They are plain synchronous helpers, so they belong in a normal module.
 */

/** Hard cap on the number of user rows a single CSV export may contain. */
export const MAX_CSV_USERS = 5000

/**
 * A10: CSV formula-injection guard. Spreadsheet apps execute cells that start
 * with = + - @ TAB or CR; prefixing a single quote forces them to be text.
 * Quotes are escaped after the prefix so the CSV stays well-formed.
 */
export function csvCell(value: string): string {
    const raw = String(value ?? "")
    const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
    return guarded.replace(/"/g, '""')
}
