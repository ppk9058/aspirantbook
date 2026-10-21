import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertTestDb } from "../lib/testing/assert-test-db";

// Ensure environment points to test DB
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

assertTestDb();

const prisma = new PrismaClient();

export async function seedMobileTestAccounts() {
  console.log("=== SEEDING MOBILE TEST ACCOUNTS INTO TEST DB (127.0.0.1:54329) ===");

  const studentPasswordHash = await bcrypt.hash("Student123!", 10);
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);

  // 1. Seed Student Account
  const student = await prisma.user.upsert({
    where: { email: "student.mobile@aspirantbook.com" },
    update: {
      password: studentPasswordHash,
      isActive: true,
      role: UserRole.PREMIUM,
      name: "Aspirant Student",
      selectedGoal: "UPSC CSE",
    },
    create: {
      email: "student.mobile@aspirantbook.com",
      password: studentPasswordHash,
      name: "Aspirant Student",
      role: UserRole.PREMIUM,
      selectedGoal: "UPSC CSE",
      isActive: true,
      sessionVersion: 1,
    },
  });

  console.log(`[SEED] Student account verified: ${student.email} (${student.id})`);

  // 2. Seed Admin Account
  const admin = await prisma.user.upsert({
    where: { email: "admin.mobile@aspirantbook.com" },
    update: {
      password: adminPasswordHash,
      isActive: true,
      role: UserRole.ADMIN,
      name: "Aspirant Admin",
    },
    create: {
      email: "admin.mobile@aspirantbook.com",
      password: adminPasswordHash,
      name: "Aspirant Admin",
      role: UserRole.ADMIN,
      isActive: true,
      sessionVersion: 1,
    },
  });

  console.log(`[SEED] Admin account verified: ${admin.email} (${admin.id})`);

  // 3. Ensure Active Subscription for Student
  const existingSub = await prisma.subscription.findFirst({
    where: { userId: student.id, status: "ACTIVE" },
  });

  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        userId: student.id,
        plan: "YEARLY",
        status: "ACTIVE",
        provider: "RAZORPAY",
        providerId: "sub_mock_mobile_123",
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 86400000),
      },
    });
    console.log("[SEED] Active Pro subscription created for student");
  }

  // 4. Ensure Test Series & Attempts for Student
  let test = await prisma.examTest.findFirst({
    where: { isPublished: true },
    select: { id: true, title: true, durationMinutes: true },
  });

  if (!test) {
    // Create a demo test series and test if none found
    const series = await prisma.examSeries.create({
      data: {
        title: "UPSC Prelims Master Series 2026",
        slug: "upsc-prelims-master-2026",
        examName: "UPSC CSE",
        category: "Civil Services",
        createdById: admin.id,
        isPublished: true,
      },
    });

    test = await prisma.examTest.create({
      data: {
        title: "All-India Prelims Mock Test 01",
        seriesId: series.id,
        createdById: admin.id,
        durationMinutes: 120,
        totalMarks: 200,
        isPublished: true,
      },
      select: { id: true, title: true, durationMinutes: true },
    });
  }

  // Check existing attempts
  const attempts = await prisma.examAttempt.findMany({
    where: { userId: student.id, testId: test.id },
  });

  const hasInProgress = attempts.some((a) => a.status === "IN_PROGRESS");
  const hasSubmitted = attempts.some((a) => a.status === "SUBMITTED");

  if (!hasInProgress) {
    await prisma.examAttempt.create({
      data: {
        userId: student.id,
        testId: test.id,
        status: "IN_PROGRESS",
        startedAt: new Date(Date.now() - 15 * 60000),
        timeTakenSecs: 900,
      },
    });
    console.log("[SEED] Created in-progress attempt for student");
  }

  if (!hasSubmitted) {
    await prisma.examAttempt.create({
      data: {
        userId: student.id,
        testId: test.id,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 120 * 60000),
        submittedAt: new Date(Date.now() - 30 * 60000),
        score: 138.5,
        totalMarks: 200,
        timeTakenSecs: 5400,
      },
    });
    console.log("[SEED] Created submitted/evaluated attempt for student");
  }

  console.log("\n=======================================================");
  console.log("MOBILE TEST CREDENTIALS READY (Test Server 3045):");
  console.log("1. GUEST:        No login needed (free preview & 20% slice)");
  console.log("2. STUDENT:      student.mobile@aspirantbook.com / Student123!");
  console.log("3. ADMIN/TEACH:  admin.mobile@aspirantbook.com / Admin123!");
  console.log("=======================================================\n");
}

if (process.argv[1]?.endsWith("seed-mobile-test.ts")) {
  seedMobileTestAccounts()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
