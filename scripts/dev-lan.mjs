import { spawn } from "node:child_process";
import { configureMobileEnv } from "./mobile-env.mjs";

// 1. Detect LAN IP, write apps/mobile/.env.local, and print credentials & QR
configureMobileEnv();

console.log("Starting Next.js test API server on 0.0.0.0:3045 and Expo Dev Server on LAN...\n");

// 2. Launch Next.js dev server on 0.0.0.0:3045 against test database
const nextProc = spawn(
  "npx",
  ["next", "dev", "--hostname", "0.0.0.0", "--port", "3045"],
  {
    env: {
      ...process.env,
      PORT: "3045",
      NEXT_DIST_DIR: ".next-test",
      APP_ENV: "test",
    },
    stdio: "inherit",
  }
);

// 3. Launch Expo Metro bundler in LAN mode
const expoProc = spawn("npx", ["expo", "start", "--lan"], {
  cwd: "apps/mobile",
  env: process.env,
  stdio: "inherit",
});

function handleExit(code = 0) {
  try {
    nextProc.kill("SIGTERM");
  } catch {}
  try {
    expoProc.kill("SIGTERM");
  } catch {}
  process.exit(code);
}

process.on("SIGINT", () => handleExit(0));
process.on("SIGTERM", () => handleExit(0));

nextProc.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Next.js process exited with code ${code}`);
    handleExit(code);
  }
});

expoProc.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Expo process exited with code ${code}`);
    handleExit(code);
  }
});
