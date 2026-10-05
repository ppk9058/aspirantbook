import { assertTestDb } from "../lib/testing/assert-test-db";
import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP A4: STRICT TEST DB GUARD PROOF (ALL 6 CASES) ===");

  // Enforce read-only on dev connection
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);
  const beforeCounts = await prisma.$queryRawUnsafe(`
    SELECT 
      (SELECT COUNT(*) FROM "Payment")::int as payment_count,
      (SELECT COUNT(*) FROM "Enrollment")::int as enrollment_count,
      (SELECT COUNT(*) FROM "User")::int as user_count
  `);
  console.log("BEFORE COUNTS ON DEV DB (Read-Only):", beforeCounts);

  const origTestUrl = process.env.TEST_DATABASE_URL;
  const origDbUrl = process.env.DATABASE_URL;

  const testCases = [
    {
      name: "Case 1: TEST_DATABASE_URL unset",
      setup: () => {
        delete process.env.TEST_DATABASE_URL;
        process.env.DATABASE_URL = origDbUrl;
      },
      expectedSnippet: "TEST_DATABASE_URL is not set"
    },
    {
      name: "Case 2: dev ref in TEST_DATABASE_URL (supabase host)",
      setup: () => {
        process.env.TEST_DATABASE_URL = "postgresql://postgres:pass@aws-1-ap-south-1.pooler.supabase.com:6543/postgres_test";
        process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      },
      expectedSnippet: "host must be localhost or 127.0.0.1"
    },
    {
      name: "Case 3: Remote host in TEST_DATABASE_URL (example.com)",
      setup: () => {
        process.env.TEST_DATABASE_URL = "postgresql://postgres:pass@remote-host.example.com:54329/db_test";
        process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      },
      expectedSnippet: "host must be localhost or 127.0.0.1"
    },
    {
      name: "Case 4: DATABASE_URL=dev while TEST_DATABASE_URL is set",
      setup: () => {
        process.env.TEST_DATABASE_URL = "postgresql://postgres:pass@127.0.0.1:54329/local_test";
        process.env.DATABASE_URL = origDbUrl; // Points to dev Supabase
      },
      expectedSnippet: "Process DATABASE_URL does not match TEST_DATABASE_URL"
    },
    {
      name: "Case 5: Database name does not end with _test",
      setup: () => {
        process.env.TEST_DATABASE_URL = "postgresql://postgres:pass@127.0.0.1:54329/production_db";
        process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      },
      expectedSnippet: "must end with '_test'"
    },
    {
      name: "Case 6: PASSING CASE (Valid local test DB configuration)",
      setup: () => {
        process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
        process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      },
      expectedSnippet: null // Should not throw!
    }
  ];

  const results = [];

  for (const tc of testCases) {
    tc.setup();
    let threw = false;
    let errorMsg = "";
    try {
      assertTestDb();
    } catch (err: any) {
      threw = true;
      errorMsg = err.message;
    }

    if (tc.expectedSnippet) {
      const passed = threw && errorMsg.includes(tc.expectedSnippet);
      results.push({
        caseName: tc.name,
        threw,
        matchedExpectedError: passed,
        status: passed ? "PASS" : "FAIL",
        errorSnippet: errorMsg.slice(0, 70)
      });
    } else {
      const passed = !threw;
      results.push({
        caseName: tc.name,
        threw,
        matchedExpectedError: passed,
        status: passed ? "PASS" : "FAIL",
        errorSnippet: passed ? "Successfully validated without error" : errorMsg.slice(0, 70)
      });
    }
  }

  // Restore env
  process.env.TEST_DATABASE_URL = origTestUrl;
  process.env.DATABASE_URL = origDbUrl;

  console.log("\n--- TEST GUARD RESULTS MATRIX ---");
  console.table(results);

  const afterCounts = await prisma.$queryRawUnsafe(`
    SELECT 
      (SELECT COUNT(*) FROM "Payment")::int as payment_count,
      (SELECT COUNT(*) FROM "Enrollment")::int as enrollment_count,
      (SELECT COUNT(*) FROM "User")::int as user_count
  `);
  console.log("\nAFTER COUNTS ON DEV DB (Read-Only):", afterCounts);
  console.log("Counts identical:", JSON.stringify(beforeCounts) === JSON.stringify(afterCounts));
}

run()
  .catch((err) => {
    console.error("FATAL in test-guard-proof-all-cases:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
