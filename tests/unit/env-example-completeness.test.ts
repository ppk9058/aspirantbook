import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Task E: .env.example Completeness Enforcer", () => {
  const rootDir = process.cwd();
  const envExamplePath = path.join(rootDir, ".env.example");

  function getEnvExampleVars(): Set<string> {
    assert.ok(fs.existsSync(envExamplePath), ".env.example must exist");
    const content = fs.readFileSync(envExamplePath, "utf-8");
    const vars = new Set<string>();

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      // Match VAR=value or commented out # VAR=value or # [REQUIRED/OPTIONAL] VAR=
      const match = trimmed.match(/^(?:#\s*)?([A-Z0-9_]+)=/);
      if (match) {
        vars.add(match[1]);
      }
    }
    return vars;
  }

  function getAppCodeEnvVars(): { name: string; file: string; line: number }[] {
    const targetDirs = ["app", "lib", "components", "packages/shared"];
    const results: { name: string; file: string; line: number }[] = [];
    const ignoreDirs = new Set(["node_modules", ".next", ".git", ".next-test", "dist", "build"]);

    function scan(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (ignoreDirs.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(full);
        } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name)) {
          const content = fs.readFileSync(full, "utf-8");
          const lines = content.split("\n");
          lines.forEach((lineText, idx) => {
            const matches = lineText.matchAll(/process\.env\.([A-Z0-9_]+)/g);
            for (const m of matches) {
              results.push({
                name: m[1],
                file: path.relative(rootDir, full),
                line: idx + 1,
              });
            }
          });
        }
      }
    }

    for (const d of targetDirs) {
      scan(path.join(rootDir, d));
    }
    return results;
  }

  test("Every process.env variable used in app code must be documented in .env.example", () => {
    const exampleVars = getEnvExampleVars();
    const appVars = getAppCodeEnvVars();

    const missingMap = new Map<string, string[]>();

    for (const { name, file, line } of appVars) {
      if (!exampleVars.has(name)) {
        if (!missingMap.has(name)) {
          missingMap.set(name, []);
        }
        missingMap.get(name)!.push(`${file}:${line}`);
      }
    }

    if (missingMap.size > 0) {
      const missingReport = Array.from(missingMap.entries())
        .map(([name, locations]) => `  - ${name} (used at ${locations.slice(0, 3).join(", ")}${locations.length > 3 ? ` +${locations.length - 3} more` : ""})`)
        .join("\n");

      assert.fail(
        `Found ${missingMap.size} environment variable(s) used in code but missing from .env.example:\n${missingReport}\n\nAdd them to .env.example grouped by service and marked REQUIRED or OPTIONAL.`
      );
    }

    assert.ok(exampleVars.size > 0, ".env.example must contain variables");
  });
});
