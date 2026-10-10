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
  const nonce = `leak-${Date.now()}`;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const teacher = await prisma.user.create({
    data: { email: `${nonce}-teach@test.local`, name: "Teacher", password: passwordHash, role: "TEACHER" },
  });
  const studentA = await prisma.user.create({
    data: { email: `${nonce}-stuA@test.local`, name: "Student A", password: passwordHash, role: "FREE" },
  });
  const studentB = await prisma.user.create({
    data: { email: `${nonce}-stuB@test.local`, name: "Student B", password: passwordHash, role: "FREE" },
  });

  const series = await prisma.examSeries.create({
    data: { title: `Series ${nonce}`, slug: `series-${nonce}`, category: "BPSC", examName: "BPSC", isPublished: true, isFree: true, createdById: teacher.id },
  });
  const test = await prisma.examTest.create({
    data: { seriesId: series.id, title: `Test ${nonce}`, durationMinutes: 60, totalMarks: 100, isPublished: true, accessMode: "FREE", createdById: teacher.id },
  });
  const sec = await prisma.examSection.create({
    data: { testId: test.id, title: "S1", order: 1 },
  });
  const q = await prisma.examQuestion.create({
    data: {
      sectionId: sec.id,
      questionEn: "What is secret capital of testing?",
      optionAEn: "Alpha",
      optionBEn: "Beta",
      optionCEn: "Gamma",
      optionDEn: "Delta",
      correctOption: "A",
      explanationEn: "Alpha is the secret explanation for testing.",
      positiveMarks: 10,
      negativeMarks: 2,
      order: 1,
    },
  });

  // Student A has an IN_PROGRESS attempt
  const inProgressAttempt = await prisma.examAttempt.create({
    data: {
      userId: studentA.id,
      testId: test.id,
      status: "IN_PROGRESS",
      score: 0,
      startedAt: new Date(),
    },
  });

  // Student A also has a SUBMITTED attempt
  const submittedAttempt = await prisma.examAttempt.create({
    data: {
      userId: studentA.id,
      testId: test.id,
      status: "SUBMITTED",
      score: 10,
      totalMarks: 100,
      startedAt: new Date(Date.now() - 3600000),
      submittedAt: new Date(Date.now() - 3000000),
      answers: {
        create: [{ questionId: q.id, selectedOption: "A", isCorrect: true, marksAwarded: 10 }],
      },
    },
  });

  // Helper to authenticate request context
  async function createAuthContext(email: string) {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const csrfRes = await ctx.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await ctx.post("/api/auth/callback/credentials", {
      form: {
        email,
        password: PASSWORD,
        csrfToken,
      },
      maxRedirects: 0,
    });
    return ctx;
  }

  const ctxA = await createAuthContext(studentA.email);
  const ctxB = await createAuthContext(studentB.email);
  const ctxGuest = await request.newContext({ baseURL: BASE_URL });

  console.log("=== RUNNING RAW SOLUTIONS LEAK CHECK ===");
  console.log("API feeding solutions: GET /api/exam/attempt/[attemptId]/result\n");

  const forbiddenTerms = ["correctIndex", "correctOption", "explanationEn", "explanationHi", "answer"];

  function checkLeaks(label: string, bodyText: string) {
    console.log(`--- GREP CHECK for ${label} ---`);
    for (const term of forbiddenTerms) {
      const found = bodyText.includes(term);
      console.log(`grep "${term}": ${found ? "FOUND (LEAK!)" : "NOT FOUND (SAFE)"}`);
    }
  }

  // (a) Logged-in Student A with IN_PROGRESS attempt
  console.log("(a) Logged-in Student A with IN_PROGRESS attempt:");
  const resA = await ctxA.get(`/api/exam/attempt/${inProgressAttempt.id}/result`);
  const bodyA = await resA.text();
  console.log(`Status: ${resA.status()}`);
  console.log(`Body (first 300 chars): ${bodyA.slice(0, 300)}`);
  checkLeaks("(a) IN_PROGRESS attempt", bodyA);
  console.log();

  // (b) Student B for Student A's attempt
  console.log("(b) Student B accessing Student A's attempt:");
  const resB = await ctxB.get(`/api/exam/attempt/${submittedAttempt.id}/result`);
  const bodyB = await resB.text();
  console.log(`Status: ${resB.status()}`);
  console.log(`Body (first 300 chars): ${bodyB.slice(0, 300)}`);
  checkLeaks("(b) Student B accessing Student A attempt", bodyB);
  console.log();

  // (c) Guest
  console.log("(c) Guest accessing Student A's attempt:");
  const resGuest = await ctxGuest.get(`/api/exam/attempt/${submittedAttempt.id}/result`);
  const bodyGuest = await resGuest.text();
  console.log(`Status: ${resGuest.status()}`);
  console.log(`Body (first 300 chars): ${bodyGuest.slice(0, 300)}`);
  checkLeaks("(c) Guest", bodyGuest);
  console.log();

  await ctxA.dispose();
  await ctxB.dispose();
  await ctxGuest.dispose();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
