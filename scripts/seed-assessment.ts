import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Creating test assessment...")

    // Create assessment
    const assessment = await prisma.assessment.create({
        data: {
            title: "Python Basics Assessment",
            slug: "python-basics-test",
            description: "Test your knowledge of Python fundamentals including variables, data types, and basic operations.",
            duration: 30, // 30 minutes
            passingScore: 70,
            technology: "Python",
            difficulty: "BEGINNER",
            isPublished: true,
            questions: {
                create: [
                    {
                        type: "MULTIPLE_CHOICE",
                        question: "What is the correct way to create a variable in Python?",
                        options: [
                            "var x = 5",
                            "x = 5",
                            "int x = 5",
                            "let x = 5"
                        ],
                        correctAnswer: "1", // Index of correct answer
                        explanation: "In Python, you simply assign a value to a variable name without declaring its type.",
                        points: 10,
                        order: 1,
                    },
                    {
                        type: "MULTIPLE_CHOICE",
                        question: "Which of the following is NOT a valid Python data type?",
                        options: [
                            "int",
                            "float",
                            "char",
                            "str"
                        ],
                        correctAnswer: "2",
                        explanation: "Python doesn't have a 'char' data type. Single characters are strings.",
                        points: 10,
                        order: 2,
                    },
                    {
                        type: "FILL_BLANK",
                        question: "Complete the code: print(_____ + ' World') to output 'Hello World'",
                        correctAnswer: "'Hello'",
                        explanation: "You need to concatenate the string 'Hello' with ' World'.",
                        points: 10,
                        order: 3,
                    },
                    {
                        type: "CODE_OUTPUT",
                        question: "What will be the output of the following code?\n\nx = 10\ny = 5\nprint(x + y)",
                        correctAnswer: "15",
                        explanation: "The code adds 10 and 5, resulting in 15.",
                        points: 10,
                        order: 4,
                    },
                    {
                        type: "CODE_COMPLETION",
                        question: "Write a function that returns the sum of two numbers:",
                        correctAnswer: "def add(a, b):\n    return a + b",
                        explanation: "A simple function that takes two parameters and returns their sum.",
                        points: 20,
                        order: 5,
                    },
                ],
            },
        },
        include: {
            questions: true,
        },
    })

    console.log("✅ Assessment created successfully!")
    console.log(`Assessment ID: ${assessment.id}`)
    console.log(`Questions created: ${assessment.questions.length}`)
    console.log("\nYou can now test the assessment at:")
    console.log(`http://localhost:3000/assessments`)
}

main()
    .catch((e) => {
        console.error("Error:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
