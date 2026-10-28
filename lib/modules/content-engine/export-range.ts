/**
 * B11: the content-engine static export read every published question (with all
 * translations) into memory in one unbounded `findMany`, then built a zip buffer
 * from all of it. At a realistic corpus size that is a guaranteed out-of-memory
 * on the serverless function that serves it.
 *
 * An export is now a bounded part: a maximum number of questions per request and
 * an offset so a large corpus is exported in several archives. These helpers
 * own the parsing and the part metadata so the route stays thin and both are
 * testable without a Next request scope.
 */

export const EXPORT_MAX_LIMIT = 2000
export const EXPORT_READ_CHUNK = 250

export class ExportRangeError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ExportRangeError"
    this.status = status
  }
}

export interface ExportRange {
  limit: number
  offset: number
  /** True when the caller asked for an explicit page rather than the default. */
  limitExplicit: boolean
}

function parseNonNegativeInt(value: string | null, field: string): number | null {
  if (value === null || value.trim() === "") return null
  if (!/^\d+$/.test(value.trim())) {
    throw new ExportRangeError(`${field} must be a non-negative integer`)
  }
  return Number(value.trim())
}

/**
 * Reads `limit` / `offset` from the query string.
 *
 * `limit` is capped at EXPORT_MAX_LIMIT: asking for more is a 400 rather than a
 * silent truncation, because a partial archive that looks complete is worse than
 * an explicit error.
 */
export function parseExportRange(searchParams: URLSearchParams): ExportRange {
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")

  const limit = parseNonNegativeInt(limitParam, "limit")
  const offset = parseNonNegativeInt(offsetParam, "offset") ?? 0

  if (limit !== null && (limit < 1 || limit > EXPORT_MAX_LIMIT)) {
    throw new ExportRangeError(
      `limit must be between 1 and ${EXPORT_MAX_LIMIT}; export the corpus in parts instead`
    )
  }

  return {
    limit: limit ?? EXPORT_MAX_LIMIT,
    offset,
    limitExplicit: limit !== null,
  }
}

export interface ExportPart {
  total: number
  offset: number
  limit: number
  returned: number
  nextOffset: number | null
  parts: number
  /** True when the caller must fetch further parts to get the whole corpus. */
  partial: boolean
}

export function buildExportPart(
  total: number,
  offset: number,
  limit: number,
  returned: number
): ExportPart {
  const nextOffset = offset + returned < total ? offset + returned : null
  return {
    total,
    offset,
    limit,
    returned,
    nextOffset,
    parts: total === 0 ? 1 : Math.ceil(total / limit),
    partial: nextOffset !== null,
  }
}

/**
 * A default (no explicit limit) request for more than one page is refused
 * instead of quietly returning only the first page: an operator who deploys that
 * archive would publish a fraction of the corpus.
 */
export function assertExportFitsInOneArchive(total: number, range: ExportRange): void {
  if (!range.limitExplicit && total > range.limit) {
    throw new ExportRangeError(
      `${total} published questions exceed the ${range.limit}-question export limit; ` +
        `request ?limit=${range.limit}&offset=0, then continue with the offset from each response`,
      413
    )
  }
}
