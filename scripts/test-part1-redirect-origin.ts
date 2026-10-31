import { encode } from "next-auth/jwt";
import { execSync } from "child_process";

const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function main() {
  console.log("===============================================================================");
  console.log("PART 1: REDIRECT ORIGIN & REWRITE VERIFICATION ON TEST SERVER (PORT 3045)");
  console.log("===============================================================================");

  const token = await encode({
    token: { id: "u_student_p10_4", role: "STUDENT", email: "student_p10_4@test.local", name: "Student P10.4" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  const hosts = ["http://localhost:3045", "http://127.0.0.1:3045"];
  const anonRoutes = ["/profile", "/settings", "/admin/dashboard", "/teacher", "/learn", "/classroom", "/assessments"];
  const authedRoutes = ["/dashboard", "/profile", "/settings", "/admin/dashboard", "/teacher"];

  console.log("\n--- SECTION 1.1: ANONYMOUS REQUESTS (EXPECT REDIRECT PRESERVING ORIGIN:PORT) ---");
  for (const host of hosts) {
    for (const route of anonRoutes) {
      const url = `${host}${route}`;
      // Test without -L (single hop headers)
      const cmdNoL = `curl -s -i "${url}"`;
      const resNoL = execSync(cmdNoL, { encoding: "utf8" });
      const firstLine = resNoL.split("\r\n")[0];
      const locationLine = resNoL.split("\r\n").find(l => l.toLowerCase().startsWith("location:")) || "No Location";

      // Verify location does not point to port 3000
      const hasPort3000 = locationLine.includes(":3000");
      const status = hasPort3000 ? "FAIL (points to 3000!)" : "PASS";

      console.log(`[ANON] ${url} -> ${firstLine} | ${locationLine} => ${status}`);
    }
  }

  console.log("\n--- SECTION 1.2: ANONYMOUS FOLLOW-REDIRECT (curl -i -L) ---");
  for (const host of hosts) {
    for (const route of ["/profile", "/admin/dashboard"]) {
      const url = `${host}${route}`;
      const cmdL = `curl -s -i -L "${url}"`;
      const resL = execSync(cmdL, { encoding: "utf8" });
      const statusLines = resL.split("\r\n").filter(l => l.startsWith("HTTP/"));
      const locations = resL.split("\r\n").filter(l => l.toLowerCase().startsWith("location:"));
      console.log(`[ANON -L] ${url}`);
      console.log(`  Statuses: ${statusLines.join(" -> ")}`);
      console.log(`  Locations: ${locations.join(" -> ")}`);
    }
  }

  console.log("\n--- SECTION 1.3: AUTHENTICATED REQUESTS (Cookie present) ---");
  for (const host of hosts) {
    for (const route of authedRoutes) {
      const url = `${host}${route}`;
      const cmd = `curl -s -i "${url}" -H "Cookie: authjs.session-token=${token}"`;
      const res = execSync(cmd, { encoding: "utf8" });
      const firstLine = res.split("\r\n")[0];
      const locationLine = res.split("\r\n").find(l => l.toLowerCase().startsWith("location:")) || "None";
      console.log(`[AUTH] ${url} -> ${firstLine} | Location: ${locationLine}`);
    }
  }

  console.log("\n===============================================================================");
  console.log("PART 1 VERIFICATION COMPLETE");
  console.log("===============================================================================");
}

main().catch(err => {
  console.error("Error running Part 1 verification:", err);
  process.exit(1);
});
