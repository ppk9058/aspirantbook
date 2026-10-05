import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function run() {
  console.log("=== GATE G6: DEV DEPLOY GUARD VERIFICATION ===");

  const directUrl = process.env.DIRECT_URL || "";
  const dbUrl = process.env.DATABASE_URL || "";

  // Mask credentials
  const maskUrl = (url: string) => {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.username}:****@${u.host}${u.pathname}`;
    } catch {
      return "INVALID_URL";
    }
  };

  console.log("DIRECT_URL host/db:", maskUrl(directUrl));
  console.log("DATABASE_URL host/db:", maskUrl(dbUrl));

  // Verify that the host belongs to the designated Supabase Dev project
  const expectedHostPattern = /aws-[0-9]-ap-south-1\.pooler\.supabase\.com/;
  if (!expectedHostPattern.test(directUrl)) {
    throw new Error(`GATE G6 REFUSAL: Target direct URL host does not match dev pooler pattern! Found: ${directUrl}`);
  }

  console.log("Gate G6 Check Passed: Confirmed Dev database target.\n");
  console.log("Executing: npx prisma migrate deploy");
  const stdout = execSync("npx prisma migrate deploy", {
    env: process.env,
    encoding: "utf-8"
  });
  console.log(stdout);
}

run().catch((err) => {
  console.error("FATAL in dev-deploy:", err);
  process.exit(1);
});
