import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Simulating Admin Assessment Creation...")

    // 1. Create Assessment (Simulating Admin Form Submit)
    const assessment = await prisma.assessment.create({
        data: {
            title: "System Design Verification Test",
            slug: "system-design-test",
            description: "Verifying the admin-student data flow",
            technology: "System Design",
            difficulty: "ADVANCED",
            duration: 60,
            passingScore: 75,
            isPublished: true, // Simulating "Publish" click
            questions: {
                create: [
                    {
                        type: "MULTIPLE_CHOICE",
                        question: "Which component is responsible for data persistence?",
                        options: ["Frontend", "Backend API", "Database", "Load Balancer"],
                        correctAnswer: "2",
                        points: 10,
                        order: 1,
                    },
                    {
                        type: "FILL_BLANK",
                        question: "CAP theorem stands for Consistency, Availability, and _______",
                        correctAnswer: "Partition Tolerance",
                        points: 10,
                        order: 2,
                    }
                ]
            }
        }
    })

    console.log(`✅ Assessment Created: ${assessment.title} (${assessment.id})`)
    console.log("Please verify this appears in:")
    console.log("1. Admin List: http://localhost:3000/admin/assessments")
    console.log("2. Student Catalog: http://localhost:3000/assessments")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
