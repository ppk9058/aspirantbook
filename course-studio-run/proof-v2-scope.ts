/**
 * Read-only: how many dev courses would take the v2 detail path?
 * Also lists them so the owner can see the blast radius.
 */
import { prisma } from "../lib/prisma"
import { parseCourseMetadata } from "../lib/courses/metadata-schema"

async function main() {
  const courses = await prisma.course.findMany({
    select: { id: true, slug: true, title: true, metadataJson: true },
  })

  const v2: string[] = []
  for (const course of courses) {
    const parsed = parseCourseMetadata(course.metadataJson)
    const isV2 =
      parsed.ok &&
      (Number(parsed.data.schemaVersion || 0) >= 2 ||
        "heroMetrics" in parsed.data ||
        "sections" in parsed.data ||
        "pillTags" in parsed.data ||
        "aboutHighlightsHi" in parsed.data)
    if (isV2) v2.push(`${course.slug} (${course.title})`)
  }

  console.log(`courses total: ${courses.length}`)
  console.log(`v2 detail path: ${v2.length}`)
  for (const entry of v2) console.log(`  - ${entry}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
