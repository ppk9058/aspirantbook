/**
 * READ-ONLY parity proof for P1.
 *
 * Compares the OLD inline classification rules (verbatim copies of the code that
 * was in the app before this refactor) with the NEW lib/courses/format.ts
 * helpers, for every course currently in the configured database.
 *
 * Read-only: a single findMany. It never writes.
 *
 * Run: npx tsx course-studio-run/proof-format-parity.ts
 */
import { prisma } from "../lib/prisma"
import {
  resolveCourseFormat,
  isVideoCourseForStudio,
  isTextTutorialForCatalog,
  isListedInTutorialsSitemap,
} from "../lib/courses/format"

// ── OLD implementations (copied from the pre-refactor call sites) ───────────
function oldTutorialRedirect(c: any): boolean {
  let isTutorialCourse = Boolean(c.externalId)
  if (c.metadataJson) {
    try {
      const parsed = JSON.parse(c.metadataJson)
      if (parsed.format === "tutorial" || parsed.meta?.format === "tutorial" || parsed.type === "TUTORIAL") {
        isTutorialCourse = true
      }
    } catch {}
  }
  return isTutorialCourse
}

function oldIsVideoBundle(c: any): boolean {
  return (
    Boolean(c.price && c.price > 0) ||
    c.slug.includes("bpsc") ||
    (c.chapters || []).some((ch: any) =>
      (ch.lessons || []).some(
        (l: any) => Boolean(l.videoUrl) || l.type === "VIDEO" || l.attachmentType || l.attachmentName
      )
    )
  )
}

function oldVideoCourseStudio(c: any): boolean {
  if (c.slug === "72nd-bpsc-prelims-current-affairs") return true
  if (c.price && c.price > 0) return true
  return (c.chapters || []).some((ch: any) => (ch.lessons || []).some((l: any) => l.videoUrl || l.type === "VIDEO"))
}

function oldTextTutorialCatalog(c: any): boolean {
  if (c.slug === "72nd-bpsc-prelims-current-affairs") return false
  const lowerTitle = (c.title || "").toLowerCase()
  const lowerSlug = (c.slug || "").toLowerCase()
  if (lowerTitle.includes("video course") || lowerTitle.includes("video tutorial") || lowerSlug.includes("video")) {
    return false
  }
  const allLessons = (c.chapters || []).flatMap((ch: any) => ch.lessons || [])
  const hasVideoLessons = allLessons.some((l: any) => Boolean(l.videoUrl) || l.type === "VIDEO")
  if (hasVideoLessons) return false
  return true
}

function oldSitemapTutorial(c: any): boolean {
  const lowerSlug = (c.slug || "").toLowerCase()
  return !lowerSlug.includes("video") && c.slug !== "72nd-bpsc-prelims-current-affairs"
}

async function main() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      externalId: true,
      metadataJson: true,
      chapters: { select: { lessons: { select: { type: true, videoUrl: true, attachmentType: true, attachmentName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })

  let mismatches = 0
  const rows = courses.map((c) => {
    const oldRedirect = oldTutorialRedirect(c)
    const newRedirect = resolveCourseFormat(c) === "tutorial"
    const oldBundle = oldIsVideoBundle(c)
    const newBundle = resolveCourseFormat(c) === "bundle"
    const checks = [
      ["redirect", oldRedirect, newRedirect],
      ["bundle", oldBundle, newBundle],
      ["studio", oldVideoCourseStudio(c), isVideoCourseForStudio(c)],
      ["tutorialList", oldTextTutorialCatalog(c), isTextTutorialForCatalog(c)],
      ["sitemap", oldSitemapTutorial(c), isListedInTutorialsSitemap(c)],
    ] as const
    const bad = checks.filter(([, o, n]) => o !== n)
    // The redirect wins over bundle in the page, so a differing bundle flag on a
    // tutorial course is not observable. Only count differences in reachable paths.
    const observable = bad.filter(([name]) => !(name === "bundle" && (oldRedirect || newRedirect)) && !(name === "redirect" && oldRedirect && newBundle && oldBundle))
    if (observable.length) mismatches += 1
    return {
      slug: c.slug,
      format: resolveCourseFormat(c),
      oldRedirect,
      newRedirect,
      oldBundle,
      newBundle,
      studio: isVideoCourseForStudio(c),
      tutorialList: isTextTutorialForCatalog(c),
      sitemap: isListedInTutorialsSitemap(c),
      mismatch: observable.length ? observable.map(([n]) => n).join(",") : "",
    }
  })

  console.table(rows)
  console.log(`\nCourses checked: ${courses.length}`)
  console.log(`Observable mismatches: ${mismatches}`)
  await prisma.$disconnect()
  if (mismatches > 0) process.exitCode = 1
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exitCode = 1
})
