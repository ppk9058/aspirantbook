import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Creating admin user...")

        const hashedPassword = await bcrypt.hash("admin123", 10)

        const admin = await prisma.user.upsert({
            where: { email: "admin@aspirantbook.com" },
            update: {
                role: "ADMIN",
            },
            create: {
                email: "admin@aspirantbook.com",
                password: hashedPassword,
                name: "Admin User",
                role: "ADMIN",
            },
        })

        console.log("✅ Admin user created/updated:")
        console.log("   Email:", admin.email)
        console.log("   Password: admin123")
        console.log("   Role:", admin.role)
    } catch (error) {
        console.error("Error:", error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
