import { sanitizeReturnPath } from "../../lib/utils/return-path"

const cases: Array<[string, string]> = [
  ["//evil.example", "/test-series"],
  ["//evil.example/path", "/test-series"],
  ["/\\evil.example", "/test-series"],
  ["\\\\evil.example", "/test-series"],
  ["https://evil.example", "/test-series"],
  ["http:evil.example", "/test-series"],
  ["javascript:alert(1)", "/test-series"],
  ["/%2F%2Fevil.example", "/test-series"],
  ["/%252F%252Fevil.example", "/test-series"],
  ["/@evil.example", "/test-series"],
  ["/path?next=//evil.example", "/path?next=//evil.example"],
  ["/search?q=what+is+https:", "/search?q=what+is+https:"],
  ["/courses/abc?x=1#frag", "/courses/abc?x=1#frag"],
  ["http://localhost.evil.example/path", "/test-series"],
  ["/dashboard\nSet-Cookie: x=1", "/test-series"],
  ["/dashboard\t/evil", "/test-series"],
  ["", "/test-series"],
  ["/", "/"],
]

let failures = 0
for (const [input, expected] of cases) {
  const got = sanitizeReturnPath(input)
  const ok = got === expected
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"} | in=${JSON.stringify(input)} | out=${JSON.stringify(got)} | expected=${JSON.stringify(expected)}`)
}
console.log(`\n${cases.length - failures}/${cases.length} passed`)
process.exit(failures === 0 ? 0 : 1)
