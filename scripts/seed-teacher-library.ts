import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()

export async function seedTeacherLibrary() {
  const jsonPath = path.join(process.cwd(), "data", "teacher-library.json")
  if (!fs.existsSync(jsonPath)) {
    console.log("No data/teacher-library.json found to seed.")
    return
  }

  const raw = fs.readFileSync(jsonPath, "utf-8")
  const teachers = JSON.parse(raw)

  console.log(`Importing ${teachers.length} teachers from ${jsonPath}...`)

  for (const t of teachers) {
    await prisma.teacher.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        nameHi: t.nameHi || null,
        role: t.role || null,
        roleHi: t.roleHi || null,
        avatar: t.avatar || t.photo || null,
        credentials: t.credentials || [],
        credentialsHi: t.credentialsHi || [],
        bio: t.bio || null,
        bioHi: t.bioHi || null,
      },
      create: {
        id: t.id,
        name: t.name,
        nameHi: t.nameHi || null,
        role: t.role || null,
        roleHi: t.roleHi || null,
        avatar: t.avatar || t.photo || null,
        credentials: t.credentials || [],
        credentialsHi: t.credentialsHi || [],
        bio: t.bio || null,
        bioHi: t.bioHi || null,
      },
    })
    console.log(`  ✓ Upserted teacher: ${t.id} (${t.name})`)
  }

  console.log("Teacher library import completed successfully.")
}

if (require.main === module) {
  seedTeacherLibrary()
    .catch((err) => {
      console.error("Failed to seed teacher library:", err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
