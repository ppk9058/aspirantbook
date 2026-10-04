import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Connecting to database...")
        const users = await prisma.user.findMany()
        console.log("Total users:", users.length)
        users.forEach(u => {
            console.log("-", u.email, u.role)
        })
    } catch (error) {
        console.error("Database error:", error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
