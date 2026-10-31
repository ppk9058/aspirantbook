import { PrismaClient, Difficulty } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";

// Ensure environment points to test DB. Target URL is chosen in order:
// 1. SEED_DATABASE_URL (explicit local/testing seed override)
// 2. DATABASE_URL (environment-provided database URL, e.g. CI service DB)
// 3. CANONICAL_TEST_DATABASE_URL (local Docker test DB fallback)
const CANONICAL_TEST_DATABASE_URL =
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";

function resolveTargetUrl(): string {
  if (process.env.SEED_DATABASE_URL?.trim()) {
    return process.env.SEED_DATABASE_URL.trim();
  }
  const candidate = process.env.DATABASE_URL?.trim();
  if (candidate) {
    try {
      const parsed = new URL(candidate);
      const dbName = parsed.pathname.replace(/^\//, "");
      if (dbName.endsWith("_test")) {
        return candidate;
      }
    } catch {
      // Fall through to canonical fallback or let guards report
    }
  }
  return CANONICAL_TEST_DATABASE_URL;
}

const targetUrl = resolveTargetUrl();

process.env.TEST_DATABASE_URL = targetUrl;
process.env.DATABASE_URL = targetUrl;

assertTestDb();

const prisma = new PrismaClient({
  datasources: {
    db: { url: targetUrl },
  },
});

async function run() {
  console.log("=== SEEDING CORE DEV COURSES & SERIES INTO DOCKER TEST DB ===");

  // Create Instructor User if not exists
  const instructor = await prisma.user.upsert({
    where: { email: "instructor@trillionskill.test" },
    update: {},
    create: {
      id: "u_instructor_seed",
      name: "Test Instructor",
      email: "instructor@trillionskill.test",
      role: "TEACHER"
    }
  });

  // Seed courses required by test suites
  const coursesToSeed = [
    {
      id: "c_bpsc_seed",
      title: "72nd BPSC Prelims Current Affairs",
      slug: "72nd-bpsc-prelims-current-affairs",
      description: "Comprehensive current affairs course for BPSC",
      price: 1999,
      isPublished: true,
      isPremium: true,
      difficulty: Difficulty.INTERMEDIATE
    },
    {
      id: "c_ai_seed",
      title: "Generative AI Mastery",
      slug: "generative-ai",
      description: "Generative AI course",
      price: 2499,
      isPublished: true,
      isPremium: true,
      difficulty: Difficulty.ADVANCED
    },
    {
      id: "c_draft_seed",
      title: "Draft Course For Access Tests",
      slug: "draft-course-hidden",
      description: "Draft course test",
      price: 999,
      isPublished: false,
      isPremium: false,
      difficulty: Difficulty.BEGINNER
    }
  ];

  for (const c of coursesToSeed) {
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        price: c.price,
        isPublished: c.isPublished,
        isPremium: c.isPremium,
      },
      create: c
    });
    console.log(`Seeded course: ${course.slug} (${course.id}) - Price: ${course.price}, Published: ${course.isPublished}`);
  }

  // Seed Exam Series
  const seriesToSeed = [
    {
      id: "es_bpsc_seed",
      title: "72nd BPSC Prelims Mock Series 2026",
      slug: "bpsc-72nd-2026",
      examName: "BPSC",
      category: "Civil Services",
      description: "Mock test series for BPSC 72nd Prelims",
      isFree: true,
      isPro: false,
      isPublished: true,
      createdById: instructor.id
    },
    {
      id: "es_upsc_seed",
      title: "UPSC Prelims Mock Series 2026",
      slug: "upsc-prelims-2026",
      examName: "UPSC",
      category: "Civil Services",
      description: "Mock test series for UPSC Prelims",
      isFree: false,
      isPro: true,
      isPublished: true,
      createdById: instructor.id
    },
    {
      id: "cmv5cyek3000oxpzvug9zvj4q",
      title: "Current Affairs Quizzes",
      slug: "current-affairs-system-series",
      examName: "Current Affairs",
      category: "Current Affairs",
      description: "System series for Current Affairs Quizzes",
      isFree: true,
      isPro: false,
      isPublished: false,
      createdById: instructor.id
    }
  ];

  for (const s of seriesToSeed) {
    const series = await prisma.examSeries.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        isFree: s.isFree,
        isPro: s.isPro,
        isPublished: s.isPublished
      },
      create: s
    });
    console.log(`Seeded ExamSeries: ${series.slug} (${series.id}) - Free: ${series.isFree}, Pro: ${series.isPro}`);
  }

  const caSeries = await prisma.examSeries.findFirst({
    where: { slug: "current-affairs-system-series" },
  });

  // Seed UPSC Economy CA test quiz
  const caQuiz = await prisma.examTest.upsert({
    where: { id: "cmv5d7r52003oxpzv4x54dnie" },
    update: {
      title: "UPSC Economy CA",
      seriesId: caSeries!.id,
      testType: "CURRENT_AFFAIRS",
      accessMode: "FREE",
      durationMinutes: 10,
      totalQuestions: 10,
      totalMarks: 10,
      positiveMarks: 1,
      negativeMarks: 0.33,
      month: 10,
      year: 2026,
      isPublished: true,
      createdById: instructor.id
    },
    create: {
      id: "cmv5d7r52003oxpzv4x54dnie",
      title: "UPSC Economy CA",
      seriesId: caSeries!.id,
      testType: "CURRENT_AFFAIRS",
      accessMode: "FREE",
      durationMinutes: 10,
      totalQuestions: 10,
      totalMarks: 10,
      positiveMarks: 1,
      negativeMarks: 0.33,
      month: 10,
      year: 2026,
      isPublished: true,
      createdById: instructor.id
    }
  });

  const caSection = await prisma.examSection.upsert({
    where: { id: "cmv5d7r6u003qxpzvly7ymvo1" },
    update: {
      title: "General Studies",
      testId: caQuiz.id,
      order: 1,
      positiveMarks: 1,
      negativeMarks: 0.33,
    },
    create: {
      id: "cmv5d7r6u003qxpzvly7ymvo1",
      title: "General Studies",
      testId: caQuiz.id,
      order: 1,
      positiveMarks: 1,
      negativeMarks: 0.33,
    }
  });

  await prisma.examQuestion.upsert({
    where: { id: "cmv5d7r8m003rxpzvncey2hdq" },
    update: {
      sectionId: caSection.id,
      questionType: "MCQ",
      questionEn: "With reference to the Monetary Policy Committee (MPC) decisions of the Reserve Bank of India in October 2026, consider the following statements: 1. The MPC raised the policy repo rate by 25 basis points to 5.50%. 2. The monetary policy stance was changed from 'neutral' to 'calibrated tightening'. Which of the statements given above is/are correct?",
      optionAEn: "1 only",
      optionBEn: "2 only",
      optionCEn: "Both 1 and 2",
      optionDEn: "Neither 1 nor 2",
      correctOption: "C",
      explanationEn: "In its October 2026 meeting, the RBI's MPC unanimously voted to increase the policy repo rate by 25 bps to 5.50% to counter persistent inflationary pressures.",
      order: 1,
      positiveMarks: 1,
      negativeMarks: 0.33,
    },
    create: {
      id: "cmv5d7r8m003rxpzvncey2hdq",
      sectionId: caSection.id,
      questionType: "MCQ",
      questionEn: "With reference to the Monetary Policy Committee (MPC) decisions of the Reserve Bank of India in October 2026, consider the following statements: 1. The MPC raised the policy repo rate by 25 basis points to 5.50%. 2. The monetary policy stance was changed from 'neutral' to 'calibrated tightening'. Which of the statements given above is/are correct?",
      optionAEn: "1 only",
      optionBEn: "2 only",
      optionCEn: "Both 1 and 2",
      optionDEn: "Neither 1 nor 2",
      correctOption: "C",
      explanationEn: "In its October 2026 meeting, the RBI's MPC unanimously voted to increase the policy repo rate by 25 bps to 5.50% to counter persistent inflationary pressures.",
      order: 1,
      positiveMarks: 1,
      negativeMarks: 0.33,
    }
  });

  console.log("Seeded CA System Series and UPSC Economy CA quiz.");
  console.log("Seeding complete on Docker test DB.");
}

run()
  .catch((err) => {
    console.error("FATAL seeding test DB:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
