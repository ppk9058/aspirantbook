import { PrismaClient } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";

const dbUrl = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = dbUrl;
process.env.DIRECT_URL = dbUrl;
assertTestDb();

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3045";

async function main() {
  console.log("TEST DB: yes | host: 127.0.0.1:54329 | db: trillionskill_test");
  console.log("BASE_URL:", BASE_URL);

  // 1. Setup seeded test data
  // Ensure we have Student A (FREE), Student B (PREMIUM), and Instructor
  const studentA = await prisma.user.upsert({
    where: { email: "student_a_exam@test.local" },
    update: { role: "FREE" },
    create: {
      id: "u_student_a_exam",
      email: "student_a_exam@test.local",
      name: "Student A Exam",
      role: "FREE",
    },
  });

  const studentB = await prisma.user.upsert({
    where: { email: "student_b_exam@test.local" },
    update: { role: "PREMIUM" },
    create: {
      id: "u_student_b_exam",
      email: "student_b_exam@test.local",
      name: "Student B Exam",
      role: "PREMIUM",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher_exam@test.local" },
    update: { role: "TEACHER" },
    create: {
      id: "u_teacher_exam",
      email: "teacher_exam@test.local",
      name: "Teacher Exam",
      role: "TEACHER",
    },
  });

  // Series
  const series = await prisma.examSeries.upsert({
    where: { slug: "exam-integrity-series-p9" },
    update: { isPublished: true, isFree: true },
    create: {
      id: "es_integrity_p9",
      title: "Exam Integrity Series",
      slug: "exam-integrity-series-p9",
      examName: "Integrity Exam",
      category: "Testing",
      isPublished: true,
      isFree: true,
      createdById: teacher.id,
    },
  });

  // Test 1: Published FREE Test with 3 questions
  // Q1: +2.0, -0.5, correct 'A'
  // Q2: +2.0, -0.5, correct 'B'
  // Q3: +2.0, -0.5, correct 'C'
  const test1 = await prisma.examTest.upsert({
    where: { id: "test_integrity_free_p9" },
    update: {
      isPublished: true,
      accessMode: "FREE",
      durationMinutes: 10,
      totalMarks: 6,
      positiveMarks: 2.0,
      negativeMarks: 0.5,
    },
    create: {
      id: "test_integrity_free_p9",
      seriesId: series.id,
      title: "Integrity Free Test",
      isPublished: true,
      accessMode: "FREE",
      durationMinutes: 10,
      totalMarks: 6,
      positiveMarks: 2.0,
      negativeMarks: 0.5,
      createdById: teacher.id,
    },
  });

  const section1 = await prisma.examSection.upsert({
    where: { id: "sec_integrity_1" },
    update: {},
    create: {
      id: "sec_integrity_1",
      testId: test1.id,
      title: "Section 1",
      order: 1,
    },
  });

  const q1 = await prisma.examQuestion.upsert({
    where: { id: "q_integ_1" },
    update: { correctOption: "A", positiveMarks: 2.0, negativeMarks: 0.5 },
    create: {
      id: "q_integ_1",
      sectionId: section1.id,
      questionEn: "What is 2+2?",
      correctOption: "A",
      positiveMarks: 2.0,
      negativeMarks: 0.5,
      order: 1,
    },
  });

  const q2 = await prisma.examQuestion.upsert({
    where: { id: "q_integ_2" },
    update: { correctOption: "B", positiveMarks: 2.0, negativeMarks: 0.5 },
    create: {
      id: "q_integ_2",
      sectionId: section1.id,
      questionEn: "What is 3*3?",
      correctOption: "B",
      positiveMarks: 2.0,
      negativeMarks: 0.5,
      order: 2,
    },
  });

  const q3 = await prisma.examQuestion.upsert({
    where: { id: "q_integ_3" },
    update: { correctOption: "C", positiveMarks: 2.0, negativeMarks: 0.5 },
    create: {
      id: "q_integ_3",
      sectionId: section1.id,
      questionEn: "What is 4+4?",
      correctOption: "C",
      positiveMarks: 2.0,
      negativeMarks: 0.5,
      order: 3,
    },
  });

  // Test 2: PRO Test (requires pass / premium)
  const testPro = await prisma.examTest.upsert({
    where: { id: "test_integrity_pro_p9" },
    update: { isPublished: true, accessMode: "PRO" },
    create: {
      id: "test_integrity_pro_p9",
      seriesId: series.id,
      title: "Integrity Pro Test",
      isPublished: true,
      accessMode: "PRO",
      durationMinutes: 10,
      totalMarks: 2,
      positiveMarks: 2.0,
      negativeMarks: 0.5,
      createdById: teacher.id,
    },
  });

  // Test 3: UNPUBLISHED Test (draft)
  const testDraft = await prisma.examTest.upsert({
    where: { id: "test_integrity_draft_p9" },
    update: { isPublished: false, accessMode: "FREE" },
    create: {
      id: "test_integrity_draft_p9",
      seriesId: series.id,
      title: "Integrity Draft Test",
      isPublished: false,
      accessMode: "FREE",
      durationMinutes: 10,
      totalMarks: 2,
      positiveMarks: 2.0,
      negativeMarks: 0.5,
      createdById: teacher.id,
    },
  });

  // Clean old attempts for test1 and studentA
  await prisma.examAttempt.deleteMany({
    where: { testId: { in: [test1.id, testPro.id, testDraft.id] } },
  });

  console.log("Seeded exam data successfully.");

  const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "default_test_secret_32_characters_long_min";
  async function createCookie(userId: string, role: string, email: string) {
    const { encode } = await import("next-auth/jwt");
    const token = await encode({
      token: { id: userId, role, email, name: `User ${role}` },
      secret: SECRET,
      salt: "authjs.session-token",
    });
    return `authjs.session-token=${token}`;
  }

  const cookieStudentA = await createCookie(studentA.id, "FREE", studentA.email!);
  const cookieStudentB = await createCookie(studentB.id, "PREMIUM", studentB.email!);

  const authHeaders = (cookie: string) => ({
    "Content-Type": "application/json",
    "Cookie": cookie,
  });

  // CASE 1: Start Attempt as Student A
  console.log("\n--- CASE 1: START ATTEMPT ---");
  const startRes = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
    method: "POST",
    headers: authHeaders(cookieStudentA),
    body: JSON.stringify({ testId: test1.id, language: "English" }),
  });
  console.log("Start HTTP status:", startRes.status);
  const startJson = await startRes.json();
  const attemptId = startJson.data?.attemptId;
  console.log("Attempt ID:", attemptId, "Resumed:", startJson.data?.resumed);
  if (!attemptId) throw new Error("Failed to start attempt: " + JSON.stringify(startJson));

  // CASE 2: Autosave answer (Q1 = 'A') via sync
  console.log("\n--- CASE 2: AUTOSAVE VIA SYNC ---");
  const syncRes = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/sync`, {
    method: "POST",
    headers: authHeaders(cookieStudentA),
    body: JSON.stringify({
      answers: [
        { questionId: q1.id, selectedOption: "A", isMarked: false, timeSpentSecs: 15 },
      ],
      sequence: 1,
    }),
  });
  console.log("Sync HTTP status:", syncRes.status);
  const syncJson = await syncRes.json();
  console.log("Sync response:", syncJson);

  // CASE 3: Reload / Resume active attempt
  console.log("\n--- CASE 3: RELOAD / RESUME ACTIVE ATTEMPT ---");
  const resumeRes = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
    method: "POST",
    headers: authHeaders(cookieStudentA),
    body: JSON.stringify({ testId: test1.id, language: "English" }),
  });
  console.log("Resume HTTP status:", resumeRes.status);
  const resumeJson = await resumeRes.json();
  console.log("Resume data:", {
    resumed: resumeJson.data?.resumed,
    attemptId: resumeJson.data?.attemptId,
    savedAnswersCount: resumeJson.data?.answers?.length,
    q1SavedOption: resumeJson.data?.answers?.[0]?.selectedOption,
  });

  // CASE 4: Cross-user 403 Security (Student B tries to sync on Student A's attempt)
  console.log("\n--- CASE 4: CROSS-USER ATTEMPT TAMPERING (EXPECT 403) ---");
  const crossSyncRes = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/sync`, {
    method: "POST",
    headers: authHeaders(cookieStudentB),
    body: JSON.stringify({
      answers: [{ questionId: q1.id, selectedOption: "B", isMarked: false }],
    }),
  });
  console.log("Cross-user sync HTTP status:", crossSyncRes.status);
  const crossSyncJson = await crossSyncRes.json();
  console.log("Cross-user response:", crossSyncJson);

  // Cross-user submit on Student A's attempt
  const crossSubmitRes = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/submit`, {
    method: "POST",
    headers: authHeaders(cookieStudentB),
    body: JSON.stringify({ answers: [] }),
  });
  console.log("Cross-user submit HTTP status:", crossSubmitRes.status);
  const crossSubmitJson = await crossSubmitRes.json();
  console.log("Cross-user submit response:", crossSubmitJson);

  // CASE 5: Entitlement Check - Paid Test blocked for FREE student (Student A)
  console.log("\n--- CASE 5: PAID TEST BLOCKED FOR FREE STUDENT (EXPECT 403) ---");
  const proBlockedRes = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
    method: "POST",
    headers: authHeaders(cookieStudentA),
    body: JSON.stringify({ testId: testPro.id, language: "English" }),
  });
  console.log("PRO test for FREE user status:", proBlockedRes.status);
  const proBlockedJson = await proBlockedRes.json();
  console.log("PRO test blocked response:", proBlockedJson);

  // CASE 6: Unpublished Draft Test hidden from Student (EXPECT 403)
  console.log("\n--- CASE 6: DRAFT TEST BLOCKED FOR STUDENT (EXPECT 403) ---");
  const draftBlockedRes = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
    method: "POST",
    headers: authHeaders(cookieStudentA),
    body: JSON.stringify({ testId: testDraft.id, language: "English" }),
  });
  console.log("Draft test for student status:", draftBlockedRes.status);
  const draftBlockedJson = await draftBlockedRes.json();
  console.log("Draft test blocked response:", draftBlockedJson);

  // CASE 7: Scoring with Hand-Computed Arithmetic
  console.log("\n--- CASE 7: AUTHORITATIVE SUBMIT & HAND-COMPUTED SCORE ---");
  console.log("Arithmetic Breakdown:");
  console.log("  Q1: Selected 'A', Correct 'A' -> +2.0 marks");
  console.log("  Q2: Selected 'C', Correct 'B' -> -0.5 marks");
  console.log("  Q3: Unattempted (omitted from answers array) -> 0.0 marks");
  console.log("  Expected Total Score: 2.0 - 0.5 = 1.5");
  console.log("  Expected Correct: 1 | Wrong: 1 | Skipped: 1");

  const submitRes = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/submit`, {
    method: "POST",
    headers: authHeaders(cookieStudentA),
    body: JSON.stringify({
      answers: [
        { questionId: q1.id, selectedOption: "A", isMarked: false, timeSpentSecs: 20 },
        { questionId: q2.id, selectedOption: "C", isMarked: false, timeSpentSecs: 30 },
      ],
    }),
  });
  console.log("Submit HTTP status:", submitRes.status);
  const submitJson = await submitRes.json();
  console.log("Submit result:", submitJson.data);

  // CASE 8: Double Submit Idempotency
  console.log("\n--- CASE 8: DOUBLE SUBMIT IDEMPOTENCY ---");
  const submit2Res = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/submit`, {
    method: "POST",
    headers: authHeaders(cookieStudentA),
    body: JSON.stringify({
      answers: [
        { questionId: q1.id, selectedOption: "B", isMarked: false, timeSpentSecs: 100 }, // Attempt to change
      ],
    }),
  });
  console.log("Double submit HTTP status:", submit2Res.status);
  const submit2Json = await submit2Res.json();
  console.log("Double submit result:", submit2Json.data);

  // CASE 9: Timer Expiry Enforcement Server-Side
  console.log("\n--- CASE 9: TIMER EXPIRY & AUTO-SUBMIT ON EXPIRED ATTEMPT ---");
  const expAttempt = await prisma.examAttempt.create({
    data: {
      userId: studentB.id,
      testId: test1.id,
      status: "IN_PROGRESS",
      startedAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago (duration is 10 mins)
    },
  });
  console.log("Created expired attempt:", expAttempt.id, "startedAt:", expAttempt.startedAt);

  // Attempt to sync answer after expiry
  const expSyncRes = await fetch(`${BASE_URL}/api/exam/attempt/${expAttempt.id}/sync`, {
    method: "POST",
    headers: authHeaders(cookieStudentB),
    body: JSON.stringify({
      answers: [{ questionId: q1.id, selectedOption: "A", isMarked: false }],
    }),
  });
  console.log("Expired sync HTTP status:", expSyncRes.status);
  const expSyncJson = await expSyncRes.json();
  console.log("Expired sync response (auto-submitted):", expSyncJson);

  // Verify in DB that expired attempt is now SUBMITTED
  const dbExp = await prisma.examAttempt.findUnique({
    where: { id: expAttempt.id },
    select: { status: true, submittedAt: true, score: true },
  });
  console.log("DB status of expired attempt:", dbExp);

  console.log("\n=== ALL P0-4 EXAM INTEGRITY CHECKS COMPLETED ===");
}

main()
  .catch((e) => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
