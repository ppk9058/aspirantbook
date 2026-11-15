import assert from "node:assert/strict"
import { test, describe } from "node:test"
import fs from "node:fs"
import path from "node:path"

import { safeJsonLdStringify } from "../../lib/seo/core"

/**
 * Regression guard for the JSON-LD XSS gap.
 *
 * `JSON.stringify(x)` leaves `<` intact, so a field such as a course description
 * containing `</script><script>…` breaks out of an inline
 * `<script type="application/ld+json">`. Every inline JSON-LD block must go
 * through the engine: either the `SeoJsonLd` component (lib/seo/json-ld.tsx),
 * which renders every schema with `safeJsonLdStringify`, or — for the few
 * remaining hand-written blocks — `safeJsonLdStringify` directly.
 *
 * Runtime proof of the bug and the fix lives in reports/PHASE_4.md; this test
 * stops a future page from reintroducing the raw `JSON.stringify` form.
 */

const ROOT = path.resolve(__dirname, "../..")
const XSS_PAYLOAD = "</script><script>alert(1)</script>"

/** Pages that must render at least one JSON-LD block through the engine. */
const PAGES_WITH_JSONLD = [
  "app/page.tsx",
  "app/(dashboard)/books/[slug]/page.tsx",
  "app/(dashboard)/courses/[slug]/page.tsx",
  "app/(dashboard)/tutorials/[slug]/page.tsx",
  "app/(dashboard)/test-series/[id]/page.tsx",
  "app/(dashboard)/current-affairs-quizzes/[slug]/page.tsx",
  "app/(dashboard)/pyqs/[examId]/page.tsx",
]

/**
 * Every page that PR A moved onto the engine. The catalogues and static pages
 * emit metadata (and sometimes JSON-LD) through lib/seo adapters; they must
 * never hand-write an unescaped block.
 */
const PAGES_ON_ENGINE = [
  ...PAGES_WITH_JSONLD,
  "app/layout.tsx",
  "app/(dashboard)/test-series/page.tsx",
  "app/(dashboard)/books/page.tsx",
  "app/(dashboard)/courses/page.tsx",
  "app/(dashboard)/tutorials/page.tsx",
  "app/(dashboard)/current-affairs-quizzes/page.tsx",
  "app/about/page.tsx",
  "app/pricing/page.tsx",
  "app/contact/page.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/refund/page.tsx",
  "app/data-deletion/page.tsx",
]

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8")
}

const RAW_STRINGIFY_IN_HTML =
  /dangerouslySetInnerHTML=\{\{\s*__html:\s*(?:JSON\.stringify\(|[a-zA-Z_$][\w$]*\.stringify\()/

describe("inline JSON-LD escaping", () => {
  test("the engine escapes < as \\u003c and output stays valid JSON", () => {
    const payload = {
      "@context": "https://schema.org",
      name: XSS_PAYLOAD,
      description: `before ${XSS_PAYLOAD} after`,
      nested: [{ value: XSS_PAYLOAD }],
    }
    const out = safeJsonLdStringify(payload)

    assert.equal(out.includes("<"), false, "escaped JSON-LD must not contain a raw <")
    assert.ok(out.includes("\\u003c"), "escaped JSON-LD must contain \\u003c")

    // Escaping must not corrupt the payload: it still parses to the same data.
    const parsed = JSON.parse(out) as typeof payload
    assert.equal(parsed.name, XSS_PAYLOAD)
    assert.equal(parsed.nested[0].value, XSS_PAYLOAD)
  })

  test("SeoJsonLd is the render path and always escapes through the engine", () => {
    const component = read("lib/seo/json-ld.tsx")
    assert.ok(
      component.includes('type="application/ld+json"'),
      "SeoJsonLd must render the ld+json script"
    )
    assert.ok(
      component.includes("safeJsonLdStringify"),
      "SeoJsonLd must escape every schema with safeJsonLdStringify"
    )
    // The component must never fall back to raw JSON.stringify.
    assert.equal(
      RAW_STRINGIFY_IN_HTML.test(component),
      false,
      "lib/seo/json-ld.tsx: raw JSON.stringify found inside dangerouslySetInnerHTML"
    )
  })

  for (const rel of PAGES_WITH_JSONLD) {
    test(`${rel} renders JSON-LD through the engine`, () => {
      const src = read(rel)
      const usesEngine = src.includes("SeoJsonLd") || src.includes("safeJsonLdStringify(")
      assert.ok(usesEngine, `${rel}: expected a JSON-LD block rendered via SeoJsonLd/safeJsonLdStringify`)
      assert.equal(
        RAW_STRINGIFY_IN_HTML.test(src),
        false,
        `${rel}: raw JSON.stringify found inside dangerouslySetInnerHTML`
      )
    })
  }

  for (const rel of PAGES_ON_ENGINE) {
    test(`${rel} has no unescaped inline JSON-LD`, () => {
      const src = read(rel)
      assert.equal(
        RAW_STRINGIFY_IN_HTML.test(src),
        false,
        `${rel}: raw JSON.stringify found inside dangerouslySetInnerHTML`
      )

      // Every page on the engine must use the shared helpers for metadata or
      // JSON-LD; a page that builds either by hand bypasses the canonical,
      // escaping and hreflang rules.
      const usesEngine =
        src.includes("SeoJsonLd") ||
        src.includes("safeJsonLdStringify(") ||
        src.includes("getBaseUrl(") ||
        /adapt[A-Za-z]+Seo\(/.test(src) ||
        /build[A-Za-z]+JsonLd\(/.test(src)
      assert.ok(usesEngine, `${rel}: expected lib/seo engine usage (adapter or SeoJsonLd)`)
    })
  }
})
