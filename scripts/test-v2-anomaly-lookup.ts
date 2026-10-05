import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP V2: VERIFICATION OF THE PASS 8.3 ANOMALY TABLE IDS ===");
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // The 23 "enrollmentId" strings that appeared in the Pass 8.3 report table
  const pass83Ids = [
    "clw1673y200313b6w52w43q8e",
    "clw1673y200333b6w52w43q0g",
    "clw1673y200353b6w52w43q2i",
    "clw1673y200373b6w52w43q4k",
    "clw1673y200393b6w52w43q6m",
    "clyg8am15000v08l50fuv9whw",
    "clyg9442g000008l10qvyev2z",
    "clyga1pkm000008lagb77b7g0",
    "clyga2w7i000008jo1j66hffv",
    "clygdcvu9000008kzfmj6d41q",
    "cltest_enr_p1",
    "cltest_enr_p2",
    "cltest_enr_p3",
    "cltest_enr_p4",
    "cmg1111111112",
    "cmg1111111113",
    "cly1111111112",
    "cly1111111113",
    "cly1111111114",
    "cly1111111115",
    "cly1111111116",
    "cly1111111117",
    "cly1111111118",
  ];

  const results = [];
  const notFoundList = [];

  for (const id of pass83Ids) {
    const enr = await prisma.enrollment.findUnique({
      where: { id },
      select: {
        id: true,
        courseId: true,
        userId: true,
        enrolledAt: true,
      },
    });

    if (enr) {
      results.push({
        id,
        status: "FOUND",
        courseId: enr.courseId,
        userId: enr.userId,
        enrolledAt: enr.enrolledAt.toISOString(),
      });
    } else {
      results.push({
        id,
        status: "NOT FOUND",
        courseId: "N/A",
        userId: "N/A",
        enrolledAt: "N/A",
      });
      notFoundList.push(id);
    }
  }

  console.log("\n--- LOOKUP RESULTS FOR PASS 8.3 ANOMALY IDS ---");
  console.table(results);

  console.log(`\n--- NOT FOUND TABLE (${notFoundList.length} of ${pass83Ids.length} NOT FOUND) ---`);
  console.table(notFoundList.map(id => ({ missingId: id })));
}

run()
  .catch((err) => {
    console.error("FATAL in test-v2-anomaly-lookup:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
