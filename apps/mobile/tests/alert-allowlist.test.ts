import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

interface AllowedAlert {
  file: string;
  purpose: string;
}

// Strict allow-list of approved confirmation dialogs across mobile application
// Only irreversible/destructive actions with 2+ buttons are allowed
const ALERT_ALLOWLIST: AllowedAlert[] = [
  {
    file: "src/app/settings.tsx",
    purpose: "destructive: account deletion confirmation dialog (Cancel, Delete)",
  },
  {
    file: "src/app/(tabs)/profile.tsx",
    purpose: "confirmation: sign out confirmation dialog (Cancel, Sign Out)",
  },
  {
    file: "src/app/(tabs)/profile.tsx",
    purpose: "destructive: revoke all sessions confirmation dialog (Cancel, Revoke)",
  },
  {
    file: "src/app/(tabs)/profile.tsx",
    purpose: "destructive: account deletion confirmation dialog (Cancel, Delete)",
  },
  {
    file: "src/app/tests/[id]/index.tsx",
    purpose: "confirmation: guest sign-in required to attempt exam (Cancel, Sign In)",
  },
  {
    file: "src/app/tests/[id]/runner.tsx",
    purpose: "destructive: exit exam confirmation dialog (Cancel, Exit Test)",
  },
  {
    file: "src/app/tests/[id]/runner.tsx",
    purpose: "confirmation: submit exam confirmation dialog (Review, Submit)",
  },
  {
    file: "src/app/pyqs/pdf-view.tsx",
    purpose: "confirmation: guest sign-in required to download offline paper (Cancel, Sign In)",
  },
];

describe("T6: Alert.alert Cleanup & Allow-List Enforcement", () => {
  function findFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findFiles(fullPath));
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it("enforces that all Alert.alert occurrences match the explicit allow-list and count is <= 12", () => {
    const srcDir = path.join(__dirname, "../src");
    const allFiles = findFiles(srcDir);
    const violations: string[] = [];
    let totalAlertCount = 0;

    for (const filePath of allFiles) {
      const relPath = path.relative(path.join(__dirname, ".."), filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        if (line.includes("Alert.alert(")) {
          totalAlertCount++;
          const isAllowed = ALERT_ALLOWLIST.some((allowed) => relPath.includes(allowed.file));
          if (!isAllowed) {
            violations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
          }
        }
      });
    }

    assert.equal(
      violations.length,
      0,
      `Found unauthorized Alert.alert calls outside allow-list:\n${violations.join("\n")}`
    );

    // Rule T6 requirement: total count must be strictly <= 12
    assert.ok(
      totalAlertCount <= 12,
      `Expected total Alert.alert count <= 12, but found ${totalAlertCount}`
    );
    assert.equal(totalAlertCount, 8, `Expected exactly 8 approved 2-button confirmations, found ${totalAlertCount}`);
  });

  it("enforces that all Alert.alert occurrences have a literal array of >=2 buttons", () => {
    // The previous version shelled out to an absolute path in another checkout
    // (/Users/.../trillionskill-mobile-spec/run4/gates/alert-check.js), so it
    // scanned whatever that checkout happened to contain and reported 0 calls.
    // Parse this repository's own sources instead.
    const ts = require("typescript") as typeof import("typescript");
    const srcRoot = path.join(__dirname, "../src");
    const offenders: string[] = [];
    let total = 0;

    for (const filePath of findFiles(srcRoot)) {
      const source = fs.readFileSync(filePath, "utf-8");
      const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
      const visit = (node: any) => {
        if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === "Alert.alert") {
          total++;
          const buttons = node.arguments[2];
          if (!(buttons && ts.isArrayLiteralExpression(buttons) && buttons.elements.length >= 2)) {
            offenders.push(
              `${path.relative(path.join(__dirname, ".."), filePath)}: Alert.alert without a literal array of >=2 buttons`
            );
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    assert.deepEqual(offenders, [], offenders.join("\n"));
    assert.equal(total, ALERT_ALLOWLIST.length, `expected ${ALERT_ALLOWLIST.length} approved confirmations, found ${total}`);
  });
});
