import { adaptCoursesCatalogSeo } from "@/lib/seo/adapters/courses"
import { SeoJsonLd } from "@/lib/seo"
import CourseClient from "@/components/courses/CourseClient"
import Footer from "@/components/layout/Footer"
import { getCourseBadges } from "@/lib/coupons/badge-query"
import {
  loadPublishedCoursesForListing,
  resolveCourseListingForRender,
} from "@/lib/courses/course-listing"

// Public catalogue: static/ISR with 1h time-based revalidation.
// Goal and enrollment personalisations occur client-side after hydration so the
// initial server HTML contains all exams' courses for crawlers.
export const revalidate = 3600

export const metadata = adaptCoursesCatalogSeo().metadata

export default async function CoursesPage() {
  const listing = await loadPublishedCoursesForListing()
  const dbCourses = resolveCourseListingForRender(listing)

  let badgeMap: Record<string, any> = {}
  try {
    const allIds = dbCourses.map((c) => c.id)
    if (allIds.length > 0) {
      badgeMap = await getCourseBadges(allIds)
    }
  } catch {
    // Badges are non-critical
  }

  const seoPackage = adaptCoursesCatalogSeo(dbCourses)

  return (
    <>
      <SeoJsonLd schemas={seoPackage.jsonLd} />
      <CourseClient
        dbCourses={dbCourses}
        badgeMap={badgeMap}
      />
      <div className="mt-10">
        <Footer />
      </div>
    </>
  )
}
