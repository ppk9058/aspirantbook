import { prisma } from "../lib/prisma"
import { toSafeCourseDto, toSafeLessonDto } from "../lib/courses/course-dto"

async function main() {
    console.log("=================================================================")
    console.log("       LOCK LEAKAGE TEST: PASS 8 VERIFICATION                   ")
    console.log("=================================================================\n")

    const courseSlug = "72nd-bpsc-prelims-current-affairs"
    const rawCourse = await prisma.course.findUnique({
        where: { slug: courseSlug },
        include: {
            chapters: {
                orderBy: { order: "asc" },
                include: {
                    lessons: {
                        orderBy: { order: "asc" },
                    },
                },
            },
        },
    })

    if (!rawCourse) {
        throw new Error(`Course ${courseSlug} not found in database!`)
    }

    const allLessons = rawCourse.chapters.flatMap((c) => c.lessons)
    const paidLessons = allLessons.filter((l) => !l.isTrial)
    const trialLessons = allLessons.filter((l) => l.isTrial)

    console.log(`Loaded Course: ${rawCourse.title} (${rawCourse.slug.slice(0, 8)}...)`)
    console.log(`Total Lessons: ${allLessons.length}`)
    console.log(`Paid Lessons : ${paidLessons.length}`)
    console.log(`Trial Lessons: ${trialLessons.length}\n`)

    if (paidLessons.length === 0) {
        throw new Error("No paid lessons found to test!")
    }

    // 1. Check Course Overview Safe DTO (allowTrialMedia = false when hasAccess = false)
    console.log("--- 1. Testing Course Overview Page DTO (allowTrialMedia = false) ---")
    const safeOverviewUnpaid = toSafeCourseDto(rawCourse, false, false)
    const overviewLessons = safeOverviewUnpaid.chapters.flatMap((c) => c.lessons)

    let overviewLeaks = 0
    for (const l of overviewLessons) {
        if (l.videoUrl !== null) {
            console.error(`FAIL: Overview DTO leaked videoUrl on lesson ${l.id.slice(0, 8)} (${l.title})`)
            overviewLeaks++
        }
        if (l.attachmentUrl !== null) {
            console.error(`FAIL: Overview DTO leaked attachmentUrl on lesson ${l.id.slice(0, 8)} (${l.title})`)
            overviewLeaks++
        }
        if (l.content !== null) {
            console.error(`FAIL: Overview DTO leaked content on lesson ${l.id.slice(0, 8)} (${l.title})`)
            overviewLeaks++
        }
    }

    if (overviewLeaks > 0) {
        throw new Error(`Overview DTO had ${overviewLeaks} leaks!`)
    }
    console.log("✓ Overview DTO completely stripped ALL media and attachments for unpaid visitors (0 leaks).")

    // 2. Check Player Safe DTO (allowTrialMedia = true)
    console.log("\n--- 2. Testing Player Page DTO (allowTrialMedia = true) ---")
    const safePlayerUnpaid = toSafeCourseDto(rawCourse, false, true)
    const playerLessons = safePlayerUnpaid.chapters.flatMap((c) => c.lessons)

    let playerPaidLeaks = 0
    let playerTrialPreserved = 0

    for (const l of playerLessons) {
        if (l.isTrial) {
            if (l.videoUrl !== null) playerTrialPreserved++
        } else {
            if (l.videoUrl !== null || l.attachmentUrl !== null || l.content !== null) {
                console.error(`FAIL: Player DTO leaked media on paid lesson ${l.id.slice(0, 8)}`)
                playerPaidLeaks++
            }
        }
    }

    if (playerPaidLeaks > 0) {
        throw new Error(`Player DTO leaked ${playerPaidLeaks} paid lessons!`)
    }
    console.log(`✓ Paid lessons in Player DTO are 100% stripped of media (0 leaks).`)
    console.log(`✓ Trial lessons preserve preview video for trial player (${playerTrialPreserved} trial videos).`)

    // 3. Check Enrolled / Paid Student (hasAccess = true)
    console.log("\n--- 3. Testing Enrolled Viewer (hasAccess = true) ---")
    const safeEnrolled = toSafeCourseDto(rawCourse, true, true)
    const enrolledLessons = safeEnrolled.chapters.flatMap((c) => c.lessons)

    const paidLessonWithVideoInDb = paidLessons.find((l) => l.videoUrl !== null)
    if (paidLessonWithVideoInDb) {
        const corresponding = enrolledLessons.find((l) => l.id === paidLessonWithVideoInDb.id)
        if (!corresponding?.videoUrl) {
            throw new Error(`Enrolled student was blocked from video on paid lesson ${paidLessonWithVideoInDb.id.slice(0, 8)}`)
        }
        console.log(`✓ Enrolled student has full video access on paid lessons (${corresponding.videoUrl.slice(0, 20)}...).`)
    }

    console.log("\n=================================================================")
    console.log("       LOCK LEAKAGE PASS 8 TEST: ALL ASSERTIONS PASSED           ")
    console.log("=================================================================\n")
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("Test failed with error:", e)
        process.exit(1)
    })
