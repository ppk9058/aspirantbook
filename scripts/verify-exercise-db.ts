import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Verifying Exercise Creation (Direct DB)...")

    try {
        // 1. Create Exercise
        const exercise = await prisma.exercise.create({
            data: {
                title: "Script Verified Exercise",
                slug: "script-verified-exercise",
                instructions: "Created via verification script",
                language: "python",
                difficulty: "INTERMEDIATE",
                starterCode: "def solve(): pass",
                solution: "def solve(): return True",
                testCases: {
                    create: [
                        { input: "1", expectedOutput: "1", isHidden: false },
                        { input: "2", expectedOutput: "2", isHidden: true }
                    ]
                }
            },
            include: { testCases: true }
        })

        console.log(`✅ Exercise Created: ${exercise.title} (${exercise.id})`)
        console.log(`- Test Cases: ${exercise.testCases.length}`)

        // 2. Update Exercise (Simulate update logic)
        console.log("Verifying Exercise Update...")

        // Delete existing cases
        await prisma.testCase.deleteMany({ where: { exerciseId: exercise.id } })

        // Create new cases
        await prisma.testCase.createMany({
            data: [
                { input: "3", expectedOutput: "3", isHidden: false, exerciseId: exercise.id },
                { input: "4", expectedOutput: "4", isHidden: false, exerciseId: exercise.id },
                { input: "5", expectedOutput: "5", isHidden: true, exerciseId: exercise.id }
            ]
        })

        const updated = await prisma.exercise.findUnique({
            where: { id: exercise.id },
            include: { testCases: true }
        })

        console.log(`✅ Exercise Updated`)
        console.log(`- New Test Cases: ${updated?.testCases.length}`)

        if (updated?.testCases.length !== 3) {
            throw new Error("Update failed: Incorrect number of test cases")
        }

        // Cleanup
        await prisma.exercise.delete({ where: { id: exercise.id } })
        console.log("✅ Cleanup complete")

    } catch (error) {
        console.error("❌ Verification Failed:", error)
        process.exit(1)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
