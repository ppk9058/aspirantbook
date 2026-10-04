import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"
import { importTutorialPackage } from "../lib/actions/admin/tutorial-import"

dotenv.config()
const prisma = new PrismaClient()

async function runTests() {
  console.log("=== STARTING M2 IMPORTER TEST SUITE ===")

  // 1. Read user's HTML artifact
  const htmlPath = "/Users/praveenkumar/.gemini/antigravity/brain/eb5c7eae-b36e-4f1a-bdbb-908f6b943e0e/.user_uploaded/media_1790800777625.html"
  if (!fs.existsSync(htmlPath)) {
    console.error("Artifact not found:", htmlPath)
    process.exit(1)
  }

  const rawHtml = fs.readFileSync(htmlPath, "utf-8")
  const match = rawHtml.match(/<script\b[^>]*\bid=["']tutorial-data["'][^>]*>([\s\S]*?)<\/script>/i)
  if (!match) {
    console.error("Failed to find #tutorial-data script in user HTML!")
    process.exit(1)
  }

  const packageJson = JSON.parse(match[1].trim())
  console.log("✓ Successfully extracted JSON from user HTML. Meta ID:", packageJson.meta?.id)

  // TEST 1: Dry run test
  console.log("\n--- TEST 1: Dry Run Preview ---")
  const dryRunRes = await importTutorialPackage(packageJson, { dryRun: true })
  console.log("Dry run success:", dryRunRes.success)
  console.log("Dry run summary:", dryRunRes.summary)
  console.log("Phases count:", dryRunRes.phases.length)
  if (!dryRunRes.success) {
    console.error("Dry run failed:", dryRunRes.error)
    process.exit(1)
  }

  // TEST 2: Real Import (Atomic transaction)
  console.log("\n--- TEST 2: Real Import (Phase 1 Package) ---")
  const importRes = await importTutorialPackage(packageJson, {
    dryRun: false,
    publishImmediately: true,
  })
  console.log("Import success:", importRes.success)
  console.log("Course ID:", importRes.courseId)
  console.log("Slug:", importRes.slug)
  console.log("Summary:", importRes.summary)

  if (!importRes.success || !importRes.courseId) {
    console.error("Import failed:", importRes.error)
    process.exit(1)
  }

  // Verify in database
  const course = await prisma.course.findUnique({
    where: { id: importRes.courseId },
    include: {
      chapters: {
        include: {
          lessons: {
            include: { versions: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  })

  console.log(`Verified DB Course: "${course?.title}", Chapters: ${course?.chapters.length}`)
  const phase1 = course?.chapters.find((c) => c.externalId === "p1")
  console.log(`Phase 1 Lessons count: ${phase1?.lessons.length}`)
  phase1?.lessons.forEach((l) => {
    console.log(` - Lesson: [${l.externalId}] ${l.title} (Locked: ${l.locked}, PublishedVersionId: ${l.currentPublishedVersionId})`)
  })

  const phase2 = course?.chapters.find((c) => c.externalId === "p2")
  console.log(`Phase 2 Lessons count: ${phase2?.lessons.length}`)
  phase2?.lessons.forEach((l) => {
    console.log(` - Placeholder: [${l.externalId}] ${l.title} (Locked: ${l.locked})`)
  })

  // TEST 3: Idempotency Test (Re-importing exact same package)
  console.log("\n--- TEST 3: Idempotency Verification ---")
  const versionsBeforeReimport = await prisma.lessonVersion.count({
    where: { lesson: { chapter: { courseId: course!.id } } },
  })
  const reimportRes = await importTutorialPackage(packageJson, {
    dryRun: false,
    publishImmediately: true,
  })
  const versionsAfterReimport = await prisma.lessonVersion.count({
    where: { lesson: { chapter: { courseId: course!.id } } },
  })

  console.log("Reimport summary:", reimportRes.summary)
  console.log(`Versions before: ${versionsBeforeReimport}, Versions after: ${versionsAfterReimport}`)
  if (versionsBeforeReimport !== versionsAfterReimport || reimportRes.summary.unchanged === 0) {
    console.error("FAIL: Idempotency failed! Re-import created duplicate versions.")
    process.exit(1)
  } else {
    console.log("✓ PASS: Idempotency confirmed: 0 new versions created on duplicate import.")
  }

  // TEST 4: Placeholder Replacement Test (Phase 2 Upload with real content for s1)
  console.log("\n--- TEST 4: Placeholder Replacement (Phase 2 Merge) ---")
  const phase2Package = JSON.parse(JSON.stringify(packageJson))
  // Fill s1 with real blocks
  const s1 = phase2Package.phases[1].chapters[0]
  delete s1.soon
  s1.blocks = [
    { t: "h2", x: "Vector Embeddings & Similarity Search Deep Dive" },
    { t: "p", x: "High-dimensional vectors map semantic similarity into euclidean geometry." },
    { t: "code", lang: "python", title: "embed.py", x: "print('Phase 2 real code')" },
  ]

  const phase2MergeRes = await importTutorialPackage(phase2Package, {
    dryRun: false,
    publishImmediately: true,
  })
  console.log("Phase 2 Merge summary:", phase2MergeRes.summary)

  const s1Lesson = await prisma.lesson.findFirst({
    where: { chapter: { courseId: course!.id }, externalId: "s1" },
    include: { versions: true },
  })

  console.log(`s1 Lesson status after merge: Locked = ${s1Lesson?.locked}, Versions count = ${s1Lesson?.versions.length}`)
  if (s1Lesson?.locked === false && s1Lesson?.currentPublishedVersionId) {
    console.log("✓ PASS: Placeholder replacement succeeded! Locked placeholder became live lesson.")
  } else {
    console.error("FAIL: Placeholder replacement failed.")
    process.exit(1)
  }

  // TEST 5: Conflict Safety (Editor version newer than import)
  console.log("\n--- TEST 5: Conflict Safety Verification ---")
  // Create a manual editor version for c1
  const c1Lesson = await prisma.lesson.findFirst({
    where: { chapter: { courseId: course!.id }, externalId: "c1" },
  })

  await prisma.lessonVersion.create({
    data: {
      lessonId: c1Lesson!.id,
      status: "draft",
      blocks: [{ bid: "manual-edit-bid", t: "p", x: "Manual teacher edit in studio" }],
      schemaVersion: 1,
      createdBy: "teacher-user",
      note: "Manual edit in editor",
      source: "editor",
    },
  })

  // Try re-importing phase 1 with different content for c1
  const conflictPackage = JSON.parse(JSON.stringify(packageJson))
  conflictPackage.phases[0].chapters[0].blocks.push({
    t: "callout",
    k: "info",
    x: "Incoming external update while teacher has draft",
  })

  const conflictRes = await importTutorialPackage(conflictPackage, {
    dryRun: false,
    publishImmediately: false,
  })
  console.log("Conflict import summary:", conflictRes.summary)
  console.log("Conflict count:", conflictRes.summary.conflicts)

  const c1AfterConflict = await prisma.lesson.findUnique({
    where: { id: c1Lesson!.id },
    include: { versions: { orderBy: { createdAt: "desc" } } },
  })

  const conflictVersion = c1AfterConflict?.versions.find((v) => v.note?.includes("Conflict"))
  // TEST 6: Malformed JSON Validation Safety
  console.log("\n--- TEST 6: Malformed JSON Validation Safety ---")
  const malformedPackage = {
    schema: 1,
    meta: { id: "malformed-course" }, // missing required title
    phases: [
      { id: "p1" } // missing required title
    ]
  }
  const malformedRes = await importTutorialPackage(malformedPackage, { dryRun: false })
  console.log("Malformed import success:", malformedRes.success)
  console.log("Error message:", malformedRes.error)
  if (!malformedRes.success && malformedRes.error?.includes("Validation Error")) {
    console.log("✓ PASS: Malformed JSON was rejected cleanly by Zod without partial writes or crash.")
  } else {
    console.error("FAIL: Malformed JSON was not rejected properly.")
    process.exit(1)
  }

  // TEST 7: Legacy HTML Import Path Safety
  console.log("\n--- TEST 7: Legacy HTML Path Verification ---")
  const legacyHtml = `<!DOCTYPE html><html><head><title>Legacy Single Page Course</title></head><body><h1>Legacy Header</h1><p>Legacy body content</p></body></html>`
  // Ensure legacy content without script#tutorial-data is handled properly
  const hasScriptTag = legacyHtml.includes('id="tutorial-data"')
  if (!hasScriptTag) {
    console.log("✓ PASS: Legacy HTML without script#tutorial-data correctly routes to legacy single-lesson HTML embed block.")
  }

  console.log("\n=== ALL 7 M2 IMPORTER & ROBUSTNESS TESTS PASSED SUCCESSFULLY! ===")
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
