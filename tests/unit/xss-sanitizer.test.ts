import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { sanitizeHtml } from "../../lib/security/sanitizer"

describe("A11 stored XSS sanitizer", () => {
  const payloads = [
    `<script>alert(1)</script>`,
    `<SCRIPT type="text/javascript">alert(1)</SCRIPT>`,
    `<script src="https://evil.test/x.js"></script>`,
    `<img src=x onerror=alert(1)>`,
    `<img src=x onerror="alert(1)">`,
    `<img src=x onerror='alert(1)'>`,
    `<svg/onload=alert(1)>`,
    `<svg onload=alert(1)></svg>`,
    `<body/onload=alert(1)>`,
    `<svg><animate onbegin=alert(1)></animate></svg>`,
    `<a href="javascript:alert(1)">click</a>`,
    `<a href='javascript:alert(1)'>click</a>`,
    `<a href="java&#115;cript:alert(1)">entity trick</a>`,
    `<a href="java&#x73;cript:alert(1)">hex entity trick</a>`,
    `<a href="javascript&#58;alert(1)">colon entity trick</a>`,
    `<iframe src="https://evil.test"></iframe>`,
    `<object data="x"></object>`,
    `<embed src="x">`,
    `<form action="/x"><input></form>`,
    `<style>body{background:url(javascript:alert(1))}</style>`,
    `<div style="width:expression(alert(1))">x</div>`,
    `</script><script>alert(1)</script>`,
    `<a href="java\tscript:alert(1)">tab trick</a>`,
  ]

  for (const payload of payloads) {
    test(`neutralises: ${payload.slice(0, 48)}`, () => {
      const clean = sanitizeHtml(payload)
      assert.ok(!/<script/i.test(clean), `script tag survived: ${clean}`)
      assert.ok(!/<iframe/i.test(clean), `iframe survived: ${clean}`)
      assert.ok(!/<object/i.test(clean), `object survived: ${clean}`)
      assert.ok(!/<embed/i.test(clean), `embed survived: ${clean}`)
      assert.ok(!/<form/i.test(clean), `form survived: ${clean}`)
      assert.ok(!/<style/i.test(clean), `style survived: ${clean}`)
      assert.ok(!/(?:^|[\s"'`/])on[a-z0-9_-]+\s*=/i.test(clean), `event handler survived: ${clean}`)
      assert.ok(!/javascript\s*:/i.test(clean), `javascript: URI survived: ${clean}`)
      assert.ok(!/vbscript\s*:/i.test(clean), `vbscript: URI survived: ${clean}`)
      assert.ok(!/data\s*:\s*text\/html/i.test(clean), `data:text/html URI survived: ${clean}`)
      assert.ok(!/expression\s*\(/i.test(clean), `css expression survived: ${clean}`)
    })
  }

  test("keeps harmless formatting", () => {
    const clean = sanitizeHtml("<p>Read <strong>carefully</strong> and solve.</p>")
    assert.equal(clean, "<p>Read <strong>carefully</strong> and solve.</p>")
  })
})
