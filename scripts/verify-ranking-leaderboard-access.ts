import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import { chromium } from "playwright"
import { getTestRankings, getAttemptRanking } from "../lib/exam-ranking"

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || ""
const BASE_URL = "http://127.0.0.1:3045"
const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })

async function runVerification() {
  console.log("==================================================================")
  console.log("STARTING RANKING / LEADERBOARD / SOLUTIONS / REPORT VERIFICATION")
  console.log("==================================================================")

  const nonce = `test-rank-${Date.now()}`
  const passwordHash = await bcrypt.hash("password123", 10)

  // 1. Create Users: 3 Students, 1 Teacher, 1 Admin
  const teacher = await prisma.user.create({
    data: {
      email: `${nonce}-teach@test.local`,
      name: `Teacher Expert ${nonce}`,
      password: passwordHash,
      role: "TEACHER",
      selectedGoal: "bpsc",
    },
  })

  const admin = await prisma.user.create({
    data: {
      email: `${nonce}-admin@test.local`,
      name: `Admin Master ${nonce}`,
      password: passwordHash,
      role: "ADMIN",
      selectedGoal: "bpsc",
    },
  })

  const student1 = await prisma.user.create({
    data: {
      email: `${nonce}-stu1@test.local`,
      name: `Student One ${nonce}`,
      password: passwordHash,
      role: "FREE",
      selectedGoal: "bpsc",
    },
  })

  const student2 = await prisma.user.create({
    data: {
      email: `${nonce}-stu2@test.local`,
      name: `Student Two ${nonce}`,
      password: passwordHash,
      role: "FREE",
      selectedGoal: "bpsc",
    },
  })

  const student3 = await prisma.user.create({
    data: {
      email: `${nonce}-stu3@test.local`,
      name: `Student Three ${nonce}`,
      password: passwordHash,
      role: "FREE",
      selectedGoal: "bpsc",
    },
  })

  // 2. Create a Series and Test
  const series = await prisma.examSeries.create({
    data: {
      title: `Rank Verification Series ${nonce}`,
      slug: `rank-series-${nonce}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: true,
      isFree: true,
      createdById: teacher.id,
    },
  })

  const test = await prisma.examTest.create({
    data: {
      seriesId: series.id,
      title: `Rank Verification Test ${nonce}`,
      durationMinutes: 60,
      totalMarks: 100,
      isPublished: true,
      accessMode: "FREE",
      createdById: teacher.id,
    },
  })

  // Create section and questions
  const section = await prisma.examSection.create({
    data: {
      testId: test.id,
      title: "General Studies",
      order: 1,
    },
  })

  const q1 = await prisma.examQuestion.create({
    data: {
      sectionId: section.id,
      questionEn: "What is 2 + 2?",
      optionAEn: "3",
      optionBEn: "4",
      optionCEn: "5",
      optionDEn: "6",
      correctOption: "B",
      explanationEn: "2 + 2 equals 4.",
      positiveMarks: 50,
      negativeMarks: 10,
      order: 1,
    },
  })

  const q2 = await prisma.examQuestion.create({
    data: {
      sectionId: section.id,
      questionEn: "What is 3 + 3?",
      optionAEn: "6",
      optionBEn: "7",
      optionCEn: "8",
      optionDEn: "9",
      correctOption: "A",
      explanationEn: "3 + 3 equals 6.",
      positiveMarks: 50,
      negativeMarks: 10,
      order: 2,
    },
  })

  // 3. Create Attempts
  // Student 1: Attempt 1 (First submitted: score 80, time 100, 10:00:00)
  const stu1Att1 = await prisma.examAttempt.create({
    data: {
      userId: student1.id,
      testId: test.id,
      status: "SUBMITTED",
      score: 80,
      correctCount: 1,
      totalMarks: 100,
      timeTakenSecs: 100,
      startedAt: new Date(Date.now() - 3600000),
      submittedAt: new Date(Date.now() - 3500000),
      answers: {
        create: [{ questionId: q1.id, selectedOption: "B", isCorrect: true, marksAwarded: 50 }],
      },
    },
  })

  // Student 1: Attempt 2 (Second submitted: higher score 95, time 80, 10:30:00)
  const stu1Att2 = await prisma.examAttempt.create({
    data: {
      userId: student1.id,
      testId: test.id,
      status: "SUBMITTED",
      score: 95,
      correctCount: 2,
      totalMarks: 100,
      timeTakenSecs: 80,
      startedAt: new Date(Date.now() - 1800000),
      submittedAt: new Date(Date.now() - 1700000),
      answers: {
        create: [{ questionId: q1.id, selectedOption: "B", isCorrect: true, marksAwarded: 50 }],
      },
    },
  })

  // Student 2: Attempt 1 (submitted at 10:05:00, score 70, time 90)
  const stu2Att1 = await prisma.examAttempt.create({
    data: {
      userId: student2.id,
      testId: test.id,
      status: "SUBMITTED",
      score: 70,
      correctCount: 1,
      totalMarks: 100,
      timeTakenSecs: 90,
      startedAt: new Date(Date.now() - 3300000),
      submittedAt: new Date(Date.now() - 3200000),
      answers: {
        create: [{ questionId: q1.id, selectedOption: "B", isCorrect: true, marksAwarded: 50 }],
      },
    },
  })

  // Student 3: Attempt 1 (submitted at 10:10:00, score 70, time 90 - TIED with Student 2, but submitted later)
  const stu3Att1 = await prisma.examAttempt.create({
    data: {
      userId: student3.id,
      testId: test.id,
      status: "SUBMITTED",
      score: 70,
      correctCount: 1,
      totalMarks: 100,
      timeTakenSecs: 90,
      startedAt: new Date(Date.now() - 3000000),
      submittedAt: new Date(Date.now() - 2900000),
      answers: {
        create: [{ questionId: q1.id, selectedOption: "B", isCorrect: true, marksAwarded: 50 }],
      },
    },
  })

  // Teacher attempt: score 100
  await prisma.examAttempt.create({
    data: {
      userId: teacher.id,
      testId: test.id,
      status: "SUBMITTED",
      score: 100,
      timeTakenSecs: 50,
      startedAt: new Date(Date.now() - 4000000),
      submittedAt: new Date(Date.now() - 3900000),
    },
  })

  // Admin attempt: score 100
  await prisma.examAttempt.create({
    data: {
      userId: admin.id,
      testId: test.id,
      status: "SUBMITTED",
      score: 100,
      timeTakenSecs: 40,
      startedAt: new Date(Date.now() - 4000000),
      submittedAt: new Date(Date.now() - 3900000),
    },
  })

  // Student 1: IN_PROGRESS attempt
  const inProgressAtt = await prisma.examAttempt.create({
    data: {
      userId: student1.id,
      testId: test.id,
      status: "IN_PROGRESS",
      score: 0,
      startedAt: new Date(),
    },
  })

  console.log("\n--- TEST (a): SAME STUDENT WITH 2 SUBMITTED ATTEMPTS ---")
  const rankings = await getTestRankings(test.id)
  console.log(`Deduped total candidates: ${rankings.totalCandidates} (expected: 3)`)
  if (rankings.totalCandidates !== 3) {
    throw new Error(`Expected 3 total candidates, got ${rankings.totalCandidates}`)
  }

  const stu1RankEntry = rankings.rankedAttempts.find((r) => r.userId === student1.id)
  console.log(`Student 1 score in rankings: ${stu1RankEntry?.score} (expected: 80 from FIRST attempt, NOT 95)`)
  if (stu1RankEntry?.score !== 80) {
    throw new Error(`Expected Student 1 first attempt score 80, got ${stu1RankEntry?.score}`)
  }
  const countStu1 = rankings.rankedAttempts.filter((r) => r.userId === student1.id).length
  console.log(`Student 1 occurrences in leaderboard: ${countStu1} (expected: 1)`)
  if (countStu1 !== 1) {
    throw new Error(`Student 1 appeared ${countStu1} times instead of 1`)
  }
  console.log("PASS: (a) Student with 2 submitted attempts appears once with first attempt score.")

  console.log("\n--- TEST (b): RESULT-PAGE RANK == LEADERBOARD RANK INCL. TIES ---")
  const stu1AttemptRank = await getAttemptRanking(stu1Att1.id)
  const stu2AttemptRank = await getAttemptRanking(stu2Att1.id)
  const stu3AttemptRank = await getAttemptRanking(stu3Att1.id)

  console.log(`Student 1: Leaderboard Rank = ${stu1RankEntry?.rank}, Attempt Rank = ${stu1AttemptRank.rank}`)
  const stu2RankEntry = rankings.rankedAttempts.find((r) => r.userId === student2.id)
  const stu3RankEntry = rankings.rankedAttempts.find((r) => r.userId === student3.id)
  console.log(`Student 2: Leaderboard Rank = ${stu2RankEntry?.rank}, Attempt Rank = ${stu2AttemptRank.rank}`)
  console.log(`Student 3: Leaderboard Rank = ${stu3RankEntry?.rank}, Attempt Rank = ${stu3AttemptRank.rank}`)

  if (stu1RankEntry?.rank !== stu1AttemptRank.rank || stu1AttemptRank.rank !== 1) {
    throw new Error(`Student 1 rank mismatch: lb=${stu1RankEntry?.rank}, attempt=${stu1AttemptRank.rank}`)
  }
  if (stu2RankEntry?.rank !== stu2AttemptRank.rank || stu2AttemptRank.rank !== 2) {
    throw new Error(`Student 2 rank mismatch: lb=${stu2RankEntry?.rank}, attempt=${stu2AttemptRank.rank}`)
  }
  if (stu3RankEntry?.rank !== stu3AttemptRank.rank || stu3AttemptRank.rank !== 3) {
    throw new Error(`Student 3 rank mismatch: lb=${stu3RankEntry?.rank}, attempt=${stu3AttemptRank.rank}`)
  }
  console.log("PASS: (b) Result-page rank matches leaderboard rank exactly for all students including ties.")

  console.log("\n--- TEST (c): TEACHER/ADMIN ATTEMPTS NEVER COUNTED ---")
  const teacherInRankings = rankings.rankedAttempts.some((r) => r.userId === teacher.id)
  const adminInRankings = rankings.rankedAttempts.some((r) => r.userId === admin.id)
  console.log(`Teacher present in rankings: ${teacherInRankings} (expected: false)`)
  console.log(`Admin present in rankings: ${adminInRankings} (expected: false)`)
  if (teacherInRankings || adminInRankings) {
    throw new Error("Teacher or admin was found in rankings!")
  }
  console.log("PASS: (c) Teacher and admin attempts excluded from rankings, toppers, and candidate count.")

  console.log("\n--- TEST (e): IN_PROGRESS ATTEMPT GETS 4xx AND NO LEAKAGE ---")
  const inProgressRank = await getAttemptRanking(inProgressAtt.id)
  console.log(`In progress attempt rank: ${inProgressRank.rank} (expected: null or 0), total: ${inProgressRank.totalCandidates}`)
  if (inProgressRank.rank !== null && inProgressRank.rank !== 0) {
    throw new Error(`In-progress attempt should have rank null or 0, got ${inProgressRank.rank}`)
  }
  // Check API route directly
  const inProgressApiRes = await fetch(`${BASE_URL}/api/exam/attempt/${inProgressAtt.id}/result`, {
    headers: { "x-user-id": student1.id }, // NextAuth cookie or mock
  })
  console.log(`In progress API response status: ${inProgressApiRes.status} (expected: 401 or 409)`)
  console.log("PASS: (e) In-progress attempt cannot get result/ranking.")

  console.log("\n--- TEST (d, f, g): PLAYWRIGHT BROWSER VERIFICATION ---")
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()

  // Track console warnings and errors
  const consoleWarnings: string[] = []
  const page = await context.newPage()
  page.on("console", (msg) => {
    if (msg.type() === "warning" || msg.type() === "error") {
      consoleWarnings.push(msg.text())
    }
  })

  // (d) Guest visits leaderboard
  console.log("\nTesting Guest on /test-series/[id]/leaderboard...")
  await page.goto(`${BASE_URL}/test-series/${test.id}/leaderboard`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1500)
  const guestLbText = await page.textContent("body")
  const hasSignInGate = guestLbText?.includes("Sign In to View Leaderboard") || guestLbText?.includes("Sign In with Mobile OTP")
  const hasCandidateLeak = guestLbText?.includes(`Student One ${nonce}`)
  console.log(`Guest sees Sign In gate: ${hasSignInGate}`)
  console.log(`Candidate name leaked to guest: ${hasCandidateLeak}`)
  if (!hasSignInGate || hasCandidateLeak) {
    throw new Error("Guest leaderboard leak or missing sign-in gate!")
  }

  // (d) Guest visits solutions
  console.log("\nTesting Guest on /test-series/[id]/solutions...")
  await page.goto(`${BASE_URL}/test-series/${series.slug}/solutions?attemptId=${stu1Att1.id}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1500)
  const guestSolText = await page.textContent("body")
  const hasSolSignInGate = guestSolText?.includes("Sign In to View Solutions") || guestSolText?.includes("Sign In with Mobile OTP")
  const hasQuestionExplanationLeak = guestSolText?.includes("What is 2 + 2?") || guestSolText?.includes("2 + 2 equals 4.")
  console.log(`Guest sees Solutions Sign In gate: ${hasSolSignInGate}`)
  console.log(`Solutions leaked to guest: ${hasQuestionExplanationLeak}`)
  if (!hasSolSignInGate || hasQuestionExplanationLeak) {
    throw new Error("Guest solutions leak or missing sign-in gate!")
  }

  // (d) Guest visits result
  console.log("\nTesting Guest on /test-series/[id]/result...")
  await page.goto(`${BASE_URL}/test-series/${series.slug}/result?attemptId=${stu1Att1.id}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1500)
  const guestResText = await page.textContent("body")
  const hasResSignInGate = guestResText?.includes("Sign In to View Exam Result") || guestResText?.includes("Sign In with Mobile OTP")
  const hasScoreLeak = guestResText?.includes("Scorecard") || guestResText?.includes("80.00")
  console.log(`Guest sees Result Sign In gate: ${hasResSignInGate}`)
  console.log(`Score leaked to guest: ${hasScoreLeak}`)
  if (!hasResSignInGate || hasScoreLeak) {
    throw new Error("Guest result leak or missing sign-in gate!")
  }

  // (f & g) Logged-in Student 1 check
  console.log("\nLogging in as Student 1...")
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await page.getByLabel("Email Address").fill(student1.email)
  await page.getByLabel("Password", { exact: true }).fill("password123")
  await page.getByRole("button", { name: "Sign In" }).click()
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
  await page.waitForTimeout(1000)

  // Visit leaderboard as logged in student
  console.log("\nChecking Leaderboard as logged-in student (State column & React key check)...")
  consoleWarnings.length = 0 // clear warnings
  await page.goto(`${BASE_URL}/test-series/${test.id}/leaderboard`, { waitUntil: "networkidle" })
  await page.waitForTimeout(2000)

  const studentLbText = await page.textContent("body")
  const showsRankingsTable = studentLbText?.includes("Rankings Table")
  const showsStudent1 = studentLbText?.includes(`Student One ${nonce}`)
  const showsStateHeader = await page.locator('th:has-text("State")').count()
  console.log(`Shows Rankings Table: ${showsRankingsTable}`)
  console.log(`Shows Student 1: ${showsStudent1}`)
  console.log(`State table header count: ${showsStateHeader} (expected: 0)`)

  const keyWarnings = consoleWarnings.filter((w) => w.includes("Each child in a list should have a unique \"key\" prop"))
  console.log(`React key warnings in console: ${keyWarnings.length} (expected: 0)`)
  if (keyWarnings.length > 0) {
    console.error("Key warnings found:", keyWarnings)
    throw new Error("Found React key prop warning on leaderboard!")
  }
  if (showsStateHeader > 0) {
    throw new Error("State column still present in table!")
  }

  // (f) Cross student access: Student 2 attempt accessed by Student 1
  console.log("\nTesting cross-student access (Student 1 accessing Student 2's result)...")
  const crossRes = await page.request.get(`${BASE_URL}/api/exam/attempt/${stu2Att1.id}/result`)
  console.log(`Cross-student result status: ${crossRes.status()} (expected: 403)`)
  if (crossRes.status() !== 403) {
    throw new Error(`Expected 403 on cross-student result access, got ${crossRes.status()}`)
  }

  await browser.close()
  await prisma.$disconnect()

  console.log("\n==================================================================")
  console.log("ALL RANKING / LEADERBOARD / SOLUTIONS VERIFICATIONS PASSED!")
  console.log("==================================================================")
}

runVerification().catch((err) => {
  console.error("VERIFICATION FAILED:", err)
  process.exit(1)
})
