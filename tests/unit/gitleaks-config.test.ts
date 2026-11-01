import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

interface GitleaksConfig {
  extend: {
    useDefault?: boolean;
  };
  allowlists: Array<{
    description?: string;
    paths?: string[];
  }>;
}

function parseGitleaksToml(tomlStr: string): GitleaksConfig {
  const lines = tomlStr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  let currentSection = "";
  const config: GitleaksConfig = { extend: {}, allowlists: [] };
  let currentAllowlist: { description?: string; paths?: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === "[[allowlists]]") {
      currentSection = "allowlists";
      currentAllowlist = { paths: [] };
      config.allowlists.push(currentAllowlist);
      continue;
    }

    if (line === "[extend]") {
      currentSection = "extend";
      continue;
    }

    if (currentSection === "extend") {
      const parts = line.split("=").map((s) => s.trim());
      if (parts[0] === "useDefault") {
        config.extend.useDefault = parts[1] === "true";
      }
    }

    if (currentSection === "allowlists" && currentAllowlist) {
      if (line.startsWith("description")) {
        const match = line.match(/description\s*=\s*['"]([^'"]+)['"]/);
        if (match) currentAllowlist.description = match[1];
      } else if (line.startsWith("paths")) {
        const paths: string[] = [];
        let inArray = line.includes("[") && !line.includes("]");
        const arrayContent = line.substring(
          line.indexOf("[") + 1,
          line.includes("]") ? line.indexOf("]") : undefined
        );
        if (arrayContent) {
          const matches = arrayContent.match(/['"]{1,3}([^'"]+)['"]{1,3}/g);
          if (matches) {
            matches.forEach((m) =>
              paths.push(m.replace(/^['"]+|['"]+$/g, ""))
            );
          }
        }
        while (inArray && i + 1 < lines.length) {
          i++;
          const nextLine = lines[i];
          if (nextLine.includes("]")) inArray = false;
          const matches = nextLine.match(/['"]{1,3}([^'"]+)['"]{1,3}/g);
          if (matches) {
            matches.forEach((m) =>
              paths.push(m.replace(/^['"]+|['"]+$/g, ""))
            );
          }
        }
        currentAllowlist.paths = paths;
      }
    }
  }

  return config;
}

describe("R15-2: Gitleaks Configuration Verification", () => {
  const rootDir = process.cwd();
  const configPath = path.join(rootDir, ".gitleaks.toml");

  test("G-R15-01: .gitleaks.toml exists, extends default, and has exactly one path allowlist for docs/evidence/raw", () => {
    assert.ok(
      fs.existsSync(configPath),
      ".gitleaks.toml must exist at repository root"
    );

    const content = fs.readFileSync(configPath, "utf-8");
    const config = parseGitleaksToml(content);

    // 1. Asserts: useDefault true
    assert.strictEqual(
      config.extend.useDefault,
      true,
      "[extend] useDefault must be true"
    );

    // 2. Asserts: exactly one path allowlist
    assert.strictEqual(
      config.allowlists.length,
      1,
      "Must contain exactly one [[allowlists]] entry"
    );
    const allowlist = config.allowlists[0];
    assert.ok(
      allowlist.paths && allowlist.paths.length === 1,
      "[[allowlists]] entry must declare exactly one path pattern"
    );

    // 3. Asserts: path regex covers only docs/evidence/raw
    const pathPattern = allowlist.paths[0];
    assert.ok(
      pathPattern.startsWith("^docs/evidence/raw/"),
      `Path regex must strictly start with '^docs/evidence/raw/', got '${pathPattern}'`
    );
    assert.ok(
      pathPattern.endsWith("\\.txt$") || pathPattern.endsWith("txt$"),
      `Path regex must restrict to text logs (.txt$), got '${pathPattern}'`
    );

    const compiledRegex = new RegExp(pathPattern);

    // Must match raw evidence logs
    assert.ok(
      compiledRegex.test("docs/evidence/raw/r15-1-full-unit-clean-env.txt"),
      "Must match evidence logs in docs/evidence/raw/"
    );
    assert.ok(
      compiledRegex.test("docs/evidence/raw/test-output.txt"),
      "Must match test output in docs/evidence/raw/"
    );

    // Must NOT match code, configuration, or docs outside raw
    assert.ok(
      !compiledRegex.test("app/layout.tsx"),
      "Must not match source files"
    );
    assert.ok(
      !compiledRegex.test("lib/boot-guard.ts"),
      "Must not match lib files"
    );
    assert.ok(
      !compiledRegex.test("package.json"),
      "Must not match package.json"
    );
    assert.ok(
      !compiledRegex.test(".env.example"),
      "Must not match environment files"
    );
    assert.ok(
      !compiledRegex.test("docs/evidence/summary.txt"),
      "Must not match files outside docs/evidence/raw/"
    );
    assert.ok(
      !compiledRegex.test("docs/evidence/raw/notes.md"),
      "Must not match non-txt files"
    );
  });
});
