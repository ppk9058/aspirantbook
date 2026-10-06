import { encode } from "next-auth/jwt";
import { execSync } from "child_process";

const REAL_SECRET = "aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b";

async function run() {
  const token = await encode({
    token: { id: "u_student_free_p9", role: "FREE", email: "student_free@p9.local", name: "Free Student" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  console.log("=== PRE-PASS-10 (port 3055) WITH REAL SECRET COOKIE ===");

  console.log("\n--- Request 1: curl -i http://localhost:3055/dashboard ---");
  try {
    const out1 = execSync(`curl -s -i "http://localhost:3055/dashboard" -H "Cookie: authjs.session-token=${token}"`, { encoding: "utf8" });
    console.log(out1.split("\r\n\r\n")[0]);
    console.log("Body snippet:", out1.split("\r\n\r\n")[1]?.slice(0, 300));
  } catch (e: any) {
    console.log("Err:", e.message);
  }

  console.log("\n--- Request 2: curl -i http://127.0.0.1:3055/dashboard ---");
  try {
    const out2 = execSync(`curl -s -i "http://127.0.0.1:3055/dashboard" -H "Cookie: authjs.session-token=${token}"`, { encoding: "utf8" });
    console.log(out2.split("\r\n\r\n")[0]);
    console.log("Body snippet:", out2.split("\r\n\r\n")[1]?.slice(0, 300));
  } catch (e: any) {
    console.log("Err:", e.message);
  }

  console.log("\n--- Request 3: curl -i http://localhost:3055/my-learning ---");
  try {
    const out3 = execSync(`curl -s -i "http://localhost:3055/my-learning" -H "Cookie: authjs.session-token=${token}"`, { encoding: "utf8" });
    console.log(out3.split("\r\n\r\n")[0]);
    console.log("Body snippet:", out3.split("\r\n\r\n")[1]?.slice(0, 300));
  } catch (e: any) {
    console.log("Err:", e.message);
  }

  console.log("\n--- Request 4: curl -i http://127.0.0.1:3055/my-learning ---");
  try {
    const out4 = execSync(`curl -s -i "http://127.0.0.1:3055/my-learning" -H "Cookie: authjs.session-token=${token}"`, { encoding: "utf8" });
    console.log(out4.split("\r\n\r\n")[0]);
    console.log("Body snippet:", out4.split("\r\n\r\n")[1]?.slice(0, 300));
  } catch (e: any) {
    console.log("Err:", e.message);
  }
}

run();
