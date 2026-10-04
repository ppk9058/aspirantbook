import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

const USERS = [
    {
        email: "student@aspirantbook.com",
        name: "Rahul Sharma",
        role: "FREE" as const,
        password: "Test@123",
    },
    {
        email: "teacher@aspirantbook.com",
        name: "Prof. Rajesh Sharma",
        role: "TEACHER" as const,
        password: "Test@123",
    },
    {
        email: "admin@aspirantbook.com",
        name: "Admin Authority",
        role: "ADMIN" as const,
        password: "Test@123",
    },
]

async function main() {
    console.log("🔐 Seeding RBAC users...\n")

    for (const userData of USERS) {
        const hashedPassword = await bcrypt.hash(userData.password, 10)

        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                name: userData.name,
                role: userData.role,
                password: hashedPassword,
            },
            create: {
                email: userData.email,
                name: userData.name,
                role: userData.role,
                password: hashedPassword,
            },
        })

        const roleEmoji =
            userData.role === "ADMIN" ? "🛡️" :
            userData.role === "TEACHER" ? "👨‍🏫" : "🎓"

        console.log(`${roleEmoji}  ${userData.role.padEnd(8)} | ${user.email} | password: ${userData.password} | id: ${user.id}`)
    }

    console.log("\n✅ All 3 RBAC users created/updated successfully!")
    console.log("\n📋 Login credentials:")
    console.log("   Student  → student@aspirantbook.com  / Test@123")
    console.log("   Teacher  → teacher@aspirantbook.com  / Test@123")
    console.log("   Admin    → admin@aspirantbook.com    / Test@123")
}

main()
    .catch((error) => {
        console.error("❌ Seed failed:", error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
