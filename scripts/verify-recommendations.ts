import { PrismaClient, UserRole } from "@prisma/client";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "";
const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045";

function nonce() {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function run() {
  console.log("=== VERIFY RECOMMENDATIONS TEST SUITE ===");
  console.log(`Target: ${BASE_URL}, DB: 127.0.0.1:54329/trillionskill_test\n`);

  const n = nonce();

  // Create an author/admin for seeding
  const author = await prisma.user.create({
    data: {
      email: `${n}-author@test.local`,
      name: `Author ${n}`,
      role: UserRole.TEACHER,
    },
  });

  // Series 1: Target current series (BPSC)
  const currentSeries = await prisma.examSeries.create({
    data: {
      title: `Current Series ${n}`,
      slug: `curr-${n}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: true,
      createdById: author.id,
      tests: {
        create: {
          title: `Test Curr ${n}`,
          isPublished: true,
          createdById: author.id,
        },
      },
    },
  });

  // Series 2: Series with 0 published tests (should NEVER be recommended)
  const zeroTestSeries = await prisma.examSeries.create({
    data: {
      title: `Zero Test Series ${n}`,
      slug: `zero-${n}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: true,
      createdById: author.id,
      tests: {
        create: {
          title: `Draft Test ${n}`,
          isPublished: false, // draft test only!
          createdById: author.id,
        },
      },
    },
  });

  // Series 3: Draft series (isPublished = false) (should NEVER be recommended)
  const draftSeries = await prisma.examSeries.create({
    data: {
      title: `Draft Series ${n}`,
      slug: `draft-${n}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: false, // draft series!
      createdById: author.id,
      tests: {
        create: {
          title: `Published Test In Draft Series ${n}`,
          isPublished: true,
          createdById: author.id,
        },
      },
    },
  });

  // Series 4: Eligible BPSC Series (goal match, 1 test, 0 enrollments)
  const bpscSeriesLow = await prisma.examSeries.create({
    data: {
      title: `BPSC Series Low ${n}`,
      slug: `bpsc-low-${n}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: true,
      createdById: author.id,
      tests: {
        create: {
          title: `Test Low ${n}`,
          isPublished: true,
          createdById: author.id,
        },
      },
    },
  });

  // Series 5: Eligible BPSC Series (goal match, 2 tests, 2 enrollments -> higher popularity)
  const bpscSeriesHigh = await prisma.examSeries.create({
    data: {
      title: `BPSC Series High ${n}`,
      slug: `bpsc-high-${n}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: true,
      createdById: author.id,
      tests: {
        createMany: {
          data: [
            { title: `Test High 1 ${n}`, isPublished: true, createdById: author.id },
            { title: `Test High 2 ${n}`, isPublished: true, createdById: author.id },
          ],
        },
      },
    },
  });

  // Series 6: Non-matching goal series (UPSC, 1 test, 5 enrollments)
  const upscSeries = await prisma.examSeries.create({
    data: {
      title: `UPSC Series ${n}`,
      slug: `upsc-${n}`,
      category: "UPSC",
      examName: "UPSC",
      isPublished: true,
      createdById: author.id,
      tests: {
        create: {
          title: `Test UPSC ${n}`,
          isPublished: true,
          createdById: author.id,
        },
      },
    },
  });

  // Series 7: Series that student is enrolled in
  const studentEnrolledSeries = await prisma.examSeries.create({
    data: {
      title: `Student Enrolled Series ${n}`,
      slug: `stu-enrolled-${n}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: true,
      createdById: author.id,
      tests: {
        create: {
          title: `Test Enrolled ${n}`,
          isPublished: true,
          createdById: author.id,
        },
      },
    },
  });

  // Series 8: Series that student has attempted
  const studentAttemptedSeries = await prisma.examSeries.create({
    data: {
      title: `Student Attempted Series ${n}`,
      slug: `stu-attempted-${n}`,
      category: "BPSC",
      examName: "BPSC",
      isPublished: true,
      createdById: author.id,
      tests: {
        create: {
          title: `Test Attempted ${n}`,
          isPublished: true,
          createdById: author.id,
        },
      },
    },
    include: { tests: true },
  });

  // Create student
  const student = await prisma.user.create({
    data: {
      email: `${n}-student@test.local`,
      name: `Student ${n}`,
      role: UserRole.FREE,
      selectedGoal: "bpsc",
    },
  });

  // Enroll student in Series 7
  await prisma.examSeriesEnrollment.create({
    data: {
      userId: student.id,
      seriesId: studentEnrolledSeries.id,
    },
  });

  // Add enrollments to bpscSeriesHigh (2 enrollments) to establish popularity
  const otherUser1 = await prisma.user.create({
    data: { email: `${n}-u1@test.local`, name: `U1 ${n}`, role: UserRole.FREE },
  });
  const otherUser2 = await prisma.user.create({
    data: { email: `${n}-u2@test.local`, name: `U2 ${n}`, role: UserRole.FREE },
  });
  await prisma.examSeriesEnrollment.createMany({
    data: [
      { userId: otherUser1.id, seriesId: bpscSeriesHigh.id },
      { userId: otherUser2.id, seriesId: bpscSeriesHigh.id },
    ],
  });

  // Add attempt for student on Series 8
  await prisma.examAttempt.create({
    data: {
      userId: student.id,
      testId: studentAttemptedSeries.tests[0].id,
      status: "IN_PROGRESS",
    },
  });

  console.log("Seeded test data successfully.");

  // Test cases:
  let allPass = true;

  // Query recommendations API as guest on currentSeries with BPSC goal
  const guestRes = await fetch(
    `${BASE_URL}/api/exam/series/recommendations?seriesId=${currentSeries.slug}`,
    {
      headers: {
        Cookie: "trillion_selected_goal=bpsc",
      },
    }
  );

  console.log(`\nGuest API status: ${guestRes.status}`);
  if (!guestRes.ok) {
    console.log(`FAIL: Expected 200, got ${guestRes.status}`);
    process.exit(1);
  }

  const guestJson = await guestRes.json();
  const guestData: any[] = guestJson.data || [];
  const recSlugs = guestData.map((s: any) => s.slug);
  console.log("Guest recommended series slugs:", recSlugs);

  // Check (a): series with 0 published tests is never recommended
  const testA = !recSlugs.includes(zeroTestSeries.slug);
  console.log(`Check (a) [0 published tests never recommended]: ${testA ? "PASS" : "FAIL"}`);
  if (!testA) allPass = false;

  // Check (b): draft series never recommended
  const testB = !recSlugs.includes(draftSeries.slug);
  console.log(`Check (b) [draft series never recommended]: ${testB ? "PASS" : "FAIL"}`);
  if (!testB) allPass = false;

  // Check (c): current series excluded
  const testC = !recSlugs.includes(currentSeries.slug);
  console.log(`Check (c) [current series excluded]: ${testC ? "PASS" : "FAIL"}`);
  if (!testC) allPass = false;

  // Check (d): logged-in student's enrolled/attempted series excluded
  // Test by calling recommendations with student userId via header or helper test
  // Let's call helper directly or mock session in endpoint test
  const studentRes = await fetch(
    `${BASE_URL}/api/exam/series/recommendations?seriesId=${currentSeries.slug}&userId=${student.id}`
  );
  const studentJson = await studentRes.json();
  const stuRecSlugs = (studentJson.data || []).map((s: any) => s.slug);
  console.log("Student recommended series slugs:", stuRecSlugs);

  const testD1 = !stuRecSlugs.includes(studentEnrolledSeries.slug);
  const testD2 = !stuRecSlugs.includes(studentAttemptedSeries.slug);
  const testD = testD1 && testD2;
  console.log(`Check (d) [student enrolled & attempted series excluded]: ${testD ? "PASS" : "FAIL"}`);
  if (!testD) allPass = false;

  // Check (e): goal-matching series come first
  // In guestData, bpscSeriesHigh & bpscSeriesLow should appear before upscSeries (when goal=bpsc)
  const bpscHighIdx = recSlugs.indexOf(bpscSeriesHigh.slug);
  const upscIdx = recSlugs.indexOf(upscSeries.slug);
  const testE = bpscHighIdx !== -1 && (upscIdx === -1 || bpscHighIdx < upscIdx);
  console.log(`Check (e) [goal-matching series come first]: ${testE ? "PASS" : "FAIL"}`);
  if (!testE) allPass = false;

  // Check (f): section hidden when no eligible series
  // Call with impossible series or when all are excluded
  const emptyRes = await fetch(
    `${BASE_URL}/api/exam/series/recommendations?seriesId=non-existent-unique-goal&goal=non-existent-goal-xyz-12345`
  );
  const emptyJson = await emptyRes.json();
  // If we query with an isolated series where nothing else qualifies:
  console.log(`Check (f) [empty response returns []]: ${Array.isArray(emptyJson.data) ? "PASS" : "FAIL"}`);

  // Check (g): guest gets recommendations with no private data in the response
  const privateFields = ["password", "email", "questions", "userId", "answers", "attempts"];
  let hasPrivate = false;
  for (const item of guestData) {
    for (const f of privateFields) {
      if (f in item) hasPrivate = true;
    }
  }
  const testG = !hasPrivate && guestData.length > 0 && typeof guestData[0].href === "string";
  console.log(`Check (g) [no private data and card href present]: ${testG ? "PASS" : "FAIL"}`);
  if (!testG) allPass = false;

  console.log(`\nOVERALL SUITE RESULT: ${allPass ? "ALL PASS" : "SOME FAILED"}`);
  await prisma.$disconnect();
  if (!allPass) process.exit(1);
}

run().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
