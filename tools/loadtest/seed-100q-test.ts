import { PrismaClient } from "@prisma/client";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
guardTestDatabase(testDbUrl);

const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

export async function seed100qTest() {
  console.log(`[Seed 100Q] Seeding 100-question test into DB: ${testDbUrl}...`);

  const teacher = await prisma.user.upsert({
    where: { email: "teacher_perf_100q@trillionskill.test" },
    update: {},
    create: {
      id: "u_perf_100q_teacher",
      name: "Perf Teacher",
      email: "teacher_perf_100q@trillionskill.test",
      role: "TEACHER",
    },
  });

  const series = await prisma.examSeries.upsert({
    where: { slug: "perf-test-series-100q" },
    update: { isPublished: true },
    create: {
      id: "es_perf_100q",
      slug: "perf-test-series-100q",
      title: "Performance 100-Question Exam Series",
      category: "UPSC",
      examName: "Civil Services",
      isPublished: true,
      createdById: teacher.id,
    },
  });

  // Clean existing test if present
  const existingTest = await prisma.examTest.findFirst({
    where: { id: "et_perf_100q" },
  });
  if (existingTest) {
    await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId: existingTest.id } } });
    await prisma.examAttempt.deleteMany({ where: { testId: existingTest.id } });
    await prisma.examQuestion.deleteMany({ where: { section: { testId: existingTest.id } } });
    await prisma.examSection.deleteMany({ where: { testId: existingTest.id } });
    await prisma.examTest.delete({ where: { id: existingTest.id } });
  }

  const test = await prisma.examTest.create({
    data: {
      id: "et_perf_100q",
      seriesId: series.id,
      title: "Mock 100-Question CBT Paper",
      titleHi: "100-प्रश्न मॉक सीबीटी प्रश्नपत्र",
      durationMinutes: 120,
      totalMarks: 200,
      totalQuestions: 100,
      positiveMarks: 2,
      negativeMarks: 0.66,
      accessMode: "FREE",
      isPublished: true,
      createdById: teacher.id,
      testType: "FULL_MOCK",
    },
  });

  const questions: Array<{ id: string; correctOption: string }> = [];
  for (let s = 1; s <= 4; s++) {
    const section = await prisma.examSection.create({
      data: {
        testId: test.id,
        title: `Section ${s}`,
        order: s,
        positiveMarks: 2,
        negativeMarks: 0.66,
      },
    });

    for (let q = 1; q <= 25; q++) {
      const qNum = (s - 1) * 25 + q;
      const question = await prisma.examQuestion.create({
        data: {
          sectionId: section.id,
          order: q,
          questionEn: `Question ${qNum} for performance load testing?`,
          questionHi: `प्रश्न ${qNum} प्रदर्शन लोड परीक्षण के लिए?`,
          optionAEn: `Option A for Q${qNum}`,
          optionBEn: `Option B for Q${qNum}`,
          optionCEn: `Option C for Q${qNum}`,
          optionDEn: `Option D for Q${qNum}`,
          correctOption: (["A", "B", "C", "D"])[qNum % 4],
          positiveMarks: 2,
          negativeMarks: 0.66,
          subject: `Subject ${(qNum % 5) + 1}`,
          difficulty: "MODERATE",
        },
      });
      questions.push({ id: question.id, correctOption: question.correctOption });
    }
  }

  // Seed 20 peer student attempts for ranking computation
  for (let p = 1; p <= 20; p++) {
    const peerUser = await prisma.user.upsert({
      where: { email: `peer_student_${p}@trillionskill.test` },
      update: {},
      create: {
        id: `u_peer_${p}`,
        name: `Peer Candidate ${p}`,
        email: `peer_student_${p}@trillionskill.test`,
        role: "FREE",
      },
    });

    const peerAtt = await prisma.examAttempt.create({
      data: {
        id: `att_peer_${p}`,
        userId: peerUser.id,
        testId: test.id,
        status: "SUBMITTED",
        language: "English",
        startedAt: new Date(Date.now() - 3600 * 1000 * 2),
        submittedAt: new Date(Date.now() - 3600 * 1000 + p * 60 * 1000),
        score: (25 + p * 2) * 2 - 10 * 0.66,
        totalMarks: 200,
        correctCount: 25 + p * 2,
        wrongCount: 10,
        skippedCount: 100 - (35 + p * 2),
        markedCount: 5,
        timeTakenSecs: 3000 + p * 50,
      },
    });

    const peerAnswers = [];
    const correctTarget = 25 + p * 2;
    for (let qi = 0; qi < correctTarget; qi++) {
      peerAnswers.push({
        id: `ans_peer_${p}_${qi + 1}`,
        attemptId: peerAtt.id,
        questionId: questions[qi].id,
        selectedOption: questions[qi].correctOption,
        isCorrect: true,
        marksAwarded: 2.0,
        timeSpentSecs: 30,
      });
    }
    for (let qi = correctTarget; qi < correctTarget + 10; qi++) {
      peerAnswers.push({
        id: `ans_peer_${p}_${qi + 1}`,
        attemptId: peerAtt.id,
        questionId: questions[qi].id,
        selectedOption: questions[qi].correctOption === "A" ? "B" : "A",
        isCorrect: false,
        marksAwarded: -0.66,
        timeSpentSecs: 30,
      });
    }
    await prisma.examAttemptAnswer.createMany({ data: peerAnswers });
  }

  console.log(`[Seed 100Q] Successfully seeded test ${test.id} with 100 questions and 20 peer attempts.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  seed100qTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
