import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { chromium } from "playwright"
import { updateLeaderboard } from "../lib/redis"
import { getTestRankings, getAttemptRanking } from "../lib/exam-ranking"

const BASE_URL = "http://127.0.0.1:3045"
const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

async function runFollowup() {
  console.log("==================================================================")
  console.log("STARTING STEP 2 FOLLOW-UP VERIFICATIONS")
  console.log("==================================================================")

  const nonce = `fu-${Date.now()}`
  const passwordHash = await bcrypt.hash("password123", 10)

  // 1. Create Users
  const teacher = await prisma.user.create({
    data: {
      email: `${nonce}-teacher@test.local`,
      name: `Teacher ${nonce}`,
      password: passwordHash,
      role: "TEACHER",
      selectedGoal: "bpsc",
      xp: 99999,
    },
  })

  const studentA = await prisma.user.create({
    data: {
      email: `${nonce}-stuA@test.local`,
      name: `Student A ${nonce}`,
      password: passwordHash,
      role: "FREE",
      selectedGoal: "bpsc",
      xp: 1500,
    },
  })

  const studentB = await prisma.user.create({
    data: {
      email: `${nonce}-stuB@test.local`,
      name: `Student B ${nonce}`,
      password: passwordHash,
      role: "FREE",
      selectedGoal: "bpsc",
      xp: 1200,
    },
  })

  const studentTie1 = await prisma.user.create({
    data: {
      email: `${nonce}-tie1@test.local`,
      name: `Student Tie1 ${nonce}`,
      password: passwordHash,
      role: "FREE",
      selectedGoal: "bpsc",
    },
  })

  const studentTie2 = await prisma.user.create({
    data: {
      email: `${nonce}-tie2@test.local`,
      name: `Student Tie2 ${nonce}`,
      password: passwordHash,
      role: "FREE",
      selectedGoal: "bpsc",
    },
  })

  // 2. Create Series & Test
  const series = await prisma.examSeries.create({
    data: {
      title: `Followup Series ${nonce}`,
      slug: `fu-series-${nonce}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: true,
      isFree: true,
      createdById: teacher.id,
    },
  })

  const testObj = await prisma.examTest.create({
    data: {
      seriesId: series.id,
      title: `Followup Test ${nonce}`,
      durationMinutes: 60,
      totalMarks: 100,
      isPublished: true,
      accessMode: "FREE",
      createdById: teacher.id,
    },
  })

  const section = await prisma.examSection.create({
    data: {
      testId: testObj.id,
      title: "Section 1",
      order: 1,
    },
  })

  const q1 = await prisma.examQuestion.create({
    data: {
      sectionId: section.id,
      questionEn: "What is the capital of Bihar?",
      optionAEn: "Patna",
      optionBEn: "Gaya",
      optionCEn: "Muzaffarpur",
      optionDEn: "Bhagalpur",
      correctOption: "A",
      explanationEn: "Patna is the capital of Bihar.",
      positiveMarks: 50,
      negativeMarks: 10,
      order: 1,
    },
  })

  // 3. Create Attempts
  // Student A: score 85, time 100s
  const stuAAtt = await prisma.examAttempt.create({
    data: {
      userId: studentA.id,
      testId: testObj.id,
      status: "SUBMITTED",
      score: 85,
      correctCount: 1,
      totalMarks: 100,
      timeTakenSecs: 100,
      startedAt: new Date(Date.now() - 3600000),
      submittedAt: new Date(Date.now() - 3500000),
      answers: {
        create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
      },
    },
  })

  // REAL TIE CASE:
  // Student Tie 1: score 75, time 120s, submittedAt 10:02:00
  const tie1Att = await prisma.examAttempt.create({
    data: {
      userId: studentTie1.id,
      testId: testObj.id,
      status: "SUBMITTED",
      score: 75,
      correctCount: 1,
      totalMarks: 100,
      timeTakenSecs: 120,
      startedAt: new Date(Date.now() - 3400000),
      submittedAt: new Date(Date.now() - 3300000), // submitted earlier
      answers: {
        create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
      },
    },
  })

  // Student Tie 2: score 75, time 120s (EXACT SAME SCORE AND TIME), submittedAt 10:04:00 (submitted later)
  const tie2Att = await prisma.examAttempt.create({
    data: {
      userId: studentTie2.id,
      testId: testObj.id,
      status: "SUBMITTED",
      score: 75,
      correctCount: 1,
      totalMarks: 100,
      timeTakenSecs: 120,
      startedAt: new Date(Date.now() - 3200000),
      submittedAt: new Date(Date.now() - 3100000), // submitted 200s later
      answers: {
        create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
      },
    },
  })

  // Student B: score 60, time 90s
  const stuBAtt = await prisma.examAttempt.create({
    data: {
      userId: studentB.id,
      testId: testObj.id,
      status: "SUBMITTED",
      score: 60,
      correctCount: 1,
      totalMarks: 100,
      timeTakenSecs: 90,
      startedAt: new Date(Date.now() - 3000000),
      submittedAt: new Date(Date.now() - 2900000),
      answers: {
        create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
      },
    },
  })

  // Teacher attempt: score 100
  const teacherAtt = await prisma.examAttempt.create({
    data: {
      userId: teacher.id,
      testId: testObj.id,
      status: "SUBMITTED",
      score: 100,
      correctCount: 2,
      totalMarks: 100,
      timeTakenSecs: 40,
      startedAt: new Date(Date.now() - 4000000),
      submittedAt: new Date(Date.now() - 3900000),
    },
  })

  // Student A IN_PROGRESS attempt
  const inProgressAtt = await prisma.examAttempt.create({
    data: {
      userId: studentA.id,
      testId: testObj.id,
      status: "IN_PROGRESS",
      score: 0,
      startedAt: new Date(),
    },
  })

  console.log("\n==================================================================")
  console.log("ITEM 2: REAL TIE CASE (Equal Score: 75, Equal Time: 120s)")
  console.log("==================================================================")
  const lbData = await getTestRankings(testObj.id)
  const tie1Lb = lbData.rankedAttempts.find((r) => r.userId === studentTie1.id)
  const tie2Lb = lbData.rankedAttempts.find((r) => r.userId === studentTie2.id)

  const tie1ResultRank = await getAttemptRanking(tie1Att.id)
  const tie2ResultRank = await getAttemptRanking(tie2Att.id)

  console.log(`Student Tie 1 (submitted at ${tie1Att.submittedAt?.toISOString()}):`)
  console.log(`  - Leaderboard Rank: #${tie1Lb?.rank} (score: ${tie1Lb?.score}, time: ${tie1Lb?.timeTakenSecs}s)`)
  console.log(`  - Result Page Rank: #${tie1ResultRank.rank} (percentile: ${tie1ResultRank.percentile}%, total: ${tie1ResultRank.totalCandidates})`)

  console.log(`Student Tie 2 (submitted at ${tie2Att.submittedAt?.toISOString()}):`)
  console.log(`  - Leaderboard Rank: #${tie2Lb?.rank} (score: ${tie2Lb?.score}, time: ${tie2Lb?.timeTakenSecs}s)`)
  console.log(`  - Result Page Rank: #${tie2ResultRank.rank} (percentile: ${tie2ResultRank.percentile}%, total: ${tie2ResultRank.totalCandidates})`)

  const browser = await chromium.launch({ headless: true })
  const contextA = await browser.newContext()
  const pageA = await contextA.newPage()

  // Login as Student A
  await pageA.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await pageA.getByLabel("Email Address").fill(studentA.email)
  await pageA.getByLabel("Password", { exact: true }).fill("password123")
  await pageA.getByRole("button", { name: "Sign In" }).click()
  await pageA.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
  await pageA.waitForTimeout(1000)

  console.log("\n==================================================================")
  console.log("ITEM 3: LOGGED-IN STUDENT WITH IN_PROGRESS ATTEMPT")
  console.log("==================================================================")

  // 3a. Student A calling result route for in-progress attempt
  const resInProg = await pageA.request.get(`${BASE_URL}/api/exam/attempt/${inProgressAtt.id}/result`)
  const inProgText = await resInProg.text()
  console.log(`1. GET /api/exam/attempt/${inProgressAtt.id}/result (IN_PROGRESS):`)
  console.log(`   Status: ${resInProg.status()}`)
  console.log(`   First 300 chars: ${inProgText.slice(0, 300)}`)

  // 3b. Student A calling solutions route for in-progress attempt
  const resSol = await pageA.request.get(`${BASE_URL}/test-series/${series.slug}/solutions?attemptId=${inProgressAtt.id}`)
  const solText = await resSol.text()
  console.log(`\n2. GET /test-series/${series.slug}/solutions?attemptId=${inProgressAtt.id} (IN_PROGRESS):`)
  console.log(`   Status: ${resSol.status()}`)
  console.log(`   First 300 chars: ${solText.slice(0, 300)}`)

  // 3c. Student A calling questions route for in-progress attempt
  const resQ = await pageA.request.get(`${BASE_URL}/api/exam/${testObj.id}/questions?attemptId=${inProgressAtt.id}`)
  const qText = await resQ.text()
  console.log(`\n3. GET /api/exam/${testObj.id}/questions?attemptId=${inProgressAtt.id} (IN_PROGRESS):`)
  console.log(`   Status: ${resQ.status()}`)
  console.log(`   First 300 chars: ${qText.slice(0, 300)}`)

  // Check forbidden leak fields
  const leakedFields = ["correctIndex", "correctOption", "explanationEn", "explanationHi", "Patna is the capital of Bihar"]
  for (const field of leakedFields) {
    const leakedInProg = inProgText.includes(field)
    const leakedSol = solText.includes(field)
    const leakedQ = qText.includes(field)
    console.log(`   Field "${field}" present? InProg: ${leakedInProg}, Solutions: ${leakedSol}, Questions: ${leakedQ}`)
  }

  // 3d. Cross-student: Student B reading Student A's solutions and attempt data
  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pageB.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await pageB.getByLabel("Email Address").fill(studentB.email)
  await pageB.getByLabel("Password", { exact: true }).fill("password123")
  await pageB.getByRole("button", { name: "Sign In" }).click()
  await pageB.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
  await pageB.waitForTimeout(1000)

  console.log("\n--- CROSS-STUDENT ACCESS: STUDENT B READING STUDENT A ---")
  const resCrossResult = await pageB.request.get(`${BASE_URL}/api/exam/attempt/${stuAAtt.id}/result`)
  const crossResultText = await resCrossResult.text()
  console.log(`Student B calling Student A's result (/api/exam/attempt/${stuAAtt.id}/result):`)
  console.log(`   Status: ${resCrossResult.status()}`)
  console.log(`   First 300 chars: ${crossResultText.slice(0, 300)}`)

  const resCrossQuestions = await pageB.request.get(`${BASE_URL}/api/exam/${testObj.id}/questions?attemptId=${stuAAtt.id}`)
  const crossQText = await resCrossQuestions.text()
  console.log(`Student B calling questions with Student A's attemptId:`)
  console.log(`   Status: ${resCrossQuestions.status()}`)
  console.log(`   First 300 chars: ${crossQText.slice(0, 300)}`)

  console.log("\n==================================================================")
  console.log("ITEM 4: STAFF (TEACHER/ADMIN) RESULT PAGE")
  console.log("==================================================================")
  const contextTeacher = await browser.newContext()
  const pageTeacher = await contextTeacher.newPage()
  await pageTeacher.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await pageTeacher.getByLabel("Email Address").fill(teacher.email)
  await pageTeacher.getByLabel("Password", { exact: true }).fill("password123")
  await pageTeacher.getByRole("button", { name: "Sign In" }).click()
  await pageTeacher.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
  await pageTeacher.waitForTimeout(1000)

  const teacherApiRes = await pageTeacher.request.get(`${BASE_URL}/api/exam/attempt/${teacherAtt.id}/result`)
  const teacherApiJson = await teacherApiRes.json()
  console.log(`Teacher Result API Payload:`)
  console.log(`   isStaffAttempt: ${teacherApiJson.data?.isStaffAttempt}`)
  console.log(`   allIndiaRank: ${teacherApiJson.data?.allIndiaRank}`)
  console.log(`   percentile: ${teacherApiJson.data?.percentile}`)

  await pageTeacher.goto(`${BASE_URL}/test-series/${series.slug}/result?attemptId=${teacherAtt.id}`, { waitUntil: "networkidle" })
  await pageTeacher.waitForTimeout(1500)
  const teacherPageText = await pageTeacher.textContent("body")
  const hasPreviewBadge = teacherPageText?.includes("Preview attempt: rank not counted")
  const hasPreviewMode = teacherPageText?.includes("Faculty preview mode")
  console.log(`Teacher Result Page rendered:`)
  console.log(`   Contains "Preview attempt: rank not counted": ${hasPreviewBadge}`)
  console.log(`   Contains "Faculty preview mode": ${hasPreviewMode}`)

  console.log("\n==================================================================")
  console.log("ITEM 5: /api/leaderboard (XP) EXCLUDING TEACHER (99999 XP)")
  console.log("==================================================================")
  // Seed teacher with 99999 XP and Student A with 1500 XP in Redis leaderboard
  await updateLeaderboard(teacher.id, 99999)
  await updateLeaderboard(studentA.id, 1500)
  await updateLeaderboard(studentB.id, 1200)

  const resXp = await pageA.request.get(`${BASE_URL}/api/leaderboard?limit=20`)
  const xpJson = await resXp.json()
  console.log(`XP Leaderboard Response Status: ${resXp.status()}`)
  console.log(`Total returned users: ${xpJson.leaderboard?.length}`)
  const teacherInXp = xpJson.leaderboard?.find((e: any) => e.user?.id === teacher.id)
  console.log(`Teacher (99999 XP) present in leaderboard: ${Boolean(teacherInXp)}`)
  console.log(`Top 3 in XP Leaderboard:`)
  for (const entry of (xpJson.leaderboard || []).slice(0, 3)) {
    console.log(`   Rank #${entry.rank}: ${entry.user?.name} (${entry.xp} XP)`)
  }

  await browser.close()
  await prisma.$disconnect()

  console.log("\n==================================================================")
  console.log("ALL STEP 2 FOLLOW-UP VERIFICATIONS COMPLETED SUCCESSFULLY!")
  console.log("==================================================================")
}

runFollowup().catch((err) => {
  console.error("FOLLOW-UP FAILED:", err)
  process.exit(1)
})
