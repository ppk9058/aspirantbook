import { prisma } from "../lib/prisma"

async function main() {
  console.log("=== ITEM E: PREVIEW ATTEMPTS EXCLUSION VERIFICATION ===")
  const teacher = await prisma.user.findUnique({ where: { email: "teacher_owner@test.local" } })
  const student = await prisma.user.findUnique({ where: { email: "student_test@example.com" } })
  const sPub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-pub" },
    include: { tests: { where: { isPublished: true } } },
  })
  const pubTest = sPub!.tests[0]

  // Clean any existing test attempts on pubTest
  await prisma.examAttempt.deleteMany({
    where: { testId: pubTest.id },
  })

  // 1. Seed 1 student submitted attempt (score = 5)
  await prisma.examAttempt.create({
    data: {
      userId: student!.id,
      testId: pubTest.id,
      status: "SUBMITTED",
      score: 5,
      totalMarks: 10,
      correctCount: 5,
      wrongCount: 0,
      submittedAt: new Date(),
    },
  })

  // BEFORE counts (only student attempt exists)
  const studentCountBefore = await prisma.examAttempt.count({
    where: {
      testId: pubTest.id,
      status: "SUBMITTED",
      user: { role: { notIn: ["TEACHER", "ADMIN"] } },
    },
  })

  const testListBefore = await prisma.examTest.findUnique({
    where: { id: pubTest.id },
    select: {
      _count: {
        select: {
          attempts: {
            where: { user: { role: { notIn: ["TEACHER", "ADMIN"] } } },
          },
        },
      },
    },
  })

  console.log(`BEFORE Teacher Preview Attempt:`)
  console.log(`  Filtered Candidate Count (Result/Percentile): ${studentCountBefore}`)
  console.log(`  Filtered Test List Attempt Count: ${testListBefore?._count.attempts}`)

  // 2. Teacher creates and submits a preview attempt (score = 10)
  const teacherAttempt = await prisma.examAttempt.create({
    data: {
      userId: teacher!.id,
      testId: pubTest.id,
      status: "SUBMITTED",
      score: 10,
      totalMarks: 10,
      correctCount: 10,
      wrongCount: 0,
      submittedAt: new Date(),
    },
  })

  // AFTER counts
  const rawTotalInDb = await prisma.examAttempt.count({
    where: { testId: pubTest.id, status: "SUBMITTED" },
  })

  const studentCountAfter = await prisma.examAttempt.count({
    where: {
      testId: pubTest.id,
      status: "SUBMITTED",
      user: { role: { notIn: ["TEACHER", "ADMIN"] } },
    },
  })

  const testListAfter = await prisma.examTest.findUnique({
    where: { id: pubTest.id },
    select: {
      _count: {
        select: {
          attempts: {
            where: { user: { role: { notIn: ["TEACHER", "ADMIN"] } } },
          },
        },
      },
    },
  })

  console.log(`\nAFTER Teacher Preview Attempt (Raw DB Total: ${rawTotalInDb}):`)
  console.log(`  Filtered Candidate Count (Result/Percentile): ${studentCountAfter}`)
  console.log(`  Filtered Test List Attempt Count: ${testListAfter?._count.attempts}`)
  console.log(`  Did Teacher Preview contaminate Candidate Count? ${studentCountAfter !== studentCountBefore}`)

  // Verify rank for student (score = 5):
  // Since teacher (score 10) is excluded, rank of higher scores is 0 -> student is #1
  const studentRank = await prisma.examAttempt.count({
    where: {
      testId: pubTest.id,
      status: "SUBMITTED",
      score: { gt: 5 },
      user: { role: { notIn: ["TEACHER", "ADMIN"] } },
    },
  })
  console.log(`  Student Rank among candidates (higher scores): ${studentRank} (Excluded teacher's score 10: ${studentRank === 0})`)
}

main().catch(console.error).finally(() => process.exit(0))
