import { execSync } from "child_process";

const BASE_URL = "http://127.0.0.1:3045";
const PAYLOAD = JSON.stringify({ language: "python", code: "print(1)" });

async function run() {
  console.log("=== PART H: CODE EXECUTION RATE LIMIT PROOF (10 ALLOWED, 11th 429) ===");
  const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  console.log(`Using Simulated Client IP: ${testIp}\n`);

  for (let i = 1; i <= 10; i++) {
    const res = execSync(`curl -s -i -X POST "${BASE_URL}/api/execute" -H "Content-Type: application/json" -H "X-Forwarded-For: ${testIp}" -d '${PAYLOAD}'`, { encoding: "utf8" });
    const statusLine = res.split("\r\n")[0] || res.split("\n")[0];
    console.log(`Request #${i}: ${statusLine}`);
  }

  console.log("\nSending Request #11 (Expected HTTP 429 + Retry-After header)...");
  const res11 = execSync(`curl -s -i -X POST "${BASE_URL}/api/execute" -H "Content-Type: application/json" -H "X-Forwarded-For: ${testIp}" -d '${PAYLOAD}'`, { encoding: "utf8" });
  console.log(res11.slice(0, 350));
}

run().catch(console.error);
