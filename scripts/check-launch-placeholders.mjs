import fs from "node:fs";
import path from "node:path";

const TARGET_DIRS = ["app", "lib"];
const PATTERN = /\[OWNER TO CONFIRM/i;

let hasErrors = false;
let totalMatches = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && /\.(tsx?|jsx?|json|mjs|cjs)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (PATTERN.test(line)) {
          console.error(`[LAUNCH PLACEHOLDER] ${fullPath}:${index + 1}: ${line.trim()}`);
          hasErrors = true;
          totalMatches++;
        }
      });
    }
  }
}

console.log("Scanning app/ and lib/ for unresolved '[OWNER TO CONFIRM' placeholders...");
for (const dir of TARGET_DIRS) {
  scanDir(path.resolve(process.cwd(), dir));
}

if (hasErrors) {
  console.error(`\nFAILED: Found ${totalMatches} unresolved placeholder(s) in app/ or lib/.`);
  process.exit(1);
} else {
  console.log("SUCCESS: All launch placeholders in app/ and lib/ are resolved.");
  process.exit(0);
}
