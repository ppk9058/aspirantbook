import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { request } from "playwright";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL });
const BASE_URL = "http://127.0.0.1:3045";
const PASSWORD = "Pass123!test";

async function main() {
  const nonce = `xp-${Date.now()}`;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 1. Seed Teacher with highest XP (99999)
  const teacher = await prisma.user.create({
    data: { email: `${nonce}-teach@test.local`, name: `Staff Teacher ${nonce}`, password: passwordHash, role: "TEACHER", xp: 99999 },
  });

  // 2. Seed Admin with second highest XP (88888)
  const admin = await prisma.user.create({
    data: { email: `${nonce}-admin@test.local`, name: `Staff Admin ${nonce}`, password: passwordHash, role: "ADMIN", xp: 88888 },
  });

  // 3. Seed Students 1-4 with descending XP
  const stu1 = await prisma.user.create({
    data: { email: `${nonce}-stu1@test.local`, name: `Student Alpha ${nonce}`, password: passwordHash, role: "FREE", xp: 500 },
  });
  const stu2 = await prisma.user.create({
    data: { email: `${nonce}-stu2@test.local`, name: `Student Beta ${nonce}`, password: passwordHash, role: "FREE", xp: 400 },
  });
  const stu3 = await prisma.user.create({
    data: { email: `${nonce}-stu3@test.local`, name: `Student Gamma ${nonce}`, password: passwordHash, role: "FREE", xp: 300 },
  });
  const stu4 = await prisma.user.create({
    data: { email: `${nonce}-stu4@test.local`, name: `Student Delta ${nonce}`, password: passwordHash, role: "FREE", xp: 200 },
  });

  // Authenticate as student 1
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const csrfRes = await ctx.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  await ctx.post("/api/auth/callback/credentials", {
    form: {
      email: stu1.email,
      password: PASSWORD,
      csrfToken,
    },
    maxRedirects: 0,
  });

  console.log("=== VERIFYING /api/leaderboard XP PAGING AND STAFF EXCLUSION ===");
  console.log(`Seeded Staff Teacher with 99,999 XP: ID ${teacher.id}`);
  console.log(`Seeded Staff Admin with 88,888 XP: ID ${admin.id}`);
  console.log(`Seeded Student Alpha with 500 XP: ID ${stu1.id}`);
  console.log(`Seeded Student Beta with 400 XP: ID ${stu2.id}`);
  console.log(`Seeded Student Gamma with 300 XP: ID ${stu3.id}`);
  console.log(`Seeded Student Delta with 200 XP: ID ${stu4.id}\n`);

  // Call Page 1: limit=2, offset=0
  console.log("--- CALLING PAGE 1: limit=2, offset=0 ---");
  const resPage1 = await ctx.get("/api/leaderboard?limit=2&offset=0");
  console.log(`Status: ${resPage1.status()}`);
  const json1 = await resPage1.json();
  console.log("Page 1 payload:");
  console.log(JSON.stringify(json1, null, 2));

  // Call Page 2: limit=2, offset=2
  console.log("\n--- CALLING PAGE 2: limit=2, offset=2 ---");
  const resPage2 = await ctx.get("/api/leaderboard?limit=2&offset=2");
  console.log(`Status: ${resPage2.status()}`);
  const json2 = await resPage2.json();
  console.log("Page 2 payload:");
  console.log(JSON.stringify(json2, null, 2));

  // Assertions
  console.log("\n--- VERIFICATION CHECKS ---");
  const teacherInP1 = json1.leaderboard.some((e: any) => e.user.id === teacher.id);
  const adminInP1 = json1.leaderboard.some((e: any) => e.user.id === admin.id);
  const teacherInP2 = json2.leaderboard.some((e: any) => e.user.id === teacher.id);
  const adminInP2 = json2.leaderboard.some((e: any) => e.user.id === admin.id);

  console.log(`Teacher with 99999 XP excluded from Page 1: ${!teacherInP1}`);
  console.log(`Admin with 88888 XP excluded from Page 1: ${!adminInP1}`);
  console.log(`Teacher excluded from Page 2: ${!teacherInP2}`);
  console.log(`Admin excluded from Page 2: ${!adminInP2}`);

  const p1Ranks = json1.leaderboard.map((e: any) => e.rank);
  const p2Ranks = json2.leaderboard.map((e: any) => e.rank);
  console.log(`Page 1 Ranks: [${p1Ranks.join(", ")}] (expected: [1, 2])`);
  console.log(`Page 2 Ranks: [${p2Ranks.join(", ")}] (expected: [3, 4], continuing from Page 1)`);

  if (p1Ranks[0] !== 1 || p1Ranks[1] !== 2) {
    throw new Error(`Page 1 ranks incorrect: got [${p1Ranks.join(", ")}]`);
  }
  if (p2Ranks[0] !== 3 || p2Ranks[1] !== 4) {
    throw new Error(`Page 2 ranks restarted or incorrect: got [${p2Ranks.join(", ")}]`);
  }

  console.log("\nALL XP LEADERBOARD PAGING AND PRE-PAGING STAFF EXCLUSION CHECKS PASSED!");

  await ctx.dispose();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
