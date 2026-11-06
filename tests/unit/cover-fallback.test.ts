import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { generateCourseCoverSvg, isValidThumbnailUrl } from "../../lib/courses/cover-fallback"

describe("Course Cover Fallback Generator & Validator", () => {
  test("generates SVG data URI with safe escaping", () => {
    const dataUri = generateCourseCoverSvg({
      title: "IBPS PO Mains & Banking <Awareness>",
      category: "Banking",
      brand: "TrillionSkill",
    })

    assert.ok(dataUri.startsWith("data:image/svg+xml;utf8,"))
    const decoded = decodeURIComponent(dataUri.replace("data:image/svg+xml;utf8,", ""))
    assert.ok(decoded.includes("IBPS PO Mains &amp; Banking &lt;Awareness&gt;"))
    assert.ok(decoded.includes("TRILLIONSKILL • BANKING"))
    assert.ok(decoded.includes("<svg"))
  })

  test("isValidThumbnailUrl validates properly", () => {
    assert.equal(isValidThumbnailUrl(""), false)
    assert.equal(isValidThumbnailUrl(null), false)
    assert.equal(isValidThumbnailUrl(undefined), false)
    assert.equal(isValidThumbnailUrl("/placeholder-course.svg"), false)
    assert.equal(isValidThumbnailUrl("https://example.com/cover.png"), true)
    assert.equal(isValidThumbnailUrl("/images/course.jpg"), true)
    assert.equal(isValidThumbnailUrl("data:image/svg+xml;utf8,..."), true)
  })
})
