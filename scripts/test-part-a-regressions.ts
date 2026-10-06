import { execSync } from "child_process";
import { encode } from "next-auth/jwt";

const REAL_SECRET = "aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b";

async function main() {
  console.log("===============================================================================");
  console.log("PART A REGRESSION SUITE: PRE-PASS-10 (PORT 3055) vs PASS 10.1 HEAD (PORT 3045)");
  console.log("===============================================================================");

  const anonPre = execSync('curl -s -i "http://localhost:3055/dashboard" | head -n 1', { encoding: "utf8" });
  console.log("1. Pre-Pass-10 Anonymous GET /dashboard status:", anonPre.trim());

  // Anonymous on HEAD (guest browsing enabled)
  const anonHead = execSync('curl -s -i "http://localhost:3045/dashboard" | head -n 1', { encoding: "utf8" });
  console.log("2. Pass-10 HEAD Anonymous GET /dashboard status:", anonHead.trim());

  // Verify protected routes still redirect anonymous on HEAD
  const protectedRoutes = [
    "/profile",
    "/settings",
    "/admin/dashboard",
    "/teacher",
    "/classroom",
    "/learn",
    "/assessments"
  ];

  console.log("\n3. Pass-10 HEAD: Anonymous access on private routes (must 307 to /login):");
  for (const r of protectedRoutes) {
    const res = execSync(`curl -s -i "http://localhost:3045${r}" | head -n 5`, { encoding: "utf8" });
    const statusLine = res.split("\r\n")[0] || res.split("\n")[0];
    const locLine = res.split("\n").find(l => l.toLowerCase().startsWith("location:")) || "";
    console.log(`  - ${r} => ${statusLine} | ${locLine.trim()}`);
  }

  // Token for real logged-in student in DB
  const studentToken = await encode({
    token: { id: "cmigmm22l0000xp1w2w9h0o0v", role: "FREE", email: "ppk9058@gmail.com", name: "Free Student" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  // Token for real logged-in admin in DB
  const adminToken = await encode({
    token: { id: "cmigayl8x0000xpkrjpyz8678", role: "ADMIN", email: "admin@trillionskills.com", name: "Admin Authority" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  // Token for real logged-in teacher in DB
  const teacherToken = await encode({
    token: { id: "cmtvu76q80001xp70j8v7ptc1", role: "TEACHER", email: "teacher@trillionskills.com", name: "Teacher User" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  console.log("\n4. Pass-10 HEAD: Logged-in Student Access on Edge-Guarded routes (200 OK, no redirect to login):");
  for (const r of ["/dashboard", "/profile", "/settings"]) {
    const res = execSync(`curl -s -i "http://localhost:3045${r}" -H "Cookie: authjs.session-token=${studentToken}" | head -n 1`, { encoding: "utf8" });
    console.log(`  - ${r} => ${res.trim()}`);
  }

  console.log("\n5. Pass-10 HEAD: Role-based Edge-Guarded routes (200 OK):");
  const adminRes = execSync(`curl -s -i "http://localhost:3045/admin/dashboard" -H "Cookie: authjs.session-token=${adminToken}" | head -n 1`, { encoding: "utf8" });
  console.log(`  - /admin/dashboard (as ADMIN) => ${adminRes.trim()}`);

  const teacherRes = execSync(`curl -s -i "http://localhost:3045/teacher" -H "Cookie: authjs.session-token=${teacherToken}" | head -n 1`, { encoding: "utf8" });
  console.log(`  - /teacher (as TEACHER) => ${teacherRes.trim()}`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
