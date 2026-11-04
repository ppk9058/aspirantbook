/**
 * P4 pure-logic tests: studio hero draft ↔ metadata mapping.
 * Written before the studio UI is wired in.
 */
import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { buildHeroDraft, heroDraftToMetadata, heroDraftToCourseColumns } from "../../components/admin/courses/studio/draft"

describe("studio hero draft", () => {
  test("reads legacy metadata + course columns", () => {
    const draft = buildHeroDraft(
      {
        subtitle: "Old subtitle",
        pillTags: ["UPSC", "Hindi"],
        heroMetrics: [{ value: "120", label: "Lectures" }],
        howItWorks: [{ en: "Enrol", hi: "नामांकन" }],
      },
      { titleHi: "शीर्षक", descriptionHi: "विवरण", technology: "UPSC" }
    )
    assert.equal(draft.titleHi, "शीर्षक")
    assert.equal(draft.descriptionHi, "विवरण")
    assert.equal(draft.category, "UPSC")
    assert.equal(draft.pillTags, "UPSC, Hindi")
    assert.equal(draft.heroMetrics[0].value, "120")
    assert.equal(draft.howItWorks[0].hi, "नामांकन")
  })

  test("missing values become empty strings, never undefined", () => {
    const draft = buildHeroDraft(null)
    for (const [key, value] of Object.entries(draft)) {
      if (Array.isArray(value) || typeof value === "boolean") continue
      assert.equal(typeof value, "string", `${key} must be a string`)
      assert.equal(value, "", `${key} must be empty`)
    }
  })

  test("round-trips through metadata without inventing values", () => {
    const draft = buildHeroDraft({
      subtitle: "Sub",
      pillTags: ["A", "B"],
      heroMetrics: [{ value: "10", label: "Lectures" }],
    })
    const meta = heroDraftToMetadata(draft) as any
    assert.equal(meta.subtitle, "Sub")
    assert.deepEqual(meta.pillTags, ["A", "B"])
    assert.equal(meta.heroMetrics.length, 1)
    assert.equal(meta.validityText, null)
    assert.equal(meta.thumbnailBadge, null)
  })

  test("drops blank metrics and blank bilingual items", () => {
    const meta = heroDraftToMetadata(
      buildHeroDraft({
        heroMetrics: [
          { value: "10", label: "Lectures" },
          { value: "", label: "Empty" },
          { value: "5", label: " " },
        ],
        howItWorks: [{ en: "", hi: "x" }, { en: "Step", hi: "" }],
      })
    ) as any
    assert.equal(meta.heroMetrics.length, 1)
    assert.equal(meta.howItWorks.length, 1)
    assert.equal(meta.howItWorks[0].hi, null)
  })

  test("caps metric/tag counts (metadata cannot grow unbounded)", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ value: String(i), valueHi: "", label: `L${i}`, labelHi: "" }))
    const meta = heroDraftToMetadata(
      buildHeroDraft({})
    ) as any
    assert.deepEqual(meta.heroMetrics, [])

    const capped = heroDraftToMetadata({ ...buildHeroDraft({}), heroMetrics: many, pillTags: "1,2,3,4,5,6,7,8,9,10" }) as any
    assert.equal(capped.heroMetrics.length, 4)
    assert.equal(capped.pillTags.length, 8)
  })

  test("course columns blank out to null so the public page falls back to English", () => {
    const columns = heroDraftToCourseColumns({ ...buildHeroDraft({}), titleHi: "  ", subtitle: "S" })
    assert.equal(columns.titleHi, null)
    assert.equal(columns.subtitle, "S")
    assert.equal(columns.descriptionHi, null)
  })
})
