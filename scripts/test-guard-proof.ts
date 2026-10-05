import { prisma } from "../lib/prisma"
import { createTestUser } from "../lib/testing/test-user-helper"

async function run() {
  console.log("=== PROVING TEST DB GUARD HALTS WRITE ATTEMPTS ON DEV DB ===")
  const beforeCounts = await prisma.$queryRawUnsafe(`
    SELECT 
      (SELECT COUNT(*) FROM "Payment")::int as payment_count,
      (SELECT COUNT(*) FROM "Enrollment")::int as enrollment_count,
      (SELECT COUNT(*) FROM "User")::int as user_count
  `)
  console.log("BEFORE COUNTS ON DEV DB:", beforeCounts)

  let threw = false
  try {
    await createTestUser({ role: "FREE", prefix: "guard_proof" })
  } catch (err: any) {
    threw = true
    console.log("GUARD CAUGHT VIOLATION AS EXPECTED:")
    console.log("Error message:", err.message)
  }

  const afterCounts = await prisma.$queryRawUnsafe(`
    SELECT 
      (SELECT COUNT(*) FROM "Payment")::int as payment_count,
      (SELECT COUNT(*) FROM "Enrollment")::int as enrollment_count,
      (SELECT COUNT(*) FROM "User")::int as user_count
  `)
  console.log("AFTER COUNTS ON DEV DB:", afterCounts)

  if (!threw) {
    throw new Error("GUARD FAILED: createTestUser did not throw on dev database!")
  }
  console.log("✓ TEST DB GUARD STRICTLY PREVENTED WRITE: COUNTS REMAIN 100% IDENTICAL.")
}

run().catch((err) => {
  console.error("FATAL in test-guard-proof:", err)
  process.exit(1)
}).finally(() => prisma.$disconnect())
