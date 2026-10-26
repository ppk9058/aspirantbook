import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("A4: KI-9 Guest State Cleanup & KI-13 GoalBar Copy Standardization", () => {
  const homePath = path.resolve(__dirname, "../src/app/(tabs)/home.tsx");
  const coursesPath = path.resolve(__dirname, "../src/app/(tabs)/courses.tsx");
  const testsPath = path.resolve(__dirname, "../src/app/(tabs)/tests.tsx");
  const headerPath = path.resolve(__dirname, "../src/components/shell/MobileAppHeader.tsx");

  it("KI-9: MobileAppHeader gates notificationDot strictly behind isAuthenticated", () => {
    const headerContent = fs.readFileSync(headerPath, "utf8");
    // Verify notification dot is guarded by isAuthenticated
    assert.ok(
      headerContent.includes("{isAuthenticated ? (") || headerContent.includes("isAuthenticated &&"),
      "MobileAppHeader must guard notification dot with isAuthenticated"
    );
    assert.ok(
      headerContent.includes("testID=\"mobile-header-notification-dot\""),
      "MobileAppHeader must tag notification dot with mobile-header-notification-dot"
    );
  });

  it("KI-9: Home screen gates streakBadge strictly behind isAuthenticated and real streak data > 0", () => {
    const homeContent = fs.readFileSync(homePath, "utf8");
    assert.ok(
      homeContent.includes("isAuthenticated && Boolean(data?.streakDays)"),
      "Home screen must check isAuthenticated and streakDays"
    );
    assert.ok(
      !homeContent.includes("{data?.streakDays || 1} Day Streak"),
      "Home screen must not fallback to fake '1 Day Streak'"
    );
  });

  it("KI-13: Home, Courses, and Tests standardize GoalBar copy to 'Goal: <exam>' and 'Change'", () => {
    const homeContent = fs.readFileSync(homePath, "utf8");
    const coursesContent = fs.readFileSync(coursesPath, "utf8");
    const testsContent = fs.readFileSync(testsPath, "utf8");

    // All must use "Goal: "
    assert.ok(homeContent.includes("Goal: <Text"), "Home GoalBar must start with 'Goal:'");
    assert.ok(coursesContent.includes("Goal: <Text"), "Courses GoalBar must start with 'Goal:'");
    assert.ok(testsContent.includes("Goal: <Text"), "Tests GoalBar must start with 'Goal:'");

    // All must use action "Change"
    assert.ok(homeContent.includes(">Change</Text>"), "Home switch button must say 'Change'");
    assert.ok(coursesContent.includes(">Change</Text>"), "Courses switch button must say 'Change'");
    assert.ok(testsContent.includes(">Change</Text>"), "Tests switch button must say 'Change'");

    // Obsolete copy must be 100% gone
    assert.ok(!coursesContent.includes("Switch →"), "Courses must not contain 'Switch →'");
    assert.ok(!testsContent.includes("Change Exam →"), "Tests must not contain 'Change Exam →'");
    assert.ok(!testsContent.includes("Targeting:"), "Tests must not contain 'Targeting:'");
  });
});
