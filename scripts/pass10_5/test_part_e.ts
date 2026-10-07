import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { execSync } from "child_process";

const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const BASE_URL = "http://127.0.0.1:3045";
const REAL_SECRET = "aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b";

async function main() {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const timestamp = new Date().toISOString();

  console.log("================================================================================");
  console.log("PART E: SENSITIVE DATA LEAK SCAN WITH EXACT HIT COUNTS");
  console.log(`Commit: ${commit}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("Database: postgresql://***@127.0.0.1:54329/trillionskill_test");
  console.log("================================================================================");

  const prisma = new PrismaClient({ datasources: { db: { url: DOCKER_DB_URL } } });

  // 1. Seed sensitive patterns in TEST DB
  const seedEmailA = "student_canary_a@secretleak.test";
  const seedPhoneA = "9876500001";
  const seedNameA = "CanaryStudentAlpha";

  const seedEmailB = "student_canary_b@secretleak.test";
  const seedPhoneB = "9876500002";
  const seedNameB = "CanaryStudentBeta";

  console.log("\n--- SECTION E.1: SEEDING CANARY CONTENT ON TEST DB ---");
  await prisma.user.upsert({
    where: { email: seedEmailA },
    update: {},
    create: {
      id: "u_canary_a",
      email: seedEmailA,
      name: seedNameA,
      phoneNumber: seedPhoneA,
      role: "FREE",
    }
  });

  await prisma.user.upsert({
    where: { email: seedEmailB },
    update: {},
    create: {
      id: "u_canary_b",
      email: seedEmailB,
      name: seedNameB,
      phoneNumber: seedPhoneB,
      role: "FREE",
    }
  });

  const patterns = [
    { name: "videoUrl", regex: /https?:\/\/[^\s"']+\.(mp4|m3u8|webm)/gi },
    { name: "hlsUrl", regex: /https?:\/\/[^\s"']+\.m3u8/gi },
    { name: "muxPlaybackId", regex: /mux\.com|playback-id/gi },
    { name: "telegramToken", regex: /api\.telegram\.org|bot[0-9]{9}:[a-zA-Z0-9_-]{35}/gi },
    { name: "correctOption", regex: /"correctOption":|"isCorrect":true/gi },
    { name: "password_hash", regex: /\$2[aby]\$[0-9]{2}\$[a-zA-Z0-9./]{53}/gi },
    { name: "userEmailB", regex: new RegExp(seedEmailB, "gi") },
    { name: "userPhoneB", regex: new RegExp(seedPhoneB, "gi") },
    { name: "userNameB", regex: new RegExp(seedNameB, "gi") },
  ];

  console.log("Patterns monitored:");
  for (const p of patterns) console.log(`  - ${p.name}`);

  const testRoutes = [
    "/dashboard",
    "/my-tests",
    "/my-learning",
    "/books",
    "/books/cart",
    "/courses",
    "/courses/72nd-bpsc-prelims-current-affairs",
    "/test-series",
    "/tutorials",
    "/current-affairs-quizzes"
  ];

  console.log("\n--- SECTION E.2: SCAN MATRIX (ANONYMOUS & LOGGED-IN AS STUDENT A) ---");
  console.log(String("Target URL").padEnd(45) + String("Surface").padEnd(12) + String("Pattern").padEnd(18) + "Count");
  console.log("-".repeat(85));

  const tokenA = await encode({
    token: { id: "u_canary_a", role: "FREE", email: seedEmailA, name: seedNameA },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  let totalLeaksDetected = 0;

  for (const route of testRoutes) {
    // 1. Anonymous HTML
    const htmlAnon = execSync(`curl -s "${BASE_URL}${route}"`, { encoding: "utf8" });
    // 2. Anonymous RSC
    const rscAnon = execSync(`curl -s -H "RSC: 1" "${BASE_URL}${route}"`, { encoding: "utf8" });
    // 3. Logged-in Student A HTML
    const htmlAuth = execSync(`curl -s "${BASE_URL}${route}" -H "Cookie: authjs.session-token=${tokenA}"`, { encoding: "utf8" });

    for (const pat of patterns) {
      const matchHtmlAnon = (htmlAnon.match(pat.regex) || []).length;
      const matchRscAnon = (rscAnon.match(pat.regex) || []).length;
      const matchHtmlAuth = (htmlAuth.match(pat.regex) || []).length;

      if (matchHtmlAnon > 0) totalLeaksDetected += matchHtmlAnon;
      if (matchRscAnon > 0) totalLeaksDetected += matchRscAnon;
      if (matchHtmlAuth > 0 && pat.name.includes("B")) totalLeaksDetected += matchHtmlAuth;

      console.log(
        String(route).padEnd(45) +
        String("HTML(Anon)").padEnd(12) +
        String(pat.name).padEnd(18) +
        matchHtmlAnon
      );
      console.log(
        String(route).padEnd(45) +
        String("RSC(Anon)").padEnd(12) +
        String(pat.name).padEnd(18) +
        matchRscAnon
      );
      console.log(
        String(route).padEnd(45) +
        String("HTML(AuthA)").padEnd(12) +
        String(pat.name).padEnd(18) +
        matchHtmlAuth
      );
    }
  }

  // Cleanup canary users
  await prisma.user.deleteMany({
    where: { email: { in: [seedEmailA, seedEmailB] } }
  });
  await prisma.$disconnect();

  console.log(`\nTOTAL LEAKS DETECTED ACROSS ALL SURFACES: ${totalLeaksDetected}`);
  console.log("\n================================================================================");
  console.log("PART E VERIFICATION COMPLETE");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Error in Part E:", err);
  process.exit(1);
});
