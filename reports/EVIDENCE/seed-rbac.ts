import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "FinalVerify#2026";

const users = [
  { email: "fv.free@example.test", name: "FV Free", role: "FREE" },
  { email: "fv.premium@example.test", name: "FV Premium", role: "PREMIUM" },
  { email: "fv.teacher.a@example.test", name: "Teacher A", role: "TEACHER" },
  { email: "fv.teacher.b@example.test", name: "Teacher B", role: "TEACHER" },
  { email: "fv.admin@example.test", name: "FV Admin", role: "ADMIN" },
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  for (const u of users) {
    const saved = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role as any, password: hash, isActive: true, emailVerified: new Date(), lockedUntil: null, failedLoginAttempts: 0 },
      create: {
        email: u.email,
        name: u.name,
        role: u.role as any,
        password: hash,
        isActive: true,
        emailVerified: new Date(),
        sessionVersion: 1,
      },
      select: { id: true, email: true, role: true },
    });
    console.log(`${saved.role}\t${saved.email}\t${saved.id}`);
  }
}
main().finally(() => prisma.$disconnect());
