import { encode } from "next-auth/jwt";
import { execSync } from "child_process";

const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function run() {
  const token = await encode({
    token: { id: "u_student_free_p9", role: "FREE", email: "student_free@p9.local", name: "Free Student" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  console.log("=== PRE-PASS-10 (DEFAULT ENV with NEXTAUTH_URL=http://localhost:3000) ===");

  console.log("\n--- Request 1: curl -i http://localhost:3055/dashboard ---");
  const out1 = execSync(`curl -s -i "http://localhost:3055/dashboard" -H "Cookie: authjs.session-token=${token}"`, { encoding: "utf8" });
  console.log(out1.split("\r\n\r\n")[0]);

  console.log("\n--- Request 2: curl -i http://127.0.0.1:3055/dashboard ---");
  const out2 = execSync(`curl -s -i "http://127.0.0.1:3055/dashboard" -H "Cookie: authjs.session-token=${token}"`, { encoding: "utf8" });
  console.log(out2.split("\r\n\r\n")[0]);

  console.log("\n--- Request 3: curl -i -L http://127.0.0.1:3055/dashboard ---");
  const out3 = execSync(`curl -s -i -L "http://127.0.0.1:3055/dashboard" -H "Cookie: authjs.session-token=${token}"`, { encoding: "utf8" });
  console.log(out3.slice(0, 500));
}

run();
