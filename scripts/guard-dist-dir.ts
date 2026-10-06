import * as fs from "fs";
import * as path from "path";

function check() {
  const distEnv = process.env.NEXT_DIST_DIR;
  if (!distEnv) {
    console.log("[guard-dist-dir] NEXT_DIST_DIR not set. Default is .next.");
    return;
  }

  if (distEnv === ".next" || distEnv === "./.next") {
    console.error(`[guard-dist-dir] ERROR: Test/isolated environment set NEXT_DIST_DIR=${distEnv}, which conflicts with dev server!`);
    process.exit(1);
  }

  // Verify next.config.js enforces distDir
  const nextConfigPath = path.resolve(process.cwd(), "next.config.js");
  if (!fs.existsSync(nextConfigPath)) {
    console.error("[guard-dist-dir] ERROR: next.config.js not found!");
    process.exit(1);
  }

  const content = fs.readFileSync(nextConfigPath, "utf8");
  if (!content.includes("distDir: process.env.NEXT_DIST_DIR")) {
    console.error("[guard-dist-dir] ERROR: next.config.js does not specify distDir: process.env.NEXT_DIST_DIR!");
    process.exit(1);
  }

  console.log(`[guard-dist-dir] PASS: NEXT_DIST_DIR=${distEnv} is safely isolated from .next.`);
}

check();
