import { PrismaClient } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";
import http from "http";

process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const TEST_URL = process.env.TEST_DATABASE_URL;

async function run() {
  console.log("=== STEP 3: /api/courses/free-enroll & /api/courses/enroll (DOCKER REAL HTTP) ===");
  assertTestDb();

  const prisma = new PrismaClient({ datasources: { db: { url: TEST_URL } } });

  // 1. Seed courses: paid course (price > 0), free course (price = 0), draft course (status = 'DRAFT', isPublished = false)
  const now = new Date();
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Course" (id, title, slug, description, difficulty, price, "isPremium", status, "isPublished", "createdAt", "updatedAt")
    VALUES 
      ('c_step3_paid', 'Step 3 Paid Course', 'step3-paid-course', 'Desc', 'BEGINNER', 1999, true, 'PUBLISHED', true, NOW(), NOW()),
      ('c_step3_free', 'Step 3 Free Course', 'step3-free-course', 'Desc', 'BEGINNER', 0, false, 'PUBLISHED', true, NOW(), NOW()),
      ('c_step3_draft', 'Step 3 Draft Course', 'step3-draft-course', 'Desc', 'BEGINNER', 0, false, 'DRAFT', false, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET 
      price = EXCLUDED.price, 
      "isPremium" = EXCLUDED."isPremium", 
      status = EXCLUDED.status, 
      "isPublished" = EXCLUDED."isPublished";
  `);

  // Create a student user
  await prisma.$executeRawUnsafe(`
    INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
    VALUES ('u_step3_student', 'step3_student@example.test', 'Step3 Student', 'FREE', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Clear any existing enrollments for these courses
  await prisma.$executeRawUnsafe(`
    DELETE FROM "Enrollment" WHERE "courseId" IN ('c_step3_paid', 'c_step3_free', 'c_step3_draft');
  `);

  const BASE_URL = process.env.BASE_URL || "http://localhost:3005";
  console.log(`Testing against BASE_URL: ${BASE_URL}`);

  // We test both endpoints: /api/courses/free-enroll and /api/courses/enroll
  const endpoints = [
    "/api/courses/free-enroll",
    "/api/courses/enroll"
  ];

  const results: any[] = [];

  for (const ep of endpoints) {
    // Case 1: Paid course -> expect 403 Forbidden, and 0 Enrollment rows
    const resPaid = await fetch(`${BASE_URL}${ep}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: "c_step3_paid", phoneNumber: "9876543210" }),
      redirect: "manual"
    });
    const paidEnrollCount: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as cnt FROM "Enrollment" WHERE "courseId" = 'c_step3_paid'
    `);
    results.push({
      endpoint: ep,
      case: "Paid course (price > 0)",
      expectedStatus: 403,
      actualStatus: resPaid.status,
      expectedEnrollCount: 0,
      actualEnrollCount: paidEnrollCount[0]?.cnt,
      pass: resPaid.status === 403 && paidEnrollCount[0]?.cnt === 0 ? "PASS" : "FAIL"
    });

    // Case 2: Free course -> expect 200 OK, and 1 Enrollment row
    const resFree = await fetch(`${BASE_URL}${ep}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: "c_step3_free", phoneNumber: "9876543210" }),
      redirect: "manual"
    });
    const freeEnrollCount: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as cnt FROM "Enrollment" WHERE "courseId" = 'c_step3_free'
    `);
    results.push({
      endpoint: ep,
      case: "Free course (price = 0)",
      expectedStatus: 200,
      actualStatus: resFree.status,
      expectedEnrollCount: 1,
      actualEnrollCount: freeEnrollCount[0]?.cnt,
      pass: resFree.status === 200 && freeEnrollCount[0]?.cnt === 1 ? "PASS" : "FAIL"
    });

    // Case 3: Draft course -> expect 404 Not Found, and 0 Enrollment rows
    const resDraft = await fetch(`${BASE_URL}${ep}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: "c_step3_draft", phoneNumber: "9876543210" }),
      redirect: "manual"
    });
    const draftEnrollCount: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as cnt FROM "Enrollment" WHERE "courseId" = 'c_step3_draft'
    `);
    results.push({
      endpoint: ep,
      case: "Draft course (status = DRAFT)",
      expectedStatus: 404,
      actualStatus: resDraft.status,
      expectedEnrollCount: 0,
      actualEnrollCount: draftEnrollCount[0]?.cnt,
      pass: resDraft.status === 404 && draftEnrollCount[0]?.cnt === 0 ? "PASS" : "FAIL"
    });
  }

  console.table(results);

  // Clean up
  await prisma.$executeRawUnsafe(`DELETE FROM "Enrollment" WHERE "courseId" IN ('c_step3_paid', 'c_step3_free', 'c_step3_draft')`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Course" WHERE id IN ('c_step3_paid', 'c_step3_free', 'c_step3_draft')`);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = 'u_step3_student'`);

  const allPassed = results.every(r => r.pass === "PASS");
  if (!allPassed) {
    throw new Error("One or more Step 3 cases failed!");
  }
  console.log("\n✓ STEP 3 ALL CASES PASSED.");
  await prisma.$disconnect();
}

run().catch(err => {
  console.error("FATAL in test-step3-free-enroll-docker:", err);
  process.exit(1);
});
