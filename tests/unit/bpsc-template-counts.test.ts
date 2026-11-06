import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { BPSC_MAINS_DEMOLISH_TEMPLATE } from "../../lib/courses/templates"

describe("BPSC Mains Demolish Template Counts (Spec Parity)", () => {
  test("yields exactly 9 units, 41 themes, 9 lectures, ₹5,499 and teacher Abhimanyu Kumar", () => {
    const tpl = BPSC_MAINS_DEMOLISH_TEMPLATE

    // 1. Exactly 9 units
    assert.equal(tpl.units.length, 9, `Expected 9 units, got ${tpl.units.length}`)

    // 2. Exactly 41 themes across all units
    const totalThemes = tpl.units.reduce((acc, u) => acc + u.themes.length, 0)
    assert.equal(totalThemes, 41, `Expected 41 themes, got ${totalThemes}`)

    // 3. Exactly 9 lectures across all units
    const totalLectures = tpl.units.reduce(
      (acc, u) => acc + u.themes.reduce((tAcc, t) => tAcc + (t.lectures?.length || 0), 0),
      0
    )
    assert.equal(totalLectures, 9, `Expected 9 lectures, got ${totalLectures}`)

    // 4. Pricing ₹5,499
    assert.equal(tpl.price, 5499, `Expected price 5499, got ${tpl.price}`)

    // 5. Primary Teacher Abhimanyu Kumar
    assert.ok(tpl.teachers.length >= 1)
    assert.equal(tpl.teachers[0].name, "Abhimanyu Kumar")
  })
})
