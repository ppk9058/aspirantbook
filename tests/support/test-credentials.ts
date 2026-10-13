import bcrypt from "bcryptjs"
import { PrismaClient, UserRole } from "@prisma/client"

export const DEFAULT_TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "Test@123"

export interface SeedUserConfig {
  email: string
  name: string
  role: UserRole
  password?: string
  selectedGoal?: string
}

export const CANONICAL_TEST_USERS: SeedUserConfig[] = [
  {
    email: "admin@aspirantbook.com",
    name: "Admin Authority",
    role: "ADMIN",
    selectedGoal: "bpsc",
  },
  {
    email: "admin@trillionskills.com",
    name: "Admin User",
    role: "ADMIN",
    selectedGoal: "bpsc",
  },
  {
    email: "teacher@aspirantbook.com",
    name: "Prof. Rajesh Sharma",
    role: "TEACHER",
    selectedGoal: "bpsc",
  },
  {
    email: "student@aspirantbook.com",
    name: "Rahul Sharma",
    role: "FREE",
    selectedGoal: "bpsc",
  },
  {
    email: "adminuser@example.com",
    name: "Admin Example User",
    role: "ADMIN",
    selectedGoal: "bpsc",
  },
  {
    email: "freeuser1@example.com",
    name: "Free User One",
    role: "FREE",
    selectedGoal: "bpsc",
  },
  {
    email: "freeuser2@example.com",
    name: "Free User Two",
    role: "FREE",
    selectedGoal: "bpsc",
  },
  {
    email: "premiumuser@example.com",
    name: "Premium User",
    role: "PREMIUM",
    selectedGoal: "bpsc",
  },
]

function assertNotProduction(datasourceUrl?: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[SECURITY GUARD] Test credential seeding is forbidden in production environment!")
  }
  const dbUrl = datasourceUrl || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || ""
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl)
      if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
        throw new Error(`[SECURITY GUARD] Test credential seeding only permitted on local/test DB (got: ${parsed.hostname})`)
      }
    } catch (e: any) {
      if (e.message.startsWith("[SECURITY GUARD]")) throw e
    }
  }
}

/**
 * Idempotently seeds or updates all canonical test users with a unified password.
 */
export async function seedCanonicalTestUsers(prismaClient: PrismaClient, customPassword?: string) {
  assertNotProduction()
  const password = customPassword || DEFAULT_TEST_PASSWORD
  const hashedPassword = await bcrypt.hash(password, 10)

  const results = []
  for (const u of CANONICAL_TEST_USERS) {
    const user = await prismaClient.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: hashedPassword,
        selectedGoal: u.selectedGoal || "bpsc",
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hashedPassword,
        selectedGoal: u.selectedGoal || "bpsc",
      },
    })
    results.push({ email: user.email, role: user.role, id: user.id })
  }
  return results
}
