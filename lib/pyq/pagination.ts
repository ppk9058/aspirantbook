/**
 * Server-side pagination for public question-answer listings (Phase 2, M6).
 * Per-page selector: 10 / 20 / 50, default 20. URLs are `?page=N&per=P`.
 */

export const PER_PAGE_OPTIONS = [10, 20, 50] as const
export const DEFAULT_PER_PAGE = 20

export interface PageParams {
  page: number // 1-based, clamped >= 1
  per: number // one of PER_PAGE_OPTIONS
  skip: number
  take: number
}

export interface RawSearchParams {
  page?: string | string[] | undefined
  per?: string | string[] | undefined
}

function firstVal(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export function parsePagination(
  search: RawSearchParams,
  totalItems?: number,
): PageParams {
  const perRaw = parseInt(firstVal(search.per) || "", 10)
  const per = (PER_PAGE_OPTIONS as readonly number[]).includes(perRaw)
    ? perRaw
    : DEFAULT_PER_PAGE

  const pageRaw = parseInt(firstVal(search.page) || "", 10)
  let page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  if (typeof totalItems === "number") {
    const totalPages = Math.max(1, Math.ceil(totalItems / per))
    if (page > totalPages) page = totalPages
  }

  return { page, per, skip: (page - 1) * per, take: per }
}

/** Build a href for a page, preserving all other filter params. */
export function pageHref(
  basePath: string,
  current: Record<string, string | undefined>,
  page: number,
  per?: number,
): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(current)) {
    if (v) params.set(k, v)
  }
  params.set("page", String(page))
  if (per && per !== DEFAULT_PER_PAGE) params.set("per", String(per))
  else params.delete("per")
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

/** Page numbers to show: 1 … around current … last (compact, mobile-friendly). */
export function pageWindow(current: number, totalPages: number): number[] {
  const pages = new Set<number>([1, totalPages])
  for (const p of [current - 1, current, current + 1]) {
    if (p >= 1 && p <= totalPages) pages.add(p)
  }
  return [...pages].sort((a, b) => a - b)
}
