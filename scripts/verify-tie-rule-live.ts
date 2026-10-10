import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { request } from "playwright";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL });
const BASE_URL = "http://127.0.0.1:3045";
const PASSWORD = "Pass123!test";

async function main() {
  const nonce = `tie-${Date.now()}`;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const teacher = await prisma.user.create({
    data: { email: `${nonce}-teach@test.local`, name: "Teacher", password: passwordHash, role: "TEACHER" },
  });
  const stu1 = await prisma.user.create({
    data: { email: `${nonce}-stu1@test.local`, name: "Student 1", password: passwordHash, role: "FREE" },
  });
  const stuTie1 = await prisma.user.create({
    data: { email: `${nonce}-tie1@test.local`, name: "Student Tie 1", password: passwordHash, role: "FREE" },
  });
  const stuTie2 = await prisma.user.create({
    data: { email: `${nonce}-tie2@test.local`, name: "Student Tie 2", password: passwordHash, role: "FREE" },
  });
  const stu2 = await prisma.user.create({
    data: { email: `${nonce}-stu2@test.local`, name: "Student 2", password: passwordHash, role: "FREE" },
  });

  const series = await prisma.examSeries.create({
    data: { title: `Series ${nonce}`, slug: `series-${nonce}`, category: "BPSC", examName: "BPSC", isPublished: true, isFree: true, createdById: teacher.id },
  });
  const test = await prisma.examTest.create({
    data: { seriesId: series.id, title: `Tie Test ${nonce}`, durationMinutes: 60, totalMarks: 100, isPublished: true, accessMode: "FREE", createdById: teacher.id },
  });
  const sec = await prisma.examSection.create({
    data: { testId: test.id, title: "S1", order: 1 },
  });
  const q = await prisma.examQuestion.create({
    data: {
      sectionId: sec.id,
      questionEn: "Question 1",
      optionAEn: "A", optionBEn: "B", optionCEn: "C", optionDEn: "D",
      correctOption: "A",
      positiveMarks: 10, negativeMarks: 0, order: 1,
    },
  });

  // Stu 1: score 80, time 100s
  const att1 = await prisma.examAttempt.create({
    data: {
      userId: stu1.id, testId: test.id, status: "SUBMITTED", score: 80, totalMarks: 100,
      timeTakenSecs: 100, startedAt: new Date(Date.now() - 3600000), submittedAt: new Date(Date.now() - 3500000),
      answers: { create: [{ questionId: q.id, selectedOption: "A", isCorrect: true, marksAwarded: 10 }] },
    },
  });

  // Stu Tie 1: score 75, time 120s
  const attTie1 = await prisma.examAttempt.create({
    data: {
      userId: stuTie1.id, testId: test.id, status: "SUBMITTED", score: 75, totalMarks: 100,
      timeTakenSecs: 120, startedAt: new Date(Date.now() - 3400000), submittedAt: new Date(Date.now() - 3300000),
      answers: { create: [{ questionId: q.id, selectedOption: "A", isCorrect: true, marksAwarded: 10 }] },
    },
  });

  // Stu Tie 2: score 75, time 120s (TIED score and time)
  const attTie2 = await prisma.examAttempt.create({
    data: {
      userId: stuTie2.id, testId: test.id, status: "SUBMITTED", score: 75, totalMarks: 100,
      timeTakenSecs: 120, startedAt: new Date(Date.now() - 3200000), submittedAt: new Date(Date.now() - 3100000),
      answers: { create: [{ questionId: q.id, selectedOption: "A", isCorrect: true, marksAwarded: 10 }] },
    },
  });

  // Stu 2: score 70, time 90s (next student)
  const att2 = await prisma.examAttempt.create({
    data: {
      userId: stu2.id, testId: test.id, status: "SUBMITTED", score: 70, totalMarks: 100,
      timeTakenSecs: 90, startedAt: new Date(Date.now() - 3000000), submittedAt: new Date(Date.now() - 2900000),
      answers: { create: [{ questionId: q.id, selectedOption: "A", isCorrect: true, marksAwarded: 10 }] },
    },
  });

  async function authUser(email: string) {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const csrfRes = await ctx.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await ctx.post("/api/auth/callback/credentials", {
      form: { email, password: PASSWORD, csrfToken },
      maxRedirects: 0,
    });
    return ctx;
  }

  const ctx1 = await authUser(stu1.email);
  const ctxTie1 = await authUser(stuTie1.email);
  const ctxTie2 = await authUser(stuTie2.email);
  const ctx2 = await authUser(stu2.email);

  console.log("=== TIE RULE LIVE EXECUTION (1, 2, 2, 4) ===\n");

  // Leaderboard
  const lbRes = await ctx1.get(`/api/exam/${test.id}/leaderboard`);
  const lbData = (await lbRes.json()).data;

  console.log("LEADERBOARD TABLE:");
  console.log(`Total candidates: ${lbData.totalCandidates}`);
  for (const entry of lbData.leaderboard) {
    console.log(`- Candidate: ${entry.name} | Score: ${entry.score} | Time: ${entry.timeTakenSecs}s | Rank: ${entry.rank} | Percentile: ${entry.percentile}%`);
  }

  // Result pages
  console.log("\nINDIVIDUAL RESULT PAGES:");
  const resStu1 = await (await ctx1.get(`/api/exam/attempt/${att1.id}/result`)).json();
  const resTie1 = await (await ctxTie1.get(`/api/exam/attempt/${attTie1.id}/result`)).json();
  const resTie2 = await (await ctxTie2.get(`/api/exam/attempt/${attTie2.id}/result`)).json();
  const resStu2 = await (await ctx2.get(`/api/exam/attempt/${att2.id}/result`)).json();

  console.log(`- Student 1 Result Page:     Rank: #${resStu1.data.allIndiaRank} | Percentile: ${resStu1.data.percentile}% | Total: ${resStu1.data.totalCandidates}`);
  console.log(`- Student Tie 1 Result Page: Rank: #${resTie1.data.allIndiaRank} | Percentile: ${resTie1.data.percentile}% | Total: ${resTie1.data.totalCandidates}`);
  console.log(`- Student Tie 2 Result Page: Rank: #${resTie2.data.allIndiaRank} | Percentile: ${resTie2.data.percentile}% | Total: ${resTie2.data.totalCandidates}`);
  console.log(`- Student 2 Result Page:     Rank: #${resStu2.data.allIndiaRank} | Percentile: ${resStu2.data.percentile}% | Total: ${resStu2.data.totalCandidates}`);

  await ctx1.dispose();
  await ctxTie1.dispose();
  await ctxTie2.dispose();
  await ctx2.dispose();
  await prisma.$disconnect();
}

main().catch(console.error);
