import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { PrismaClient } from "@prisma/client"

// Masked connection host
function getMaskedHost(urlStr?: string): string {
  if (!urlStr) return "[UNKNOWN]"
  try {
    const u = new URL(urlStr)
    const host = u.host.replace(/^([^.]{3})[^.]*/, "$1***")
    return `${host}${u.pathname}`
  } catch {
    return "[MASKED_HOST]"
  }
}

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
console.log(`[audit-dev-db-gating] Connecting to Dev DB: ${getMaskedHost(directUrl)}`)

const prisma = new PrismaClient({
  datasources: {
    db: { url: directUrl }
  }
})

async function audit() {
  console.log("\n=== 1. AUDITING TUTORIAL: agentic-engineering-zero-to-hero ===")
  const targetCourse = await prisma.course.findFirst({
    where: {
      OR: [
        { slug: "agentic-engineering-zero-to-hero" },
        { id: "agentic-engineering-zero-to-hero" }
      ]
    },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              versions: {
                orderBy: { createdAt: "desc" },
                take: 1
              }
            }
          }
        }
      }
    }
  })

  if (!targetCourse) {
    console.log("Course 'agentic-engineering-zero-to-hero' NOT FOUND in dev DB!")
  } else {
    console.log(`Course Found: "${targetCourse.title}" (ID: ${targetCourse.id}, slug: ${targetCourse.slug})`)
    console.log(`  Course Gate Fields: isGated=${targetCourse.isGated}, previewPercentage=${targetCourse.previewPercentage}, seoMode=${targetCourse.seoMode}, gateTitle="${targetCourse.gateTitle || ""}", gateSubtitle="${targetCourse.gateSubtitle || ""}"`)
    console.log(`  Chapters Count: ${targetCourse.chapters.length}`)

    for (const [idx, ch] of targetCourse.chapters.entries()) {
      console.log(`  Chapter ${idx + 1}: "${ch.title}" (ID: ${ch.id})`)
      console.log(`    gateMode: "${ch.gateMode || "inherit"}", item previewPercentage: ${ch.previewPercentage}, blockCount: ${(ch as any).blockCount ?? "null"}, contentHash: ${(ch as any).contentHash ?? "null"}`)
      console.log(`    Lessons Count: ${ch.lessons.length}`)

      for (const [lIdx, l] of ch.lessons.entries()) {
        const hasContent = Boolean(l.content && l.content.length > 0)
        const versionBlocks = (l.versions?.[0] as any)?.blocks
        const hasVersionBlocks = Boolean(versionBlocks && Array.isArray(versionBlocks) && versionBlocks.length > 0)
        let blockCount = 0
        if (hasVersionBlocks) {
          blockCount = versionBlocks.length
        } else if (hasContent) {
          try {
            const parsed = JSON.parse(l.content!)
            if (Array.isArray(parsed)) blockCount = parsed.length
            else if (parsed.blocks && Array.isArray(parsed.blocks)) blockCount = parsed.blocks.length
            else blockCount = 1
          } catch {
            // raw HTML
            blockCount = 1 // or unchunked
          }
        }
        console.log(`      Lesson ${lIdx + 1}: "${l.title}" (ID: ${l.id})`)
        console.log(`        content length: ${l.content?.length ?? 0}, hasVersionBlocks: ${hasVersionBlocks} (blocks: ${blockCount})`)
        console.log(`        content preview: ${l.content?.substring(0, 80).replace(/\n/g, " ") ?? "[empty]"}`)
      }
    }
  }

  console.log("\n=== 2. AUDITING ALL COURSES IN DEV DB ===")
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      isGated: true,
      previewPercentage: true,
      seoMode: true,
      chapters: {
        select: {
          id: true,
          title: true,
          gateMode: true,
          previewPercentage: true,
          lessons: {
            select: {
              id: true,
              title: true,
              content: true,
              versions: { take: 1, select: { blocks: true } }
            }
          }
        }
      }
    }
  })

  let gatedCoursesWithNoChunks = 0
  for (const c of courses) {
    const isGated = c.isGated
    const chaptersGated = c.chapters.filter(ch => ch.gateMode && ch.gateMode !== "inherit" && ch.gateMode !== "free")
    if (isGated || chaptersGated.length > 0) {
      console.log(`Gated Course: "${c.title}" (isGated=${c.isGated}, previewPercentage=${c.previewPercentage})`)
      for (const ch of c.chapters) {
        if (ch.gateMode && ch.gateMode !== "inherit") {
          console.log(`  Gated Chapter: "${ch.title}" (mode=${ch.gateMode}, pct=${ch.previewPercentage})`)
        }
        for (const l of ch.lessons) {
          const hasChunks = Boolean((l.versions[0] as any)?.blocks)
          if (!hasChunks && (isGated || ch.gateMode === "locked" || ch.gateMode === "preview")) {
            gatedCoursesWithNoChunks++
            console.log(`    ⚠️ Lesson WITHOUT version chunks: "${l.title}" (content len: ${l.content?.length || 0})`)
          }
        }
      }
    }
  }

  console.log(`Total courses in dev DB: ${courses.length}. Gated lessons missing version chunks: ${gatedCoursesWithNoChunks}`)

  console.log("\n=== 3. AUDITING ALL EXAM SERIES IN DEV DB ===")
  const series = await prisma.examSeries.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      isGated: true,
      previewPercentage: true,
      seoMode: true,
      tests: {
        select: {
          id: true,
          title: true,
          gateMode: true,
          previewPercentage: true,
          totalQuestions: true
        }
      }
    }
  })
  for (const s of series) {
    if (s.isGated || s.tests.some(t => t.gateMode && t.gateMode !== "inherit")) {
      console.log(`Gated Series: "${s.title}" (isGated=${s.isGated}, pct=${s.previewPercentage})`)
      for (const t of s.tests) {
        if (t.gateMode && t.gateMode !== "inherit") {
          console.log(`  Test: "${t.title}" (mode=${t.gateMode}, pct=${t.previewPercentage})`)
        }
      }
    }
  }

  console.log("\n=== 4. AUDITING ALL PYQ PAPERS IN DEV DB ===")
  const pyqs = await prisma.pyqPaper.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      isGated: true,
      previewPercentage: true,
      seoMode: true
    }
  })
  for (const p of pyqs) {
    if (p.isGated) {
      console.log(`Gated PYQ: "${p.title}" (isGated=${p.isGated}, pct=${p.previewPercentage})`)
    }
  }

  console.log("\n=== 5. AUDITING ALL CURRENT AFFAIRS IN DEV DB ===")
  const cas = await prisma.currentAffairsPdf.findMany({
    select: {
      id: true,
      title: true,
      isGated: true,
      previewPercentage: true,
      seoMode: true,
      blockCount: true,
      contentHash: true
    }
  })
  for (const ca of cas) {
    if (ca.isGated) {
      console.log(`Gated CA PDF: "${ca.title}" (isGated=${ca.isGated}, pct=${ca.previewPercentage}, blocks=${ca.blockCount})`)
    }
  }

  console.log("\n=== AUDIT COMPLETE ===")
}

audit()
  .catch((err) => {
    console.error("Audit error:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
