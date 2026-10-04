import { PrismaClient, SubscriptionPlan, SubscriptionStatus, PaymentProvider, ExamAttemptStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

// Load env files (.env.test first, then .env for DATABASE_URL)
dotenv.config({ path: ".env.test" })
dotenv.config({ path: ".env" })

// Safety guardrails: refuse to run in production or against production databases
if (process.env.NODE_ENV === "production") {
    console.error("FATAL: Refusing to run dev-only seed script when NODE_ENV=production")
    process.exit(1)
}

const dbUrl = (process.env.DATABASE_URL || "").toLowerCase()
if (
    dbUrl.includes("production") ||
    dbUrl.includes("-prod") ||
    dbUrl.includes("prod-") ||
    dbUrl.includes(".prod.")
) {
    console.error("FATAL: Refusing to run dev-only seed script when DATABASE_URL looks like production")
    process.exit(1)
}

const testPassword = process.env.TEST_USER_PASSWORD
if (!testPassword) {
    console.error("FATAL: TEST_USER_PASSWORD not found in .env.test")
    process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Running dev-only audit user seed script...")

    const hashedPassword = await bcrypt.hash(testPassword, 10)

    // 1. Data-rich STUDENT: student.audit@trillioskills.com
    const studentAuditEmail = "student.audit@trillioskills.com"
    const studentAudit = await prisma.user.upsert({
        where: { email: studentAuditEmail },
        update: {
            name: "Audit Student",
            role: "PREMIUM",
            password: hashedPassword,
        },
        create: {
            email: studentAuditEmail,
            name: "Audit Student",
            role: "PREMIUM",
            password: hashedPassword,
        },
    })
    console.log(`✓ Seeded student.audit: ${studentAudit.id}`)

    // Active subscription with future endDate
    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    await prisma.subscription.deleteMany({
        where: { userId: studentAudit.id },
    })
    await prisma.subscription.create({
        data: {
            userId: studentAudit.id,
            plan: SubscriptionPlan.YEARLY,
            status: SubscriptionStatus.ACTIVE,
            provider: PaymentProvider.STRIPE,
            providerId: `sub_audit_${studentAudit.id}`,
            startDate: new Date(),
            endDate: oneYearFromNow,
        },
    })
    console.log("✓ Seeded active subscription with future endDate")

    // Find course to enroll
    const course = await prisma.course.findFirst({
        where: { isPublished: true },
        select: { id: true, title: true },
    }) || await prisma.course.findFirst({
        select: { id: true, title: true },
    })

    if (course) {
        await prisma.enrollment.upsert({
            where: {
                userId_courseId: {
                    userId: studentAudit.id,
                    courseId: course.id,
                },
            },
            update: {},
            create: {
                userId: studentAudit.id,
                courseId: course.id,
            },
        })
        console.log(`✓ Enrolled student.audit in course: ${course.title} (${course.id})`)
    }

    // Exam attempts
    const examTests = await prisma.examTest.findMany({
        take: 3,
        select: { id: true, totalMarks: true },
    })

    if (examTests.length > 0) {
        // Clean previous audit attempts
        await prisma.examAttempt.deleteMany({
            where: { userId: studentAudit.id },
        })

        for (const test of examTests) {
            await prisma.examAttempt.create({
                data: {
                    userId: studentAudit.id,
                    testId: test.id,
                    language: "English",
                    status: ExamAttemptStatus.SUBMITTED,
                    score: Math.max(1, Math.round(test.totalMarks * 0.8)),
                    totalMarks: test.totalMarks,
                    correctCount: 4,
                    wrongCount: 1,
                    skippedCount: 0,
                    timeTakenSecs: 240,
                    percentile: 89.5,
                    allIndiaRank: 42,
                    startedAt: new Date(Date.now() - 3600 * 1000),
                    submittedAt: new Date(),
                },
            })
        }
        console.log(`✓ Created ${examTests.length} ExamAttempt records for student.audit`)
    }

    // 2. Empty STUDENT: student.empty@trillioskills.com
    const studentEmptyEmail = "student.empty@trillioskills.com"
    const studentEmpty = await prisma.user.upsert({
        where: { email: studentEmptyEmail },
        update: {
            name: "Empty Student",
            role: "FREE",
            password: hashedPassword,
        },
        create: {
            email: studentEmptyEmail,
            name: "Empty Student",
            role: "FREE",
            password: hashedPassword,
        },
    })

    // Ensure completely clean state (no enrollments, no attempts, no pass/subscription)
    await prisma.enrollment.deleteMany({ where: { userId: studentEmpty.id } })
    await prisma.examAttempt.deleteMany({ where: { userId: studentEmpty.id } })
    await prisma.subscription.deleteMany({ where: { userId: studentEmpty.id } })
    console.log(`✓ Seeded clean student.empty (no enrollments, attempts, or Pass): ${studentEmpty.id}`)

    // 3. TEACHER: teacher.audit@trillioskills.com
    const teacherEmail = "teacher.audit@trillioskills.com"
    const teacherUser = await prisma.user.upsert({
        where: { email: teacherEmail },
        update: {
            name: "Audit Teacher",
            role: "TEACHER",
            password: hashedPassword,
        },
        create: {
            email: teacherEmail,
            name: "Audit Teacher",
            role: "TEACHER",
            password: hashedPassword,
        },
    })
    console.log(`✓ Seeded teacher.audit: ${teacherUser.id}`)

    console.log("\n✅ Dev-only seed completed successfully.")
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
