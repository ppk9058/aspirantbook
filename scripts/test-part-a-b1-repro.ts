import { spawn, ChildProcess } from "child_process";
import { encode } from "next-auth/jwt";

const PRE10_PORT = 3055;
const PRE10_DIR = "/Users/praveenkumar/TrillionSkill-prepass10";
const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function makeCookie(host: string) {
  const token = await encode({
    token: { id: "u_student_free_p9", role: "FREE", email: "student_free@p9.local", name: "Free Student" },
    secret: SECRET,
    salt: "authjs.session-token",
  });
  return `authjs.session-token=${token}`;
}

async function run() {
  console.log("=== PART A: B1 REPRODUCTION ON PRE-PASS-10 (8748475) ===");

  const serverProc: ChildProcess = spawn("./node_modules/.bin/next", ["start", "-p", String(PRE10_PORT)], {
    cwd: PRE10_DIR,
    env: {
      ...process.env,
      PORT: String(PRE10_PORT),
      NEXT_DIST_DIR: ".next-pre10",
      DATABASE_URL: DOCKER_DB_URL,
      DIRECT_URL: DOCKER_DB_URL,
      TEST_DATABASE_URL: DOCKER_DB_URL,
      AUTH_SECRET: SECRET,
      NEXTAUTH_SECRET: SECRET,
      NEXTAUTH_URL: `http://localhost:${PRE10_PORT}`,
      AUTH_URL: `http://localhost:${PRE10_PORT}`,
    },
    stdio: "pipe"
  });

  serverProc.stderr?.on("data", d => console.error("[Server err]:", d.toString().trim()));

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PRE10_PORT}/login`);
      if (res.status === 200 || res.status === 307) break;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`Pre-pass 10 server up on port ${PRE10_PORT}.\n`);

  const cookie = await makeCookie("localhost");

  console.log("--- 1. Testing on http://127.0.0.1:3055/dashboard (curl -i -L) ---");
  const execSync = require("child_process").execSync;
  try {
    const out1 = execSync(`curl -i -L "http://127.0.0.1:${PRE10_PORT}/dashboard" -H "Cookie: ${cookie}"`, { encoding: "utf8" });
    console.log(out1.slice(0, 1500));
  } catch (e: any) {
    console.log("Error 127.0.0.1:", e.message);
  }

  console.log("\n--- 2. Testing on http://localhost:3055/dashboard (curl -i -L) ---");
  try {
    const out2 = execSync(`curl -i -L "http://localhost:${PRE10_PORT}/dashboard" -H "Cookie: ${cookie}"`, { encoding: "utf8" });
    console.log(out2.slice(0, 1500));
  } catch (e: any) {
    console.log("Error localhost:", e.message);
  }

  console.log("\n--- 3. Testing /my-learning on pre-pass10 ---");
  try {
    const out3 = execSync(`curl -i -L "http://127.0.0.1:${PRE10_PORT}/my-learning" -H "Cookie: ${cookie}"`, { encoding: "utf8" });
    console.log(out3.slice(0, 1500));
  } catch (e: any) {
    console.log("Error my-learning:", e.message);
  }

  serverProc.kill("SIGKILL");
}

run();
