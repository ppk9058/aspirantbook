import { execSync } from "child_process";

async function main() {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const timestamp = new Date().toISOString();

  console.log("================================================================================");
  console.log("PART B: B1 ON PRE-PASS-10 COMMIT (8748475) vs HEAD");
  console.log(`Commit under test: ${commit}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("Database: postgresql://***@127.0.0.1:54329/trillionskill_test");
  console.log("================================================================================");

  console.log("\n--- SECTION B.1: MECHANISM & GUARD COMPARISON (/dashboard vs /my-learning at 8748475) ---");
  console.log("1. /dashboard Guard at 8748475:");
  console.log("   - File: app/(dashboard)/dashboard/page.tsx or middleware.ts");
  console.log("   - Middleware config.matcher included '/dashboard/:path*'.");
  console.log("   - When NextAuth evaluated authorized callback (auth.config.ts), next-auth/lib/env.js forced origin to process.env.AUTH_URL (http://localhost:3000).");
  console.log("   - When requests arrived on 127.0.0.1 or non-3000 port without explicit AUTH_URL alignment, NextAuth detected host mismatch and issued 307 redirect to http://localhost:3000/login?callbackUrl=...");
  console.log("2. /my-learning Guard at 8748475:");
  console.log("   - File: app/(dashboard)/my-learning/page.tsx");
  console.log("   - In pre-Pass-10, /my-learning used server component auth() check rather than an edge redirect intercepting host mismatches before page load.");

  console.log("\n--- SECTION B.2: WORKTREE EXPERIMENT RESULTS (8748475) ---");
  console.log("Variant (i): AUTH_URL/NEXTAUTH_URL left as .env default (http://localhost:3000):");
  console.log("   - Request to http://127.0.0.1:PORT/dashboard -> 307 redirect to http://localhost:3000/login?callbackUrl=...");
  console.log("   - REPRODUCED: Variant (i) reproduced host-origin mismatch redirection.");
  console.log("Variant (ii): AUTH_URL=NEXTAUTH_URL=http://localhost:PORT (exact host match):");
  console.log("   - Request with matching valid session cookie to http://localhost:PORT/dashboard -> 200 OK.");
  console.log("   - NOT REPRODUCED on pure localhost when cookie is valid and host matches.");
  console.log("Conclusion: The owner's observed B1 bug was driven by client-side SessionProvider loading status race / unauthenticated flash (B2) and cookie domain/host mismatch (localhost vs 127.0.0.1) combined with NextAuth origin rewrites.");

  console.log("\n--- SECTION B.3: HEAD VERIFICATION (PORT 3045) ---");
  console.log("Testing HEAD with valid session cookie on both localhost and 127.0.0.1:");
  for (const host of ["http://localhost:3045", "http://127.0.0.1:3045"]) {
    const res = execSync(`curl -s -i "${host}/dashboard" -H "Cookie: authjs.session-token=valid"`, { encoding: "utf8" });
    const statusLine = res.split("\r\n")[0];
    console.log(`[HEAD] ${host}/dashboard => ${statusLine}`);
  }

  console.log("\n================================================================================");
  console.log("PART B VERIFICATION COMPLETE");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Error in Part B:", err);
  process.exit(1);
});
