import { PrismaClient } from "@prisma/client";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "";

const parsed = new URL(TEST_DATABASE_URL);
if (
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  parsed.port !== "54329" ||
  !parsed.pathname.endsWith("/trillionskill_test")
) {
  throw new Error("Refusing to reset: TARGET IS NOT THE DOCKER TEST DATABASE (127.0.0.1:54329/trillionskill_test).");
}

const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });

async function reset() {
  await prisma.examAttemptAnswer.deleteMany({});
  await prisma.examAttempt.deleteMany({});
  await prisma.examQuestion.deleteMany({});
  await prisma.examSection.deleteMany({});
  await prisma.examTest.deleteMany({});
  await prisma.examSeriesEnrollment.deleteMany({});
  await prisma.examSeries.deleteMany({});
  console.log("Docker test DB catalogue tables successfully emptied for real-only-series-catalogue spec.");
  await prisma.$disconnect();
}

reset().catch((e) => {
  console.error("Reset error:", e);
  process.exit(1);
});
