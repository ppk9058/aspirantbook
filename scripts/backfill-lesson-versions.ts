import { PrismaClient } from "@prisma/client"
import crypto from "crypto"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

interface Block {
  bid: string
  t: string
  [key: string]: any
}

function normalizeBlocks(content: string | null): Block[] {
  if (!content || !content.trim()) {
    return []
  }

  const trimmed = content.trim()

  // 1. Try JSON parsing
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      let rawBlocks: any[] = []

      if (Array.isArray(parsed)) {
        rawBlocks = parsed
      } else if (parsed && Array.isArray(parsed.blocks)) {
        rawBlocks = parsed.blocks
      }

      if (rawBlocks.length > 0) {
        return rawBlocks.map((b: any) => {
          const bid = b.bid || crypto.randomUUID()
          // Normalize type if legacy
          if (b.t) {
            return { ...b, bid }
          }
          if (b.type) {
            let t = b.type
            if (b.type === "paragraph") t = "p"
            else if (b.type === "subheading") t = "sub"
            else if (b.type === "heading") t = "h2"
            else if (b.type === "code") t = "code"
            else if (b.type === "callout") t = "callout"
            else if (b.type === "image") t = "image"
            else if (b.type === "quiz") t = "quiz"
            else if (b.type === "table") t = "table"
            else if (b.type === "html") t = "html"

            return {
              bid,
              t,
              x: b.content ?? b.x ?? "",
              ...b
            }
          }
          return { bid, t: "p", x: JSON.stringify(b) }
        })
      }
    } catch {
      // JSON parse failed, proceed to text fallback
    }
  }

  // 2. Check if it's HTML
  if (trimmed.startsWith("<") && (trimmed.includes("</div>") || trimmed.includes("</p>") || trimmed.includes("<!DOCTYPE") || trimmed.includes("<html"))) {
    return [
      {
        bid: crypto.randomUUID(),
        t: "html",
        x: content
      }
    ]
  }

  // 3. Plain text / markdown content
  return [
    {
      bid: crypto.randomUUID(),
      t: "p",
      x: content
    }
  ]
}

async function main() {
  console.log("Starting M1 safe backfill migration...")

  // 1. Backfill Chapters order
  const chapters = await prisma.chapter.findMany({
    orderBy: [{ courseId: "asc" }, { order: "asc" }]
  })
  console.log(`Found ${chapters.length} chapters. Updating fractional order if needed...`)

  let updatedChapters = 0
  for (const ch of chapters) {
    if (ch.order < 1000) {
      const newOrder = (Math.floor(ch.order) + 1) * 1000
      await prisma.chapter.update({
        where: { id: ch.id },
        data: { order: newOrder }
      })
      updatedChapters++
    }
  }
  console.log(`Updated ${updatedChapters} chapters to fractional order spacing (1000, 2000, ...).`)

  // 2. Backfill Lessons and LessonVersions
  const lessons = await prisma.lesson.findMany({
    orderBy: [{ chapterId: "asc" }, { order: "asc" }]
  })
  console.log(`Found ${lessons.length} lessons. Creating published versions and updating order...`)

  let createdVersions = 0
  let skippedLessons = 0

  for (const lesson of lessons) {
    // If lesson already has a published version, check it
    if (lesson.currentPublishedVersionId) {
      const existing = await prisma.lessonVersion.findUnique({
        where: { id: lesson.currentPublishedVersionId }
      })
      if (existing) {
        skippedLessons++
        continue
      }
    }

    const blocks = normalizeBlocks(lesson.content)

    // Create LessonVersion
    const version = await prisma.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        status: "published",
        blocks: blocks as any,
        schemaVersion: 1,
        createdBy: "migration-backfill",
        note: "Initial published version backfilled from existing lesson content",
        source: "restore"
      }
    })

    const newOrder = (lesson.order < 1000) ? (Math.floor(lesson.order) + 1) * 1000 : lesson.order

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        currentPublishedVersionId: version.id,
        order: newOrder
      }
    })

    createdVersions++
  }

  console.log(`Backfill completed successfully:`)
  console.log(`- Created ${createdVersions} published LessonVersion records`)
  console.log(`- Skipped ${skippedLessons} already-versioned lessons`)
  console.log(`- All existing lessons point to their active published version.`)
}

main()
  .catch((e) => {
    console.error("Migration backfill failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
