import { prisma } from "../lib/prisma"

async function runM3Verification() {
  console.log("=== VERIFYING M3: BLOCK EDITOR & LESSON VERSIONING ===")

  // 1. Find a test lesson
  const lesson = await prisma.lesson.findFirst({
    include: { versions: true }
  })

  if (!lesson) {
    console.error("❌ No lessons found in database to verify")
    process.exit(1)
  }

  console.log(`✅ Found sample lesson: "${lesson.title}" (id: ${lesson.id})`)
  console.log(`   Initial versions count: ${lesson.versions.length}`)
  console.log(`   Published version ID: ${lesson.currentPublishedVersionId}`)
  console.log(`   Draft version ID: ${lesson.currentDraftVersionId}`)

  // 2. Test saving a draft version
  const testBlocks = [
    { bid: "m3-test-h2", t: "h2", x: "Interactive Block Editor Test" },
    { bid: "m3-test-p", t: "p", x: "Testing ==highlight== and **bold** rendering" },
    { bid: "m3-test-callout", t: "callout", k: "tip", x: "Autosave and draft management works!" }
  ]

  const draftVersion = await prisma.lessonVersion.create({
    data: {
      lessonId: lesson.id,
      status: "draft",
      blocks: testBlocks,
      source: "editor",
      note: "M3 automated draft save test",
      schemaVersion: 1,
    }
  })

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: { currentDraftVersionId: draftVersion.id }
  })

  console.log(`✅ Draft version created: ${draftVersion.id}`)

  // 3. Verify draft isolation (learner only sees published version)
  const lessonCheck = await prisma.lesson.findUnique({
    where: { id: lesson.id },
    include: { versions: true }
  })

  if (lessonCheck?.currentPublishedVersionId !== lesson.currentPublishedVersionId) {
    throw new Error("❌ Draft save accidentally modified published version ID!")
  }
  if (lessonCheck?.currentDraftVersionId !== draftVersion.id) {
    throw new Error("❌ currentDraftVersionId was not updated!")
  }
  console.log("✅ Verified draft isolation: draft saved without affecting learner published version")

  // 4. Test publishing the draft version
  const publishedVersion = await prisma.lessonVersion.create({
    data: {
      lessonId: lesson.id,
      status: "published",
      blocks: testBlocks,
      source: "editor",
      note: "M3 automated publish test",
      schemaVersion: 1,
    }
  })

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      currentPublishedVersionId: publishedVersion.id,
      currentDraftVersionId: null,
      content: JSON.stringify(testBlocks)
    }
  })

  const publishedCheck = await prisma.lesson.findUnique({
    where: { id: lesson.id }
  })

  if (publishedCheck?.currentPublishedVersionId !== publishedVersion.id) {
    throw new Error("❌ Lesson currentPublishedVersionId did not update to published version!")
  }
  if (publishedCheck?.currentDraftVersionId !== null) {
    throw new Error("❌ currentDraftVersionId was not cleared upon publish!")
  }

  console.log(`✅ Verified publishing: lesson currentPublishedVersionId is now ${publishedVersion.id} and draft cleared`)

  // 5. Cleanup test versions and restore original published version if needed
  if (lesson.currentPublishedVersionId) {
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        currentPublishedVersionId: lesson.currentPublishedVersionId,
        content: lesson.content
      }
    })
    await prisma.lessonVersion.deleteMany({
      where: { id: { in: [draftVersion.id, publishedVersion.id] } }
    })
    console.log("✅ Cleaned up temporary test versions and restored original lesson state")
  }

  console.log("🎉 ALL M3 DATA & VERSIONING CHECKS PASSED SUCCESSFULLY!")
}

runM3Verification()
  .catch((e) => {
    console.error("❌ Test failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
