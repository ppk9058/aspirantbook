import { revalidatePath } from "next/cache"

/**
 * Public pages whose first render is prerendered by `next build`.
 *
 * The Docker build has no database (Dockerfile sets a dummy DATABASE_URL), so
 * these pages are generated without DB data and then served from the ISR cache
 * for up to `revalidate` seconds. `/test-series` is the visible case: its
 * server HTML contained no series cards and no ItemList JSON-LD until the first
 * successful revalidation.
 *
 * Every one of these routes is revalidated on demand by the admin flows that
 * change the data (lib/exam-packages.ts, app/api/exam/test/*). This module adds
 * the missing second trigger: the first health check that observes a reachable
 * database, i.e. seconds after the container starts, instead of waiting for an
 * hour or for an editor to save something.
 */
export const PUBLIC_CATALOGUE_PATHS = ["/test-series", "/", "/books"] as const

/**
 * Revalidate the public catalogues. Safe to call from any request handler:
 * failures are logged and reported, never thrown, so a page-level cache miss
 * can never take down an endpoint.
 */
export function revalidatePublicCatalogues(reason: string): string[] {
  const revalidated: string[] = []

  for (const path of PUBLIC_CATALOGUE_PATHS) {
    try {
      revalidatePath(path)
      revalidated.push(path)
    } catch (error) {
      console.warn(`[catalogue-cache] could not revalidate ${path} (${reason})`, error)
    }
  }

  return revalidated
}
