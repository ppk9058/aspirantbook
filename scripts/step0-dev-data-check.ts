import fs from "fs"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"

// Mask secrets and connection string
const envPath = fs.existsSync(".env.local") ? ".env.local" : ".env"
const parsed = dotenv.parse(fs.readFileSync(envPath))
const dbUrl = parsed.DATABASE_URL || parsed.DIRECT_URL

if (!dbUrl) {
  console.error("No DATABASE_URL found in env files")
  process.exit(1)
}

const parsedUrl = new URL(dbUrl)
const host = parsedUrl.host
const maskedHost = host.slice(0, 3) + "***" + host.slice(-12)
console.log(`[DEV-DB] Connected Host: ${maskedHost} | DB: ${parsedUrl.pathname}`)

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
})

async function run() {
  try {
    const slug = "agentic-engineering-zero-to-hero"
    const course = await prisma.course.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: {
        id: true,
        slug: true,
        title: true,
        isGated: true,
        previewPercentage: true,
        seoMode: true,
        gateTitle: true,
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
      console.log(`Course ${slug} not found in Dev DB`)
      return
    }

    console.log("\n================ BEFORE REPAIR ================")
    console.log(`Course: ${course.title} (ID: ${course.id})`)
    console.log(`  isGated: ${course.isGated}`)
    console.log(`  previewPercentage: ${course.previewPercentage}`)
    console.log(`  seoMode: ${course.seoMode}`)

    console.log(`\nChapters (${course.chapters.length}):`)
    let phase1ToRepair: { id: string; title: string; gateMode: string | null; previewPercentage: number | null } | null = null

    for (const ch of course.chapters) {
      console.log(`  Phase [${ch.order}] "${ch.title}" (ID: ${ch.id}): gateMode=${ch.gateMode}, previewPercentage=${ch.previewPercentage}`)
      if (ch.order === 1 || ch.title.toLowerCase().includes("phase 1") || ch.title.toLowerCase().includes("chapter 1")) {
        if (!phase1ToRepair) {
          phase1ToRepair = {
            id: ch.id,
            title: ch.title,
            gateMode: ch.gateMode,
            previewPercentage: ch.previewPercentage,
          }
        }
      }
      for (const les of ch.lessons) {
        console.log(`    Lesson [${ch.order}.${les.order}] "${les.title}" (ID: ${les.id}): gateMode=${les.gateMode}, previewPercentage=${les.previewPercentage}`)
      }
    }

    if (!phase1ToRepair) {
      console.log("Phase 1 not found to repair.")
      return
    }

    console.log(`\nTarget Phase to Repair: "${phase1ToRepair.title}" (ID: ${phase1ToRepair.id})`)
    console.log(`Current values: gateMode=${phase1ToRepair.gateMode}, previewPercentage=${phase1ToRepair.previewPercentage}`)

    // Perform ONE targeted UPDATE on Phase 1 for this tutorial only
    const updated = await prisma.chapter.update({
      where: { id: phase1ToRepair.id },
      data: {
        gateMode: "inherit",
        previewPercentage: 100,
      },
      select: {
        id: true,
        title: true,
        order: true,
        gateMode: true,
        previewPercentage: true,
      },
    })

    console.log("\n================ AFTER REPAIR ================")
    console.log(`Phase "${updated.title}" (ID: ${updated.id}) successfully updated:`)
    console.log(`  gateMode: ${updated.gateMode}`)
    console.log(`  previewPercentage: ${updated.previewPercentage}`)
    console.log("No other rows mutated. Repair complete.\n")

  } finally {
    await prisma.$disconnect()
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
