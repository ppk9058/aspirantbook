import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { PrismaClient } from "@prisma/client"
import { chromium } from "playwright"
import path from "path"
import fs from "fs"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:3000"
const ARTIFACT_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/ab750c16-600c-40b0-81a5-1de87b0bbe4f/artifacts_pass5_section4"

async function main() {
    console.log("=================================================================")
    console.log("     PASS 5: SECTION 4 DRAFT / UNPUBLISHED COURSE AUDIT          ")
    console.log("=================================================================")

    if (!fs.existsSync(ARTIFACT_DIR)) {
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
    }

    const course = await prisma.course.findUnique({
        where: { slug: "ai-course" },
        include: { chapters: { include: { lessons: true } } }
    })

    if (!course) {
        throw new Error("Target course 'ai-course' not found in database!")
    }

    console.log(`[Target Course] ID: ${course.id}, Slug: ${course.slug}, Status: ${course.status}, Published: ${course.isPublished}`)

    const createdUsers: string[] = []
    const createdChapters: string[] = []
    const createdLessons: string[] = []

    const browser = await chromium.launch({ headless: true })

    try {
        // 1. Anonymous test via curl / fetch
        console.log("\n--- 4.2.1: Anonymous visitor ---")
        const anonRes = await fetch(`${BASE_URL}/courses/ai-course`)
        console.log(`Anonymous GET /courses/ai-course -> HTTP ${anonRes.status}`)
        if (anonRes.status !== 404) {
            throw new Error(`Expected 404 for anonymous visitor on draft course, got ${anonRes.status}`)
        }

        // 2. Student (logged in)
        console.log("\n--- 4.2.2: Student (logged in) ---")
        const studentPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const student = await prisma.user.create({
            data: {
                name: "Section4 Student",
                phoneNumber: studentPhone,
                email: `sec4_student_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        createdUsers.push(student.id)

        const studentContext = await browser.newContext()
        const studentPage = await studentContext.newPage()

        await studentPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
        await studentPage.click('button:has-text("Continue with Mobile OTP")')
        await studentPage.fill('input[placeholder="Enter 10-digit mobile number"]', studentPhone)
        await studentPage.click('button:has-text("Get OTP")')
        await studentPage.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })

        const otpBoxes = studentPage.locator('input[inputmode="numeric"]')
        for (let i = 0; i < 6; i++) {
            await otpBoxes.nth(i).click()
            await otpBoxes.nth(i).press(`${i + 1}`)
        }
        await studentPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
        console.log("[Auth] Student logged in successfully")

        const studentRes = await studentPage.goto(`${BASE_URL}/courses/ai-course`)
        const studentStatus = studentRes?.status()
        console.log(`Student GET /courses/ai-course -> HTTP ${studentStatus}`)
        if (studentStatus !== 404) {
            throw new Error(`Expected 404 for student on draft course, got ${studentStatus}`)
        }

        // 3. Student with Enrollment row inserted
        console.log("\n--- 4.2.3: Student with Enrollment row inserted ---")
        await prisma.enrollment.create({
            data: {
                userId: student.id,
                courseId: course.id
            }
        })
        console.log(`Inserted temporary enrollment for student ${student.id} in course ${course.id}`)

        const enrolledRes = await studentPage.goto(`${BASE_URL}/courses/ai-course`)
        const enrolledStatus = enrolledRes?.status()
        console.log(`Enrolled Student GET /courses/ai-course -> HTTP ${enrolledStatus}`)
        if (enrolledStatus !== 404) {
            throw new Error(`Expected 404 for enrolled student on draft course, got ${enrolledStatus}`)
        }

        // 4. Admin (logged in)
        console.log("\n--- 4.2.4: Admin (logged in) ---")
        const adminPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const admin = await prisma.user.create({
            data: {
                name: "Section4 Admin",
                phoneNumber: adminPhone,
                email: `mobile_${adminPhone}@aspirantbook.local`,
                role: "ADMIN"
            }
        })
        createdUsers.push(admin.id)

        const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
        const adminPage = await adminContext.newPage()

        await adminPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
        await adminPage.click('button:has-text("Continue with Mobile OTP")')
        await adminPage.fill('input[placeholder="Enter 10-digit mobile number"]', adminPhone)
        await adminPage.click('button:has-text("Get OTP")')
        await adminPage.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })

        const adminOtpBoxes = adminPage.locator('input[inputmode="numeric"]')
        for (let i = 0; i < 6; i++) {
            await adminOtpBoxes.nth(i).click()
            await adminOtpBoxes.nth(i).press(`${i + 1}`)
        }
        await adminPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
        console.log("[Auth] Admin logged in successfully")

        const adminRes = await adminPage.goto(`${BASE_URL}/courses/ai-course`, { waitUntil: "networkidle" })
        const adminStatus = adminRes?.status()
        console.log(`Admin GET /courses/ai-course -> HTTP ${adminStatus}`)
        if (adminStatus !== 200) {
            throw new Error(`Expected 200 for admin on draft course, got ${adminStatus}`)
        }

        const banner = adminPage.locator('text=Draft Course Preview')
        await banner.first().waitFor({ state: "visible", timeout: 8000 })
        console.log(`✓ Admin banner detected: "${await banner.first().textContent()}"`)

        const screenshotPath = path.join(ARTIFACT_DIR, "draft_preview_admin.png")
        await adminPage.screenshot({ path: screenshotPath, fullPage: true })
        console.log(`✓ Saved Admin Draft Preview screenshot: ${screenshotPath}`)

        // 5. Test Learn Page (/courses/ai-course/learn/<lesson-id>)
        console.log("\n--- 4.3: Learn Page access test ---")
        // Create a temporary chapter and lesson for testing learn page
        const testChapter = await prisma.chapter.create({
            data: {
                title: "Test Draft Chapter",
                courseId: course.id,
                order: 1
            }
        })
        createdChapters.push(testChapter.id)

        const testLesson = await prisma.lesson.create({
            data: {
                title: "Test Draft Lesson 1",
                chapterId: testChapter.id,
                order: 1,
                type: "VIDEO",
                isTrial: true,
                videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            }
        })
        createdLessons.push(testLesson.id)

        // Student hits learn page -> 404
        const studentLearnRes = await studentPage.goto(`${BASE_URL}/courses/ai-course/learn/${testLesson.id}`)
        console.log(`Student GET /courses/ai-course/learn/${testLesson.id} -> HTTP ${studentLearnRes?.status()}`)
        if (studentLearnRes?.status() !== 404) {
            throw new Error(`Expected 404 for student on draft course learn page, got ${studentLearnRes?.status()}`)
        }

        // Admin hits learn page -> 200
        const adminLearnRes = await adminPage.goto(`${BASE_URL}/courses/ai-course/learn/${testLesson.id}`, { waitUntil: "networkidle" })
        console.log(`Admin GET /courses/ai-course/learn/${testLesson.id} -> HTTP ${adminLearnRes?.status()}`)
        if (adminLearnRes?.status() !== 200) {
            throw new Error(`Expected 200 for admin on draft course learn page, got ${adminLearnRes?.status()}`)
        }

        const learnScreenshotPath = path.join(ARTIFACT_DIR, "draft_learn_admin.png")
        await adminPage.screenshot({ path: learnScreenshotPath })
        console.log(`✓ Saved Admin Draft Learn screenshot: ${learnScreenshotPath}`)

        console.log("\n=================================================================")
        console.log("            SECTION 4 VERIFICATION: ALL TESTS PASSED!           ")
        console.log("=================================================================")

    } finally {
        await browser.close()
        console.log("\n--- Cleaning up temporary test artifacts ---")
        if (createdLessons.length > 0) {
            await prisma.lesson.deleteMany({ where: { id: { in: createdLessons } } })
            console.log(`Deleted ${createdLessons.length} temporary test lesson(s)`)
        }
        if (createdChapters.length > 0) {
            await prisma.chapter.deleteMany({ where: { id: { in: createdChapters } } })
            console.log(`Deleted ${createdChapters.length} temporary test chapter(s)`)
        }
        if (createdUsers.length > 0) {
            await prisma.enrollment.deleteMany({ where: { userId: { in: createdUsers } } })
            await prisma.user.deleteMany({ where: { id: { in: createdUsers } } })
            console.log(`Deleted ${createdUsers.length} temporary test user(s)`)
        }
        await prisma.$disconnect()
    }
}

main().catch(err => {
    console.error("FATAL ERROR in Section 4 test:", err)
    process.exit(1)
})
