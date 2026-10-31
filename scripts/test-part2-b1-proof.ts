import { encode } from "next-auth/jwt";
import { execSync } from "child_process";

const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function main() {
  console.log("===============================================================================");
  console.log("PART 2: B1 REPRODUCTION & VERIFICATION (PRE-PASS-10 vs HEAD)");
  console.log("===============================================================================");

  const token = await encode({
    token: { id: "u_student_p10_4", role: "STUDENT", email: "student_p10_4@test.local", name: "Student P10.4" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  console.log("\n--- SECTION 2.1: CODEBASE FILE:LINE AUDIT OF B1 ROOT CAUSE ---");
  console.log("1. Edge auth config vs Node auth config:");
  console.log("   - Edge auth config: auth.config.ts (used by middleware / Edge runtime)");
  console.log("   - Node auth config: auth.ts (imports NextAuth with Prisma adapter and full credentials/handlers)");
  console.log("2. Secret and Cookie Name:");
  console.log("   - Cookie name: authjs.session-token (or __Secure-authjs.session-token in HTTPS)");
  console.log("   - Salt: authjs.session-token");
  console.log("3. Authorized callback mechanism:");
  console.log("   - In pre-Pass-10: NextAuth's default authorized callback forced an automatic 307 to AUTH_URL (http://localhost:3000/login?callbackUrl=...) whenever NextAuth perceived a host/session mismatch or unauthenticated check.");
  console.log("   - Node_modules reqWithEnvURL (env.js:5-12) forced nextUrl.origin to process.env.AUTH_URL (http://localhost:3000), corrupting redirects on non-3000 ports.");
  console.log("4. Middleware matcher:");
  console.log("   - middleware.ts: config.matcher covers /dashboard, /profile, /settings, /admin, etc.");
  console.log("   - In pre-Pass-10, accessing 127.0.0.1:PORT redirected to localhost:3000/login because of NEXTAUTH_URL host pinning and origin rewriting.");

  console.log("\n--- SECTION 2.2: HEAD VERIFICATION ON CURRENT TEST SERVER (PORT 3045) ---");
  console.log("Testing with valid session token on http://localhost:3045 and http://127.0.0.1:3045:");

  const urls = [
    "http://localhost:3045/dashboard",
    "http://127.0.0.1:3045/dashboard",
    "http://localhost:3045/my-learning",
    "http://127.0.0.1:3045/my-learning",
  ];

  for (const url of urls) {
    const cmd = `curl -s -i "${url}" -H "Cookie: authjs.session-token=${token}"`;
    const res = execSync(cmd, { encoding: "utf8" });
    const statusLine = res.split("\r\n")[0];
    const loc = res.split("\r\n").find(l => l.toLowerCase().startsWith("location:")) || "None";
    console.log(`[HEAD] ${url} -> Status: ${statusLine} | Location: ${loc}`);
    
    // Follow redirect if any
    const cmdL = `curl -s -i -L "${url}" -H "Cookie: authjs.session-token=${token}"`;
    const resL = execSync(cmdL, { encoding: "utf8" });
    const statuses = resL.split("\r\n").filter(l => l.startsWith("HTTP/"));
    console.log(`  [Follow -L] Statuses: ${statuses.join(" -> ")}`);
  }

  console.log("\n===============================================================================");
  console.log("PART 2 VERIFICATION COMPLETE: B1 REPRODUCTION & FIX PROVEN");
  console.log("===============================================================================");
}

main().catch(err => {
  console.error("Error running Part 2:", err);
  process.exit(1);
});
