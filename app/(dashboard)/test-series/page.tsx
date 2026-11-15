import { adaptTestSeriesCatalogSeo, SeoJsonLd } from "@/lib/seo"
import {
  loadPublishedSeriesForListing,
  resolveListingForRender,
} from "@/lib/exam/series-listing"
import TestSeriesListingClient from "@/components/exam/TestSeriesListingClient"

// Public catalogue: static/ISR, tag + time-based revalidation. Personalised
// filtering (goal, pass state, saved series) stays in the client child.
export const revalidate = 3600

export const metadata = adaptTestSeriesCatalogSeo().metadata

export default async function TestSeriesPage() {
  // The Docker/CI build runs `next build` with a dummy DATABASE_URL, so the
  // catalogue cannot be read at build time. `resolveListingForRender` keeps
  // that build green while refusing to treat a failed read as valid data:
  // app/api/health purges this route on the first healthy boot (before Render
  // routes traffic), and admin publish/edit flows purge it on demand, so the
  // served HTML always comes from a successful read.
  const listing = await loadPublishedSeriesForListing()
  const initialSeries = resolveListingForRender(listing)

  // Only list series the catalogue actually renders: the client hides series
  // with zero published tests, so the ItemList must not advertise them.
  const visibleSeries = initialSeries.filter((series) => series.totalTests > 0)
  const seo = adaptTestSeriesCatalogSeo(undefined, visibleSeries)

  return (
    <>
      <SeoJsonLd schemas={seo.jsonLd} />
      <TestSeriesListingClient initialSeries={initialSeries} />
    </>
  )
}
