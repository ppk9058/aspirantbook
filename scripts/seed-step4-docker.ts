import { PrismaClient, Difficulty, LessonType } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";
import bcrypt from "bcryptjs";

process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
assertTestDb();

const prisma = new PrismaClient();

async function run() {
  console.log("=== STEP 4a: COMPREHENSIVE SEEDING ON DOCKER TEST DB ===");

  const passHash = await bcrypt.hash("TestPass123!", 10);

  // 1. Users per role
  const usersToSeed = [
    { id: "u_admin_step4", email: "admin@test.local", role: "ADMIN", name: "Admin User" },
    { id: "u_teacher_owner_step4", email: "teacher_owner@test.local", role: "TEACHER", name: "Teacher Owner" },
    { id: "u_teacher_other_step4", email: "teacher_other@test.local", role: "TEACHER", name: "Teacher Other" },
    { id: "u_student_free_step4", email: "student_free@test.local", role: "FREE", name: "Free Student" },
    { id: "u_student_prem_step4", email: "student_prem@test.local", role: "PREMIUM", name: "Premium Student" },
    { id: "u_student_courseB_step4", email: "student_courseB@test.local", role: "FREE", name: "Student Enrolled In Course B" },
  ];

  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { role: u.role as any, password: passHash },
      create: { ...u, role: u.role as any, password: passHash }
    });
  }
  console.log(`Seeded ${usersToSeed.length} users.`);

  // 2. Courses
  // Course A: 72nd-like Paid course with lessons (trial and non-trial, attachments, video URLs, telegram)
  const courseA = await prisma.course.upsert({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
    update: {
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      price: 1999
    },
    create: {
      id: "c_paid_72nd_step4",
      title: "72nd BPSC Prelims Current Affairs",
      slug: "72nd-bpsc-prelims-current-affairs",
      description: "Comprehensive current affairs for BPSC 72nd",
      price: 1999,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      difficulty: Difficulty.INTERMEDIATE
    }
  });

  // Chapter and Lessons for Course A
  const chA = await prisma.chapter.upsert({
    where: { id: "ch_a_step4" },
    update: {},
    create: {
      id: "ch_a_step4",
      courseId: courseA.id,
      title: "Core BPSC Modules",
      order: 1
    }
  });

  // Lesson 1: TRIAL lesson
  await prisma.lesson.upsert({
    where: { id: "l_a_trial_step4" },
    update: {},
    create: {
      id: "l_a_trial_step4",
      chapterId: chA.id,
      title: "Free Trial Lesson - BPSC Overview",
      type: LessonType.VIDEO,
      order: 1,
      isTrial: true,
      videoUrl: "https://videos.example.test/trial-preview.mp4",
      content: "Trial lesson content with public preview notes",
      duration: 600
    }
  });

  // Lesson 2: LOCKED lesson with secret payload
  await prisma.lesson.upsert({
    where: { id: "l_a_locked_step4" },
    update: {},
    create: {
      id: "l_a_locked_step4",
      chapterId: chA.id,
      title: "Secret Strategy Lesson - Locked",
      type: LessonType.VIDEO,
      order: 2,
      isTrial: false,
      videoUrl: "https://private-cdn.example.test/super-secret-video-stream.m3u8",
      content: "SECRET_TELEGRAM_GROUP: https://t.me/+SecretBPSCJoinKey123",
      duration: 1800
    }
  });

  // Course B: Another paid course
  const courseB = await prisma.course.upsert({
    where: { slug: "upsc-gs-mastery" },
    update: {
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      price: 2499
    },
    create: {
      id: "c_paid_upsc_step4",
      title: "UPSC GS Foundation Mastery",
      slug: "upsc-gs-mastery",
      description: "Complete GS Foundation",
      price: 2499,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      difficulty: Difficulty.ADVANCED
    }
  });

  // Free Course
  const courseFree = await prisma.course.upsert({
    where: { slug: "free-general-studies" },
    update: {
      status: "PUBLISHED",
      isPublished: true,
      isPremium: false,
      price: 0
    },
    create: {
      id: "c_free_gs_step4",
      title: "Free General Studies Primer",
      slug: "free-general-studies",
      description: "Free primer for all aspirants",
      price: 0,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: false,
      difficulty: Difficulty.BEGINNER
    }
  });

  // Draft Course
  const courseDraft = await prisma.course.upsert({
    where: { slug: "draft-secret-course" },
    update: {
      status: "DRAFT",
      isPublished: false,
      isPremium: false,
      price: 999
    },
    create: {
      id: "c_draft_secret_step4",
      title: "Unreleased Draft Course",
      slug: "draft-secret-course",
      description: "Confidential draft",
      price: 999,
      status: "DRAFT",
      isPublished: false,
      isPremium: false,
      difficulty: Difficulty.BEGINNER
    }
  });

  // Chapter and Lesson for Draft Course
  const chDraft = await prisma.chapter.upsert({
    where: { id: "ch_draft_step4" },
    update: {},
    create: {
      id: "ch_draft_step4",
      courseId: courseDraft.id,
      title: "Draft Secrets Chapter",
      order: 1
    }
  });

  await prisma.lesson.upsert({
    where: { id: "l_draft_lesson_step4" },
    update: {},
    create: {
      id: "l_draft_lesson_step4",
      chapterId: chDraft.id,
      title: "Confidential Draft Lesson",
      type: LessonType.VIDEO,
      order: 1,
      isTrial: false,
      videoUrl: "https://secret.example.test/draft.mp4",
      duration: 300
    }
  });

  // Enroll student_courseB into Course B only
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: "u_student_courseB_step4",
        courseId: courseB.id
      }
    },
    update: {},
    create: {
      userId: "u_student_courseB_step4",
      courseId: courseB.id
    }
  });

  // 3. Exam Series
  await prisma.examSeries.upsert({
    where: { slug: "bpsc-72nd-2026" },
    update: {
      isFree: true,
      isPro: false,
      isPublished: true
    },
    create: {
      id: "es_bpsc_step4",
      title: "72nd BPSC Prelims Mock Series 2026",
      slug: "bpsc-72nd-2026",
      examName: "BPSC",
      category: "Civil Services",
      description: "Official 72nd mock series",
      isFree: true,
      isPro: false,
      isPublished: true,
      createdById: "u_teacher_owner_step4"
    }
  });

  // 4. Coupons
  // Percent coupon
  await prisma.coupon.upsert({
    where: { code: "STEP4_PERC20" },
    update: { isActive: true },
    create: {
      id: "cpn_perc20_step4",
      code: "STEP4_PERC20",
      discountType: "PERCENT",
      discountValue: 20,
      courseId: courseA.id,
      showOnThumbnail: true,
      badgeLabel: "20% FLAT OFF",
      isActive: true
    }
  });

  // Flat coupon
  await prisma.coupon.upsert({
    where: { code: "STEP4_FLAT500" },
    update: { isActive: true },
    create: {
      id: "cpn_flat500_step4",
      code: "STEP4_FLAT500",
      discountType: "FLAT",
      discountValue: 500,
      courseId: courseA.id,
      isActive: true
    }
  });

  // Max redemptions 1 coupon
  await prisma.coupon.upsert({
    where: { code: "STEP4_MAX1" },
    update: { isActive: true, maxRedemptions: 1 },
    create: {
      id: "cpn_max1_step4",
      code: "STEP4_MAX1",
      discountType: "PERCENT",
      discountValue: 50,
      courseId: courseA.id,
      maxRedemptions: 1,
      isActive: true
    }
  });

  // Expired coupon
  await prisma.coupon.upsert({
    where: { code: "STEP4_EXPIRED" },
    update: { isActive: true },
    create: {
      id: "cpn_expired_step4",
      code: "STEP4_EXPIRED",
      discountType: "PERCENT",
      discountValue: 10,
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  });

  console.log("Seed complete on Docker test DB.");
}

run()
  .catch((err) => {
    console.error("FATAL seeding step 4:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
