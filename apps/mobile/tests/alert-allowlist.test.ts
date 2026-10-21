import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

interface AllowedAlert {
  file: string;
  purpose: string;
  isPreExisting?: boolean;
}

// Explicit allow-list of allowed Alert.alert calls across the mobile application
const ALERT_ALLOWLIST: AllowedAlert[] = [
  // Confirmation / Destructive Dialogs (2+ buttons)
  {
    file: "src/app/settings.tsx",
    purpose: "destructive: account deletion confirmation dialog",
  },
  {
    file: "src/app/(tabs)/profile.tsx",
    purpose: "confirmation: sign out confirmation dialog",
  },
  {
    file: "src/app/(tabs)/profile.tsx",
    purpose: "destructive: revoke all sessions confirmation dialog",
  },
  {
    file: "src/app/(tabs)/profile.tsx",
    purpose: "destructive: account deletion confirmation dialog",
  },
  {
    file: "src/app/tests/[id]/index.tsx",
    purpose: "confirmation: guest sign-in required to attempt exam",
  },
  {
    file: "src/app/tests/[id]/runner.tsx",
    purpose: "destructive: hardware back exit exam confirmation dialog",
  },
  {
    file: "src/app/tests/[id]/runner.tsx",
    purpose: "destructive: header exit exam confirmation dialog",
  },
  {
    file: "src/app/pyqs/pdf-view.tsx",
    purpose: "confirmation: guest sign-in required to download offline paper",
  },

  // Pre-existing files not in branch diff (logged as pre-existing)
  {
    file: "src/app/reader/[id].tsx",
    purpose: "pre-existing: legacy reader alerts",
    isPreExisting: true,
  },
  {
    file: "src/app/tutorials/[slug]/index.tsx",
    purpose: "pre-existing: legacy tutorial loader alert",
    isPreExisting: true,
  },
  {
    file: "src/app/tutorials/[slug]/[lessonId].tsx",
    purpose: "pre-existing: legacy tutorial lesson alert",
    isPreExisting: true,
  },
];

describe("T4: Alert.alert Cleanup & Allow-List Enforcement", () => {
  it("enforces that all Alert.alert occurrences match the explicit allow-list", () => {
    const srcDir = path.join(__dirname, "../src");

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

    const allFiles = findFiles(srcDir);
    const violations: string[] = [];

    for (const filePath of allFiles) {
      const relPath = path.relative(path.join(__dirname, ".."), filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        if (line.includes("Alert.alert(")) {
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
  });
});
