import test from "node:test"
import assert from "node:assert/strict"
import { getContrastRatio, evaluateThemeContrast } from "@/lib/courses/contrast"
import { DEFAULT_COURSE_THEME } from "@/components/course/detail/theme"

test("getContrastRatio correctly calculates black on white", () => {
  const ratio = getContrastRatio("#000000", "#FFFFFF")
  assert.equal(ratio, 21)
})

test("getContrastRatio correctly calculates identical colors", () => {
  const ratio = getContrastRatio("#FFFFFF", "#FFFFFF")
  assert.equal(ratio, 1)
})

test("evaluateThemeContrast passes default palette", () => {
  const results = evaluateThemeContrast(DEFAULT_COURSE_THEME)
  assert.equal(results.length, 4)
  for (const check of results) {
    assert.equal(check.passes, true, `${check.pair} should pass with ratio ${check.ratio}`)
  }
})

test("evaluateThemeContrast flags low contrast custom palette", () => {
  const lowContrastTheme = {
    ...DEFAULT_COURSE_THEME,
    navy: "#E0E0E0", // Very light background with white text = FAIL
    ink: "#EAEAEA",  // Very light text on cream = FAIL
  }
  const results = evaluateThemeContrast(lowContrastTheme)
  const failed = results.filter((r) => !r.passes)
  assert.ok(failed.length >= 2, "Expected at least 2 checks to fail")
})
