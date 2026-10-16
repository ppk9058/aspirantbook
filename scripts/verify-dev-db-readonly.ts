import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { PrismaClient } from "@prisma/client"
import { resolveAccess } from "../lib/authwall/resolveAccess"

const prisma = new PrismaClient()

async function main() {
  console.log("=== STEP 8: READ-ONLY VERIFICATION AGAINST DEV DB CONFIG ===")

  // 1. Audit Courses in dev DB (SELECT only)
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
          gateMode: true,
          previewPercentage: true,
          lessons: {
            take: 2,
            select: { id: true, content: true },
          },
        },
      },
    },
    take: 10,
  })

  console.log(`Auditing ${courses.length} courses in dev DB...`)
  let gatedCourseCount = 0
  let ungatedCourseCount = 0

  for (const c of courses) {
    if (c.isGated) gatedCourseCount++
    else ungatedCourseCount++

    // Run resolveAccess read-only check for guest
    for (const ch of c.chapters) {
      for (const l of ch.lessons) {
        const guestAccess = resolveAccess({
          viewer: { userId: null, role: null, isVerifiedBot: false },
          content: l.content,
          containerGate: c,
          itemGate: ch,
        })

        if (!c.isGated) {
          if (guestAccess.isLockedForGuest) {
            throw new Error(`Regression: ungated course ${c.slug} was unexpectedly locked for guest!`)
          }
          if (guestAccess.effectivePercentage !== 100) {
            throw new Error(`Regression: ungated course ${c.slug} did not receive 100% content!`)
          }
        }
      }
    }
  }

  console.log(`✓ All ${ungatedCourseCount} existing ungated courses remain 100% unlocked for guests (zero disruption).`)

  // 2. Audit Exam Series in dev DB (SELECT only)
  const seriesList = await prisma.examSeries.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      isGated: true,
      previewPercentage: true,
      tests: {
        take: 3,
        select: { id: true, title: true, gateMode: true },
      },
    },
    take: 10,
  })

  console.log(`Auditing ${seriesList.length} exam series in dev DB...`)
  for (const s of seriesList) {
    if (!s.isGated) {
      const access = resolveAccess({
        viewer: { userId: null, role: null, isVerifiedBot: false },
        content: s.tests,
        containerGate: s,
      })
      if (access.isLockedForGuest) {
        throw new Error(`Regression: ungated series ${s.slug} was locked!`)
      }
    }
  }
  console.log(`✓ All exam series checked against dev DB pass ungated guest access rules.`)

  // 3. Audit PYQ Papers in dev DB (SELECT only)
  const pyqs = await prisma.pyqPaper.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      isGated: true,
      previewPercentage: true,
    },
    take: 10,
  })

  console.log(`Auditing ${pyqs.length} PYQ papers in dev DB...`)
  for (const p of pyqs) {
    if (!p.isGated) {
      const access = resolveAccess({
        viewer: { userId: null, role: null, isVerifiedBot: false },
        content: [{ question: "Sample", answer: "A" }],
        containerGate: p,
      })
      if (access.isLockedForGuest) {
        throw new Error(`Regression: ungated pyq ${p.slug} was locked!`)
      }
    }
  }
  console.log(`✓ All PYQ papers checked against dev DB pass ungated guest access rules.`)

  // 4. Test simulated gated slice on real data sample
  if (courses.length > 0 && courses[0].chapters[0]?.lessons[0]) {
    const sampleLesson = courses[0].chapters[0].lessons[0]
    const simulatedGatedResult = resolveAccess({
      viewer: { userId: null, role: null, isVerifiedBot: false },
      content: sampleLesson.content,
      containerGate: { isGated: true, previewPercentage: 20, seoMode: "preview" },
    })

    if (!simulatedGatedResult.isLockedForGuest) {
      throw new Error("Simulated gate test failed: should be locked for guest!")
    }
    console.log(`✓ Simulated gate on real lesson data verified: correctly locks and slices to ${simulatedGatedResult.previewCount}/${simulatedGatedResult.totalItemsCount} blocks.`)
  }

  console.log("=== STEP 8: ALL READ-ONLY DEV DB CHECKS PASSED WITH ZERO WRITES ===")
}

main()
  .catch((err) => {
    console.error("Dev DB check failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
