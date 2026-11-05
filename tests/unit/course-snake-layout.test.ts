import test from "node:test";
import assert from "node:assert/strict";
import { getSnakeRows, type PlanUnitDisplay } from "@/components/course/detail/CoursePlanSection";

function makeUnits(n: number): PlanUnitDisplay[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `u_${i + 1}`,
    number: i + 1,
    numberStr: String(i + 1).padStart(2, "0"),
    title: `Unit ${i + 1}`,
    themes: [],
    tag: "",
    lectureCount: 0,
    themeCount: 0,
    hours: 0,
  }));
}

test("getSnakeRows handles empty array", () => {
  const rows = getSnakeRows([], 5);
  assert.equal(rows.length, 0);
});

test("getSnakeRows handles N = 1", () => {
  const units = makeUnits(1);
  const rows = getSnakeRows(units, 5);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rowIndex, 0);
  assert.equal(rows[0].isReversed, false);
  assert.equal(rows[0].units.length, 1);
  assert.equal(rows[0].units[0].number, 1);
  assert.equal(rows[0].hasCurveToNext, false);
  assert.equal(rows[0].hasSun, true);
  assert.equal(rows[0].sunSide, "right");
});

test("getSnakeRows handles N = 4", () => {
  const units = makeUnits(4);
  const rows = getSnakeRows(units, 5);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rowIndex, 0);
  assert.equal(rows[0].isReversed, false);
  assert.equal(rows[0].units.length, 4);
  assert.equal(rows[0].hasCurveToNext, false);
  assert.equal(rows[0].hasSun, true);
  assert.equal(rows[0].sunSide, "right");
});

test("getSnakeRows handles N = 5 (exact 1 row)", () => {
  const units = makeUnits(5);
  const rows = getSnakeRows(units, 5);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rowIndex, 0);
  assert.equal(rows[0].isReversed, false);
  assert.equal(rows[0].units.length, 5);
  assert.equal(rows[0].units[0].number, 1);
  assert.equal(rows[0].units[4].number, 5);
  assert.equal(rows[0].hasCurveToNext, false);
  assert.equal(rows[0].hasSun, true);
  assert.equal(rows[0].sunSide, "right");
});

test("getSnakeRows handles N = 6 (2 rows, 5 + 1)", () => {
  const units = makeUnits(6);
  const rows = getSnakeRows(units, 5);
  assert.equal(rows.length, 2);

  // Row 0
  assert.equal(rows[0].rowIndex, 0);
  assert.equal(rows[0].isReversed, false);
  assert.equal(rows[0].units.length, 5);
  assert.equal(rows[0].units[0].number, 1);
  assert.equal(rows[0].units[4].number, 5);
  assert.equal(rows[0].hasCurveToNext, true);
  assert.equal(rows[0].curveSide, "right");
  assert.equal(rows[0].hasSun, false);

  // Row 1 (reversed, flow right to left)
  assert.equal(rows[1].rowIndex, 1);
  assert.equal(rows[1].isReversed, true);
  assert.equal(rows[1].units.length, 1);
  assert.equal(rows[1].units[0].number, 6);
  assert.equal(rows[1].hasCurveToNext, false);
  assert.equal(rows[1].hasSun, true);
  assert.equal(rows[1].sunSide, "left");
});

test("getSnakeRows handles N = 9 (BPSC Demolish: 5 + 4)", () => {
  const units = makeUnits(9);
  const rows = getSnakeRows(units, 5);
  assert.equal(rows.length, 2);

  // Row 0: 1 to 5
  assert.equal(rows[0].rowIndex, 0);
  assert.equal(rows[0].isReversed, false);
  assert.equal(rows[0].units.length, 5);
  assert.deepEqual(
    rows[0].units.map((u) => u.number),
    [1, 2, 3, 4, 5]
  );
  assert.equal(rows[0].hasCurveToNext, true);
  assert.equal(rows[0].curveSide, "right");
  assert.equal(rows[0].hasSun, false);

  // Row 1: 6, 7, 8, 9 displayed reversed as [9, 8, 7, 6] so 6 is on the right
  assert.equal(rows[1].rowIndex, 1);
  assert.equal(rows[1].isReversed, true);
  assert.equal(rows[1].units.length, 4);
  assert.deepEqual(
    rows[1].units.map((u) => u.number),
    [9, 8, 7, 6]
  );
  assert.equal(rows[1].hasCurveToNext, false);
  assert.equal(rows[1].hasSun, true);
  assert.equal(rows[1].sunSide, "left");
});

test("getSnakeRows handles N = 10 (2 full rows)", () => {
  const units = makeUnits(10);
  const rows = getSnakeRows(units, 5);
  assert.equal(rows.length, 2);

  // Row 0
  assert.deepEqual(
    rows[0].units.map((u) => u.number),
    [1, 2, 3, 4, 5]
  );
  assert.equal(rows[0].hasCurveToNext, true);
  assert.equal(rows[0].curveSide, "right");

  // Row 1
  assert.deepEqual(
    rows[1].units.map((u) => u.number),
    [10, 9, 8, 7, 6]
  );
  assert.equal(rows[1].hasCurveToNext, false);
  assert.equal(rows[1].hasSun, true);
  assert.equal(rows[1].sunSide, "left");
});

test("getSnakeRows handles N = 11 (3 rows: 5 + 5 + 1)", () => {
  const units = makeUnits(11);
  const rows = getSnakeRows(units, 5);
  assert.equal(rows.length, 3);

  // Row 0: L -> R
  assert.equal(rows[0].isReversed, false);
  assert.equal(rows[0].hasCurveToNext, true);
  assert.equal(rows[0].curveSide, "right");

  // Row 1: R -> L
  assert.equal(rows[1].isReversed, true);
  assert.equal(rows[1].hasCurveToNext, true);
  assert.equal(rows[1].curveSide, "left");

  // Row 2: L -> R
  assert.equal(rows[2].isReversed, false);
  assert.deepEqual(
    rows[2].units.map((u) => u.number),
    [11]
  );
  assert.equal(rows[2].hasCurveToNext, false);
  assert.equal(rows[2].hasSun, true);
  assert.equal(rows[2].sunSide, "right");
});

test("getSnakeRows handles N = 30 (6 full rows)", () => {
  const units = makeUnits(30);
  const rows = getSnakeRows(units, 5);
  assert.equal(rows.length, 6);

  // Even rows (0, 2, 4) are L -> R
  assert.equal(rows[0].isReversed, false);
  assert.equal(rows[2].isReversed, false);
  assert.equal(rows[4].isReversed, false);

  // Odd rows (1, 3, 5) are R -> L
  assert.equal(rows[1].isReversed, true);
  assert.equal(rows[3].isReversed, true);
  assert.equal(rows[5].isReversed, true);

  // Last row has sun on left
  assert.equal(rows[5].hasCurveToNext, false);
  assert.equal(rows[5].hasSun, true);
  assert.equal(rows[5].sunSide, "left");
  assert.deepEqual(
    rows[5].units.map((u) => u.number),
    [30, 29, 28, 27, 26]
  );
});

