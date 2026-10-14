import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import { seedCanonicalTestUsers, DEFAULT_TEST_PASSWORD } from "../tests/support/test-credentials"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("🔐 Seeding canonical RBAC and test users...\n")
  const seeded = await seedCanonicalTestUsers(prisma)

  for (const user of seeded) {
    const roleEmoji =
      user.role === "ADMIN" ? "🛡️" :
      user.role === "TEACHER" ? "👨‍🏫" : "🎓"
    console.log(`${roleEmoji}  ${user.role.padEnd(8)} | ${user.email} | password: ${DEFAULT_TEST_PASSWORD} | id: ${user.id}`)
  }

  console.log(`\n✅ All ${seeded.length} canonical test users created/updated successfully!`)
  console.log(`\n📋 Unified test password: ${DEFAULT_TEST_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
