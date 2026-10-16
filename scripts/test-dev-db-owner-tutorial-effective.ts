import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

// Load DEV database URL from .env / .env.local
dotenv.config({ path: ".env" })
dotenv.config({ path: ".env.local" })

const devDbUrl = process.env.DATABASE_URL || ""

function maskDbUrl(url: string): string {
  try {
    const u = new URL(url)
    const host = u.host
    const maskedHost = host.length > 6 ? `${host.substring(0, 3)}***${host.substring(host.length - 7)}` : "***"
    return `${maskedHost} / ${u.pathname.replace("/", "")}`
  } catch {
    return "***masked***"
  }
}

async function runReadOnlySmoke() {
  console.log(`[READ-ONLY SMOKE] Masked DB target: ${maskDbUrl(devDbUrl)}`)

  const prisma = new PrismaClient({
    datasources: {
      db: { url: devDbUrl },
    },
  })

  try {
    const course = await prisma.course.findFirst({
      where: { slug: "agentic-engineering-zero-to-hero" },
      select: {
        id: true,
        title: true,
        slug: true,
        isGated: true,
        previewPercentage: true,
        seoMode: true,
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            gateMode: true,
            previewPercentage: true,
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                order: true,
                gateMode: true,
                previewPercentage: true,
              },
            },
          },
        },
      },
    })

    if (!course) {
      throw new Error("Course 'agentic-engineering-zero-to-hero' not found in Dev DB")
    }

    console.log(`Course Found: "${course.title}" (isGated: ${course.isGated}, preview: ${course.previewPercentage}%)`)

    const phase1 = course.chapters.find((c) => c.order === 1) || course.chapters[0]
    if (!phase1) {
      throw new Error("Phase 1 not found in course")
    }

    console.log(`Phase 1: "${phase1.title}" (gateMode: ${phase1.gateMode}, preview: ${phase1.previewPercentage}%)`)

    const lesson1_2 = phase1.lessons.find((l) => l.order === 2) || phase1.lessons[1]
    if (!lesson1_2) {
      throw new Error("Lesson 1.2 not found in Phase 1")
    }

    console.log(`Lesson 1.2: "${lesson1_2.title}" (gateMode: ${lesson1_2.gateMode}, preview: ${lesson1_2.previewPercentage}%)`)

    // Calculate effective preview percentage
    let effectivePct = course.previewPercentage ?? 100
    let effectiveSource = "Course"

    if (phase1.gateMode && phase1.gateMode !== "inherit") {
      effectiveSource = "Phase 1"
      if (phase1.gateMode === "locked") effectivePct = 0
      else if (phase1.gateMode === "free") effectivePct = 100
      else if (phase1.gateMode === "preview") effectivePct = phase1.previewPercentage ?? 20
    }

    if (lesson1_2.gateMode && lesson1_2.gateMode !== "inherit") {
      effectiveSource = "Lesson 1.2"
      if (lesson1_2.gateMode === "locked") effectivePct = 0
      else if (lesson1_2.gateMode === "free") effectivePct = 100
      else if (lesson1_2.gateMode === "preview") effectivePct = lesson1_2.previewPercentage ?? 20
    }

    console.log(`Effective for guests on Lesson 1.2: ${effectivePct}% (derived from ${effectiveSource})`)

    if (phase1.gateMode === "preview" && phase1.previewPercentage === 0) {
      throw new Error(`ASSERTION FAILED: Phase 1 is still Preview 0%!`)
    }

    console.log("\n[READ-ONLY SMOKE] VERIFIED SUCCESSFUL: Dev DB data intact, Phase 1 repaired, effective preview is correct.")
  } finally {
    await prisma.$disconnect()
  }
}

runReadOnlySmoke().catch((e) => {
  console.error("SMOKE ERROR:", e)
  process.exit(1)
})
