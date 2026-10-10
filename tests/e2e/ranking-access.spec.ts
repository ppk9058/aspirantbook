import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
}

import { test, expect } from "@playwright/test";
import { prisma, PASSWORD, slugFor, newNonce, loginThroughUi } from "./test-series-e2e-helpers";
import bcrypt from "bcryptjs";
import { getAttemptRanking } from "../../lib/exam-ranking";

test.describe("Ranking, Leaderboard, Solutions, and Access Rules", () => {
  test.setTimeout(120_000);

  let nonce: string;
  let series: any;
  let testObj: any;
  let student1: any;
  let student2: any;
  let studentTie1: any;
  let studentTie2: any;
  let teacher: any;
  let admin: any;
  let stu1Att1: any;
  let stu1Att2: any;
  let stuTie1Att: any;
  let stuTie2Att: any;
  let stu2Att: any;
  let teacherAtt: any;
  let inProgressAtt: any;

  test.beforeAll(async () => {
    nonce = newNonce();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // 1. Create Users
    teacher = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-teacher@test.local`,
        name: `Teacher ${nonce}`,
        password: passwordHash,
        role: "TEACHER",
        selectedGoal: "bpsc",
      },
    });

    admin = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-admin@test.local`,
        name: `Admin ${nonce}`,
        password: passwordHash,
        role: "ADMIN",
        selectedGoal: "bpsc",
      },
    });

    student1 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu1@test.local`,
        name: `Student One ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    });

    student2 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu2@test.local`,
        name: `Student Two ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    });

    studentTie1 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-tie1@test.local`,
        name: `Student Tie1 ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    });

    studentTie2 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-tie2@test.local`,
        name: `Student Tie2 ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    });

    // 2. Create Series & Test
    series = await prisma.examSeries.create({
      data: {
        title: `E2E Series ${nonce}`,
        slug: `e2e-series-${slugFor(nonce)}`,
        category: "BPSC",
        examName: "BPSC",
        isPublished: true,
        isFree: true,
        createdById: teacher.id,
      },
    });

    testObj = await prisma.examTest.create({
      data: {
        seriesId: series.id,
        title: `E2E Test ${nonce}`,
        durationMinutes: 60,
        totalMarks: 100,
        isPublished: true,
        accessMode: "FREE",
        createdById: teacher.id,
      },
    });

    const section = await prisma.examSection.create({
      data: {
        testId: testObj.id,
        title: "Section 1",
        order: 1,
      },
    });

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
    });

    const q2 = await prisma.examQuestion.create({
      data: {
        sectionId: section.id,
        questionEn: "Which river flows through Patna?",
        optionAEn: "Yamuna",
        optionBEn: "Ganga",
        optionCEn: "Godavari",
        optionDEn: "Kaveri",
        correctOption: "B",
        explanationEn: "The Ganga flows through Patna.",
        positiveMarks: 50,
        negativeMarks: 10,
        order: 2,
      },
    });

    // 3. Create Attempts:
    // Student 1: Attempt 1 (First submitted: score 80, time 100, submittedAt 10:00:00)
    stu1Att1 = await prisma.examAttempt.create({
      data: {
        userId: student1.id,
        testId: testObj.id,
        status: "SUBMITTED",
        score: 80,
        correctCount: 1,
        totalMarks: 100,
        timeTakenSecs: 100,
        startedAt: new Date(Date.now() - 3600000),
        submittedAt: new Date(Date.now() - 3500000),
        answers: {
          create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
        },
      },
    });

    // Student 1: Attempt 2 (Second submitted: higher score 95, time 80, submittedAt 10:30:00)
    stu1Att2 = await prisma.examAttempt.create({
      data: {
        userId: student1.id,
        testId: testObj.id,
        status: "SUBMITTED",
        score: 95,
        correctCount: 2,
        totalMarks: 100,
        timeTakenSecs: 80,
        startedAt: new Date(Date.now() - 1800000),
        submittedAt: new Date(Date.now() - 1700000),
        answers: {
          create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
        },
      },
    });

    // Student Tie 1: score 75, time 120, submittedAt 10:02:00
    stuTie1Att = await prisma.examAttempt.create({
      data: {
        userId: studentTie1.id,
        testId: testObj.id,
        status: "SUBMITTED",
        score: 75,
        correctCount: 1,
        totalMarks: 100,
        timeTakenSecs: 120,
        startedAt: new Date(Date.now() - 3400000),
        submittedAt: new Date(Date.now() - 3300000),
        answers: {
          create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
        },
      },
    });

    // Student Tie 2: score 75, time 120 (TIE score & time), submittedAt 10:04:00 (later than Tie 1)
    stuTie2Att = await prisma.examAttempt.create({
      data: {
        userId: studentTie2.id,
        testId: testObj.id,
        status: "SUBMITTED",
        score: 75,
        correctCount: 1,
        totalMarks: 100,
        timeTakenSecs: 120,
        startedAt: new Date(Date.now() - 3200000),
        submittedAt: new Date(Date.now() - 3100000),
        answers: {
          create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
        },
      },
    });

    // Student 2: score 70, time 90, submittedAt 10:05:00
    stu2Att = await prisma.examAttempt.create({
      data: {
        userId: student2.id,
        testId: testObj.id,
        status: "SUBMITTED",
        score: 70,
        correctCount: 1,
        totalMarks: 100,
        timeTakenSecs: 90,
        startedAt: new Date(Date.now() - 3000000),
        submittedAt: new Date(Date.now() - 2900000),
        answers: {
          create: [{ questionId: q1.id, selectedOption: "A", isCorrect: true, marksAwarded: 50 }],
        },
      },
    });

    // Teacher attempt: score 100
    teacherAtt = await prisma.examAttempt.create({
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
    });

    // Admin attempt: score 100
    await prisma.examAttempt.create({
      data: {
        userId: admin.id,
        testId: testObj.id,
        status: "SUBMITTED",
        score: 100,
        correctCount: 2,
        totalMarks: 100,
        timeTakenSecs: 30,
        startedAt: new Date(Date.now() - 4000000),
        submittedAt: new Date(Date.now() - 3900000),
      },
    });

    // Student 1 IN_PROGRESS attempt
    inProgressAtt = await prisma.examAttempt.create({
      data: {
        userId: student1.id,
        testId: testObj.id,
        status: "IN_PROGRESS",
        score: 0,
        startedAt: new Date(),
      },
    });
  });

  test("1. Leaderboard API excludes staff, deduplicates attempts to first score, and resolves ties deterministically", async ({ page }) => {
    // Authenticate as student 1 so request is authorized
    await page.context().clearCookies();
    await loginThroughUi(page, student1.email);

    // Call leaderboard endpoint
    const res = await page.request.get(`/api/exam/${testObj.id}/leaderboard`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data;

    // Total candidates must be exactly 4 (Student 1, Tie 1, Tie 2, Student 2)
    // Teacher and Admin must NOT be counted (would be 6 if counted, or 7 with second attempt)
    expect(data.totalCandidates).toBe(4);
    expect(data.leaderboard).toHaveLength(4);

    // Verify Teacher and Admin are not in leaderboard
    const teacherInList = data.leaderboard.some((e: any) => e.userId === teacher.id);
    const adminInList = data.leaderboard.some((e: any) => e.userId === admin.id);
    expect(teacherInList).toBe(false);
    expect(adminInList).toBe(false);

    // Verify Student 1 appears once with first attempt score (80, not 95)
    const stu1Entries = data.leaderboard.filter((e: any) => e.userId === student1.id);
    expect(stu1Entries).toHaveLength(1);
    expect(stu1Entries[0].score).toBe(80);
    expect(stu1Entries[0].rank).toBe(1);

    // Real TIE case:
    // Tie 1 and Tie 2 have identical score (75) and identical time (120s)
    // Equal score AND equal timeTakenSecs = SAME rank; next rank skips (1, 2, 2, 4)
    const tie1Entry = data.leaderboard.find((e: any) => e.userId === studentTie1.id);
    const tie2Entry = data.leaderboard.find((e: any) => e.userId === studentTie2.id);
    expect(tie1Entry).toBeDefined();
    expect(tie2Entry).toBeDefined();
    expect(tie1Entry.score).toBe(75);
    expect(tie2Entry.score).toBe(75);
    expect(tie1Entry.rank).toBe(2);
    expect(tie2Entry.rank).toBe(2);

    // Student 2 has score 70 -> Rank 4 (skips 3)
    const stu2Entry = data.leaderboard.find((e: any) => e.userId === student2.id);
    expect(stu2Entry.rank).toBe(4);
  });

  test("2. Result page rank matches leaderboard rank identically for every student including real tie", async ({ browser }) => {
    // 1. Check direct authoritative ranking helper for exact identity across attempts
    const stu1Rank = await getAttemptRanking(stu1Att1.id);
    const tie1Rank = await getAttemptRanking(stuTie1Att.id);
    const tie2Rank = await getAttemptRanking(stuTie2Att.id);
    const stu2Rank = await getAttemptRanking(stu2Att.id);

    expect(stu1Rank.rank).toBe(1);
    expect(tie1Rank.rank).toBe(2);
    expect(tie2Rank.rank).toBe(2);
    expect(stu2Rank.rank).toBe(4);

    expect(stu1Rank.totalCandidates).toBe(4);
    expect(tie1Rank.totalCandidates).toBe(4);
    expect(tie2Rank.totalCandidates).toBe(4);
    expect(stu2Rank.totalCandidates).toBe(4);

    // 2. HTTP Verification: Log in as Student Tie 1 in isolated context
    const ctx1 = await browser.newContext();
    const p1 = await ctx1.newPage();
    await loginThroughUi(p1, studentTie1.email);

    const tie1Res = await p1.request.get(`/api/exam/attempt/${stuTie1Att.id}/result`);
    expect(tie1Res.status()).toBe(200);
    const tie1Data = (await tie1Res.json()).data;
    expect(tie1Data.allIndiaRank).toBe(2);
    expect(tie1Data.totalCandidates).toBe(4);
    expect(tie1Data.percentile).toBe(75);
    await ctx1.close();

    // 3. Log in as Student Tie 2 in isolated context (must match Tie 1)
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await loginThroughUi(p2, studentTie2.email);

    const tie2Res = await p2.request.get(`/api/exam/attempt/${stuTie2Att.id}/result`);
    expect(tie2Res.status()).toBe(200);
    const tie2Data = (await tie2Res.json()).data;
    expect(tie2Data.allIndiaRank).toBe(2);
    expect(tie2Data.totalCandidates).toBe(4);
    expect(tie2Data.percentile).toBe(75);
    await ctx2.close();

    // 4. Log in as Student 2 in isolated context (must be rank 4, skipped 3)
    const ctx3 = await browser.newContext();
    const p3 = await ctx3.newPage();
    await loginThroughUi(p3, student2.email);

    const stu2Res = await p3.request.get(`/api/exam/attempt/${stu2Att.id}/result`);
    expect(stu2Res.status()).toBe(200);
    const stu2Data = (await stu2Res.json()).data;
    expect(stu2Data.allIndiaRank).toBe(4);
    expect(stu2Data.totalCandidates).toBe(4);
    expect(stu2Data.percentile).toBe(25);
    await ctx3.close();
  });

  test("3. Guest cannot see leaderboard, solutions or result: receives login gate and no data leaks", async ({ page }) => {
    // Guest on Leaderboard
    await page.goto(`/test-series/${testObj.id}/leaderboard`);
    await expect(page.locator("body")).toContainText("Sign In to View Leaderboard", { timeout: 15000 });
    expect(await page.textContent("body")).not.toContain(student1.name);

    // Guest on Solutions
    await page.goto(`/test-series/${series.slug}/solutions?attemptId=${stu1Att1.id}`);
    await expect(page.locator("body")).toContainText("Sign In to View Solutions", { timeout: 15000 });
    expect(await page.textContent("body")).not.toContain("What is the capital of Bihar?");

    // Guest on Result
    await page.goto(`/test-series/${series.slug}/result?attemptId=${stu1Att1.id}`);
    await expect(page.locator("body")).toContainText("Sign In to View Exam Result", { timeout: 15000 });
    expect(await page.textContent("body")).not.toContain("80.00");
  });

  test("4. Staff (TEACHER/ADMIN) result page displays 'Preview attempt: rank not counted'", async ({ page }) => {
    // Login as Teacher
    await page.context().clearCookies();
    await loginThroughUi(page, teacher.email);

    // Visit Teacher's result page
    await page.goto(`/test-series/${series.slug}/result?attemptId=${teacherAtt.id}`);
    await expect(page.locator("body")).toContainText("Preview attempt: rank not counted", { timeout: 15000 });
    await expect(page.locator("body")).toContainText("Faculty preview mode", { timeout: 15000 });
  });

  test("5. IN_PROGRESS attempt returns 409, submit route yields canonical rank, and questions route does not reveal answers", async ({ page, request }) => {
    test.setTimeout(180_000);
    // 1. Log in as Student 1
    await page.context().clearCookies();
    await loginThroughUi(page, student1.email);

    // 2. Student 1 calls result for in-progress attempt -> 409
    const inProgRes = await page.request.get(`/api/exam/attempt/${inProgressAtt.id}/result`);
    expect(inProgRes.status()).toBe(409);
    const inProgJson = await inProgRes.json();
    expect(inProgJson.error).toMatch(/in progress|not been submitted/i);

    // 3. Student 1 visits solutions for in-progress attempt -> solutions not available
    await page.goto(`/test-series/${series.slug}/solutions?attemptId=${inProgressAtt.id}`);
    await expect(page.locator("body")).toContainText("This attempt has not been submitted yet", { timeout: 15000 });
    const solText = await page.textContent("body");
    expect(solText).not.toContain("Patna is the capital of Bihar");

    // 4. Student 1 calls /api/exam/[testId]/questions without active attemptId -> 403
    const qNoAttemptRes = await page.request.get(`/api/exam/${testObj.id}/questions`);
    expect(qNoAttemptRes.status()).toBe(403);

    // 5. Student 1 calls /api/exam/[testId]/questions with active attemptId -> 200, no correct answers/explanations
    const qRes = await page.request.get(`/api/exam/${testObj.id}/questions?attemptId=${inProgressAtt.id}`);
    expect(qRes.status()).toBe(200);
    const qBody = await qRes.text();
    expect(qBody).not.toContain("correctOption");
    expect(qBody).not.toContain("explanationEn");
    expect(qBody).not.toContain("Patna is the capital of Bihar");

    // 6. Submit the in-progress attempt and verify canonical ranking (allIndiaRank = 1, totalCandidates = 4)
    const submitRes = await page.request.post(`/api/exam/attempt/${inProgressAtt.id}/submit`, {
      data: { answers: [] },
    });
    expect(submitRes.status()).toBe(200);
    const submitData = (await submitRes.json()).data;
    expect(submitData.totalCandidates).toBe(4);
    expect(submitData.allIndiaRank).toBe(1);

    // 7. Cross-student access: Student 1 attempts to read Student 2's attempt result -> 403
    const crossRes = await page.request.get(`/api/exam/attempt/${stu2Att.id}/result`);
    expect(crossRes.status()).toBe(403);

    // 8. Cross-student access: Student 1 attempts to use Student 2's attempt for questions -> 403
    const crossQRes = await page.request.get(`/api/exam/${testObj.id}/questions?attemptId=${stu2Att.id}`);
    expect(crossQRes.status()).toBe(403);
  });
});
