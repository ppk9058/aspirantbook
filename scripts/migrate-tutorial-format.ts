/**
 * Dry-run / apply script to migrate existing tutorial courses by tagging metadataJson.format = "tutorial".
 *
 * Usage:
 *   npx ts-node scripts/migrate-tutorial-format.ts          # Dry run
 *   npx ts-node scripts/migrate-tutorial-format.ts --apply  # Apply changes
 */

import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  const isApply = process.argv.includes("--apply")

  console.log(`\n=== TUTORIAL FORMAT MIGRATION (${isApply ? "APPLY MODE" : "DRY RUN MODE"}) ===\n`)

  const courses = await prisma.course.findMany({
    include: {
      chapters: {
        include: { lessons: true },
      },
    },
  })

  const candidates: Array<{
    id: string
    slug: string
    title: string
    externalId: string | null
    hasMetaObj: boolean
    hasTheme: boolean
    hasVideo: boolean
    currentFormat: string | null
    metadataJson: string | null
  }> = []

  for (const c of courses) {
    const hasVideo = c.chapters.some((ch) =>
      ch.lessons.some((l) => Boolean(l.videoUrl) || l.type === "VIDEO")
    )

    let meta: any = null
    let format: string | null = null
    if (c.metadataJson) {
      try {
        const parsed = JSON.parse(c.metadataJson)
        meta = parsed.meta || null
        format = parsed.format || null
      } catch (e) {}
    }

    const hasExtId = Boolean(c.externalId)
    const hasMetaObj = Boolean(meta)
    const hasTheme = Boolean(c.theme)
    const matchesRule = hasExtId || hasMetaObj || (hasTheme && !hasVideo)

    if (matchesRule) {
      candidates.push({
        id: c.id,
        slug: c.slug,
        title: c.title,
        externalId: c.externalId,
        hasMetaObj,
        hasTheme,
        hasVideo,
        currentFormat: format,
        metadataJson: c.metadataJson,
      })
    }
  }

  console.log(`Found ${candidates.length} candidate courses to tag as format: "tutorial":\n`)
  for (const c of candidates) {
    console.log(`- [${c.id}] ${c.title} (${c.slug})`)
    console.log(`  externalId: ${c.externalId || "null"}, hasMeta: ${c.hasMetaObj}, hasTheme: ${c.hasTheme}, currentFormat: ${c.currentFormat}`)
  }
  console.log("")

  if (!isApply) {
    console.log("ℹ️  This was a DRY RUN. No changes were written to the database.")
    console.log("   Run with '--apply' to persist metadataJson.format = 'tutorial'.\n")
    return
  }

  console.log("Starting atomic transaction to update courses...")
  await prisma.$transaction(async (tx) => {
    let updatedCount = 0
    for (const c of candidates) {
      const current = await tx.course.findUnique({
        where: { id: c.id },
        select: { id: true, slug: true, title: true, metadataJson: true },
      })
      if (!current) continue

      let parsedJson: Record<string, any> = {}
      if (current.metadataJson) {
        try {
          parsedJson = typeof current.metadataJson === "string" ? JSON.parse(current.metadataJson) : current.metadataJson
          if (!parsedJson || typeof parsedJson !== "object") parsedJson = {}
        } catch {
          parsedJson = {}
        }
      }

      const beforeStr = current.metadataJson || "null"
      if (parsedJson.format === "tutorial") {
        console.log(`[IDEMPOTENT SKIP] [${current.id}] ${current.slug} already has format: "tutorial"`)
        continue
      }

      parsedJson.format = "tutorial"
      const afterStr = JSON.stringify(parsedJson)

      await tx.course.update({
        where: { id: current.id },
        data: {
          metadataJson: afterStr,
        },
      })
      updatedCount++
      console.log(`\n------------------------------------------------------------`)
      console.log(`✓ UPDATED [${current.id}] "${current.title}" (${current.slug})`)
      console.log(`  BEFORE metadataJson: ${beforeStr}`)
      console.log(`  AFTER  metadataJson: ${afterStr}`)
    }
    console.log(`\nTransaction completed. Successfully updated ${updatedCount} course(s).\n`)
  })
}

main()
  .catch((e) => {
    console.error("Migration failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
