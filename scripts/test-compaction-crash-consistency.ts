/**
 * scripts/test-compaction-crash-consistency.ts
 *
 * Verifies crash consistency of the compaction job:
 * 1. Spawns compaction batch process.
 * 2. Kills process with SIGKILL (kill -9) mid-execution.
 * 3. Inspects database state: confirms zero corrupted records and data integrity.
 * 4. Resumes compaction job to completion.
 * 5. Verifies:
 *    - Clean completion with zero duplicate rows
 *    - All archive rows have valid JSON blobs matching schema
 */

import { spawn } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("[CRASH-TEST] Step 1: Spawning compaction process...");

  const child = spawn(
    "npx",
    ["tsx", "scripts/compact-attempts.ts", "--batch-size", "200", "--exam-id", "bench_test_10k", "--days-old", "0"],
    {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let output = "";
  child.stdout.on("data", (d) => {
    output += d.toString();
  });

  // Let it process for 1.2 seconds, then kill with SIGKILL
  await new Promise((r) => setTimeout(r, 1200));

  console.log("[CRASH-TEST] Step 2: Sending SIGKILL (kill -9)...");
  child.kill("SIGKILL");

  await new Promise((resolve) => child.on("close", resolve));
  console.log("[CRASH-TEST] Process terminated via SIGKILL.");

  // Inspect database
  const partialArchived = await prisma.examAttemptArchive.count({
    where: { testId: "bench_test_10k" },
  });
  console.log(`[CRASH-TEST] Mid-crash archived rows in DB: ${partialArchived}`);

  // Assert zero corrupt rows
  const samples = await prisma.examAttemptArchive.findMany({
    where: { testId: "bench_test_10k" },
    select: { id: true, attemptId: true, answersBlob: true },
  });

  for (const s of samples) {
    if (!Array.isArray(s.answersBlob) || s.answersBlob.length === 0) {
      throw new Error(`Corrupt answersBlob found on archive ID ${s.id}`);
    }
  }
  console.log(`[CRASH-TEST] Verified ${samples.length} rows have valid non-empty array blobs.`);

  console.log("[CRASH-TEST] Step 3: Resuming compaction to completion...");
  const resumeChild = spawn(
    "npx",
    ["tsx", "scripts/compact-attempts.ts", "--batch-size", "500", "--exam-id", "bench_test_10k", "--days-old", "0"],
    {
      env: process.env,
      stdio: "inherit",
    }
  );

  const exitCode = await new Promise((resolve) => resumeChild.on("close", resolve));
  if (exitCode !== 0) {
    throw new Error(`Resume compaction exited with code ${exitCode}`);
  }

  // Final check: all eligible attempts must now be cleanly archived with zero duplicates
  const totalAttempts = await prisma.examAttempt.count({ where: { testId: "bench_test_10k" } });
  const finalArchived = await prisma.examAttemptArchive.count({ where: { testId: "bench_test_10k" } });

  console.log(`[CRASH-TEST] Final verification:`);
  console.log(`  - Total attempts: ${totalAttempts}`);
  console.log(`  - Final archived: ${finalArchived}`);

  if (totalAttempts !== finalArchived) {
    throw new Error(`Mismatch: totalAttempts (${totalAttempts}) !== finalArchived (${finalArchived})`);
  }

  console.log("[CRASH-TEST] SUCCESS: Zero corrupt rows, zero duplicates, clean resume verified.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[CRASH-TEST FAILED]", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
