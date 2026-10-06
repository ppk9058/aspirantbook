import { execSync } from "child_process";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:3045";

async function main() {
  console.log("=== PART E: SECURITY INVARIANTS VERIFICATION ===");

  // 1. Direct API checks without session must return 401
  const directApis = [
    { url: "/api/courses/enroll", method: "POST", body: '{"courseId":"test"}' },
    { url: "/api/exam/attempt/start", method: "POST", body: '{"testId":"test"}' },
    { url: "/api/exam/attempt/test/submit", method: "POST", body: '{}' },
    { url: "/api/user/goal", method: "POST", body: '{"goalId":"upsc"}' },
    { url: "/api/leaderboard", method: "GET" }
  ];

  console.log("\n1. Direct API Anonymous Requests (Must be 401 Unauthorized):");
  for (const api of directApis) {
    let cmd = `curl -s -o /dev/null -w "%{http_code}" -X ${api.method} "${BASE_URL}${api.url}" -H "Content-Type: application/json"`;
    if (api.body) {
      cmd += ` -d '${api.body}'`;
    }
    const code = execSync(cmd, { encoding: "utf8" }).trim();
    console.log(`  - ${api.method} ${api.url} => HTTP ${code} (${code === "401" ? "PASS" : "FAIL"})`);
  }

  // 2. Leak scan across HTML / RSC for guest
  console.log("\n2. PII / Secret Leak Scan on Guest HTML & RSC Responses:");
  const guestPages = ["/dashboard", "/courses", "/tutorials", "/test-series", "/books", "/current-affairs-quizzes"];
  const bannedKeywords = ["user_id", "password_hash", "encrypted_password", "secret", "privateKey"];
  
  for (const p of guestPages) {
    const html = execSync(`curl -s "${BASE_URL}${p}"`, { encoding: "utf8" });
    const rsc = execSync(`curl -s -H "RSC: 1" "${BASE_URL}${p}"`, { encoding: "utf8" });
    
    let leakFound = false;
    for (const kw of bannedKeywords) {
      if (html.includes(kw) || rsc.includes(kw)) {
        console.error(`  - Leak detected on ${p} for keyword: ${kw}`);
        leakFound = true;
      }
    }
    if (!leakFound) {
      console.log(`  - ${p}: Clean (No PII / internal credentials leaked in HTML/RSC)`);
    }
  }

  // 3. Draft 404 tests: Draft courses / unlisted tests must 404
  console.log("\n3. Unpublished / Draft Content Access by Anonymous User:");
  const draftCourseStatus = execSync(`curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/courses/draft-course-never-published"`, { encoding: "utf8" }).trim();
  console.log(`  - Non-existent/draft course => HTTP ${draftCourseStatus} (${draftCourseStatus === "404" ? "PASS" : "FAIL"})`);

  // 4. Attack vector check: callbackUrl sanitization
  console.log("\n4. Open Redirect Attack Vector Testing on callbackUrl:");
  const attackUrls = [
    "//evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "//attacker.com/steal"
  ];

  for (const attack of attackUrls) {
    const encoded = encodeURIComponent(attack);
    const loc = execSync(`curl -s -i "${BASE_URL}/profile" -H "Referer: ${BASE_URL}" | grep -i "location:"`, { encoding: "utf8" }).trim();
    // Now verify how /login sanitizes when redirected
    const sanitizedRes = execSync(`curl -s -i "${BASE_URL}/login?callbackUrl=${encoded}" | grep -i "location:" || true`, { encoding: "utf8" }).trim();
    console.log(`  - Attack input: "${attack}" => Location: ${sanitizedRes || "Stays on login page / sanitized"}`);
  }

  console.log("\nPart E Verification Complete.");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
