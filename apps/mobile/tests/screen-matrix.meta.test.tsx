import fs from "fs";
import path from "path";
import { SCREEN_REGISTRY } from "./helpers/screen-registry";

describe("Screen Registry & Matrix Meta-Test", () => {
  const appDir = path.resolve(__dirname, "../src/app");
  const testsDir = path.resolve(__dirname, "../tests");

  // Collect all real screen files under src/app (excluding _layout.tsx)
  function getScreenFiles(dir: string, base = ""): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files: string[] = [];
    for (const entry of entries) {
      const relPath = base ? `${base}/${entry.name}` : entry.name;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getScreenFiles(fullPath, relPath));
      } else if (entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.endsWith("_layout.tsx")) {
        files.push(relPath);
      }
    }
    return files;
  }

  it("[matrix] (a) all in-scope screen files under src/app are registered in SCREEN_REGISTRY", () => {
    const realFiles = getScreenFiles(appDir).sort();
    const registeredFiles = SCREEN_REGISTRY.map((s) => s.file).sort();

    const missingFromRegistry = realFiles.filter((f) => !registeredFiles.includes(f));
    expect(missingFromRegistry).toEqual([]);

    const extraInRegistry = registeredFiles.filter((f) => !realFiles.includes(f));
    expect(extraInRegistry).toEqual([]);
  });

  it("[matrix] (b) every required state in the screen registry has a declared test pattern [<route>] <state>", () => {
    // Collect all test file contents
    const testFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.tsx") || f.endsWith(".test.ts"));
    const allTestContent = testFiles
      .map((f) => fs.readFileSync(path.join(testsDir, f), "utf8"))
      .join("\n");

    const missingTests: string[] = [];

    for (const screen of SCREEN_REGISTRY) {
      for (const state of screen.requiredStates) {
        const expectedPattern = `[${screen.route}] ${state}`;
        if (!allTestContent.includes(expectedPattern)) {
          missingTests.push(expectedPattern);
        }
      }
    }

    if (missingTests.length > 0) {
      // Print first 10 missing for clear test failure reporting
      console.warn(`Missing tests count: ${missingTests.length}. First 5: ${missingTests.slice(0, 5).join(", ")}`);
    }

    expect(missingTests).toEqual([]);
  });
});
