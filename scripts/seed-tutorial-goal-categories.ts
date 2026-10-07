import { PrismaClient, Difficulty, CourseStatus, LessonType } from "@prisma/client"
import { REQUIRED_GOAL_CATEGORIES } from "../lib/tutorials-goal-categories"
import { assertTestDb } from "../lib/testing/assert-test-db"

process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL

assertTestDb()

const prisma = new PrismaClient()

async function main() {
    console.log("=== SEEDING TUTORIAL GOAL CATEGORIES IDEMPOTENTLY ===")
    console.log(`Total categories to seed: ${REQUIRED_GOAL_CATEGORIES.length}`)

    // For each goal category, ensure an exemplary reference tutorial or category association exists
    for (const cat of REQUIRED_GOAL_CATEGORIES) {
        const slug = `tutorial-seed-${cat.slug}`
        const title = `${cat.name} Foundation & Concepts`
        
        const existing = await prisma.course.findUnique({
            where: { slug }
        })

        if (!existing) {
            await prisma.course.create({
                data: {
                    title,
                    slug,
                    description: `Comprehensive text tutorial curriculum for ${cat.name}. Master core concepts, chapters, and topics.`,
                    technology: cat.name,
                    difficulty: Difficulty.BEGINNER,
                    status: CourseStatus.PUBLISHED,
                    isPublished: true,
                    isPremium: false,
                    price: 0,
                    chapters: {
                        create: {
                            title: `01 Introduction to ${cat.name}`,
                            order: 1,
                            lessons: {
                                create: {
                                    title: `${cat.name} Orientation & Core Syllabus`,
                                    content: `# Welcome to ${cat.name}\n\nThis tutorial provides comprehensive, structured conceptual clarity for ${cat.name}.`,
                                    order: 1,
                                    type: LessonType.READING,
                                    isTrial: true,
                                }
                            }
                        }
                    }
                }
            })
            console.log(`✓ Created goal category tutorial: "${cat.name}" (${cat.slug})`)
        } else {
            await prisma.course.update({
                where: { slug },
                data: {
                    title,
                    technology: cat.name,
                    status: CourseStatus.PUBLISHED,
                    isPublished: true,
                }
            })
            console.log(`✓ Updated goal category tutorial: "${cat.name}" (${cat.slug})`)
        }
    }

    console.log("=== GOAL CATEGORY SEEDING COMPLETE ===")
}

main()
    .catch((e) => {
        console.error("FATAL in seed script:", e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
