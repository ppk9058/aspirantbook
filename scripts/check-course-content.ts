import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { prisma } from "@/lib/prisma"

async function checkCourseContent() {
    const courses = await prisma.course.findMany({
        include: {
            chapters: {
                include: {
                    lessons: true
                }
            }
        }
    })

    console.log(`Found ${courses.length} courses`)

    for (const course of courses) {
        console.log(`\nCourse: ${course.title} (${course.slug})`)
        console.log(`Status: ${course.status}`)
        console.log(`Chapters: ${course.chapters.length}`)

        for (const chapter of course.chapters) {
            console.log(`  - Chapter: ${chapter.title} (${chapter.lessons.length} lessons)`)
            for (const lesson of chapter.lessons) {
                console.log(`    - Lesson: ${lesson.title}`)
            }
        }
    }
}

checkCourseContent()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
