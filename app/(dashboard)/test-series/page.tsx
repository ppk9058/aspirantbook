import { adaptTestSeriesCatalogSeo, SeoJsonLd } from "@/lib/seo"
import { fetchPublishedSeriesForListing } from "@/lib/exam/series-listing"
import TestSeriesListingClient from "@/components/exam/TestSeriesListingClient"

// Public catalogue: static/ISR, tag + time-based revalidation. Personalised
// filtering (goal, pass state, saved series) stays in the client child.
export const revalidate = 3600

export const metadata = adaptTestSeriesCatalogSeo().metadata

export default async function TestSeriesPage() {
  const initialSeries = await fetchPublishedSeriesForListing().catch((error) => {
    console.error("[test-series] Failed to load published series", error)
    return []
  })

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
