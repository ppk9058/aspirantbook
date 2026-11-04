import assert from "node:assert/strict"
import { test, describe } from "node:test"
import fs from "node:fs"
import path from "node:path"

/**
 * Regression guard for the JSON-LD XSS gap.
 *
 * `JSON.stringify(x)` leaves `<` intact, so a field such as a course description
 * containing `</script><script>…` breaks out of an inline
 * `<script type="application/ld+json">`. Every inline JSON-LD block must go
 * through `safeJsonLdStringify`, which escapes `<` as `\u003c`.
 *
 * Runtime proof of the bug and the fix lives in reports/PHASE_4.md; this test
 * stops a future page from reintroducing the raw `JSON.stringify` form.
 */

const ROOT = path.resolve(__dirname, "../..")

const FILES_WITH_JSONLD = [
  "app/page.tsx",
  "app/(dashboard)/books/[slug]/page.tsx",
  "app/(dashboard)/courses/[slug]/page.tsx",
  "app/(dashboard)/tutorials/[slug]/page.tsx",
  "app/(dashboard)/test-series/[id]/page.tsx",
  "app/(dashboard)/current-affairs-quizzes/[slug]/page.tsx",
  "app/(dashboard)/pyqs/[examId]/page.tsx",
]

describe("inline JSON-LD escaping", () => {
  for (const rel of FILES_WITH_JSONLD) {
    test(`${rel} uses safeJsonLdStringify`, () => {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8")
      assert.ok(src.includes("application/ld+json"), `${rel}: expected a JSON-LD block`)
      assert.ok(
        src.includes("safeJsonLdStringify("),
        `${rel}: JSON-LD must use safeJsonLdStringify, not JSON.stringify`
      )
      assert.equal(
        /dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify\(/.test(src),
        false,
        `${rel}: raw JSON.stringify found inside dangerouslySetInnerHTML`
      )
    })
  }
})
