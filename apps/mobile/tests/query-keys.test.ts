import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCoursesQueryKey } from "../src/lib/query-keys";

describe("Bug #10: courses query key must include the selected goal", () => {
  it("produces a different key for each goal", () => {
    assert.notDeepEqual(
      buildCoursesQueryKey("upsc", "ALL", ""),
      buildCoursesQueryKey("bpsc", "ALL", "")
    );
  });

  it("keeps the goal, difficulty and search in the key in a stable order", () => {
    assert.deepEqual(buildCoursesQueryKey("upsc", "ALL", ""), [
      "courses-list",
      "upsc",
      "ALL",
      "",
    ]);
  });

  it("still invalidates on difficulty and search changes", () => {
    const base = buildCoursesQueryKey("upsc", "ALL", "");
    assert.notDeepEqual(base, buildCoursesQueryKey("upsc", "BEGINNER", ""));
    assert.notDeepEqual(base, buildCoursesQueryKey("upsc", "ALL", "polity"));
  });
});
