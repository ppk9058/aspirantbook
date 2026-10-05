import { PrismaClient, Difficulty } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";

// Ensure environment points to test DB
process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

assertTestDb();

const prisma = new PrismaClient();

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

  console.log("Seeding complete on Docker test DB.");
}

run()
  .catch((err) => {
    console.error("FATAL seeding test DB:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
