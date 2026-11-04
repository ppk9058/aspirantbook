import { sanitizeHtml } from "../../lib/security/sanitizer"
import { inlineFmt } from "../../lib/rosera/inline"

const payloads = [
  `<script>alert(1)</script>`,
  `<SCRIPT SRC=//evil.example/x.js></SCRIPT>`,
  `<img src=x onerror=alert(1)>`,
  `<img src=x OnErRoR = "alert(1)">`,
  `<svg/onload=alert(1)>`,
  `<svg onload=alert(1)></svg>`,
  `<svg><animate onbegin=alert(1)></animate></svg>`,
  `<body/onload=alert(1)>`,
  `<a href="javascript:alert(1)">x</a>`,
  `<a href="JaVaScRiPt&#58;alert(1)">x</a>`,
  `<a href="java&#115;cript:alert(1)">x</a>`,
  `<a href="java&#x73;cript:alert(1)">x</a>`,
  `<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>`,
  `<iframe src="https://evil.example"></iframe>`,
  `<object data="x"></object>`,
  `<embed src="x">`,
  `<form action="https://evil.example"><input name=x></form>`,
  `<style>body{background:url(javascript:alert(1))}</style>`,
  `<div style="width:expression(alert(1))">x</div>`,
  `<base href="https://evil.example/">`,
  `<meta http-equiv="refresh" content="0;url=https://evil.example">`,
  `<link rel="stylesheet" href="https://evil.example/x.css">`,
  `<script>/* unterminated`,
  `<<script>script>alert(1)<</script>/script>`,
  `<math><mtext></mtext></math><script>alert(1)</script>`,
]

function sanitizerFailures(out: string): string[] {
  const bad: string[] = []
  if (/<\s*script/i.test(out)) bad.push("script-tag")
  if (/(?:^|[\s"'`/])on[a-z0-9_-]+\s*=/i.test(out)) bad.push("event-handler")
  if (/(?:javascript|vbscript)\s*:/i.test(out)) bad.push("script-uri")
  if (/data\s*:\s*text\/html/i.test(out)) bad.push("data-html-uri")
  if (/<\s*(iframe|object|embed|form|style|meta|link|base)\b/i.test(out)) bad.push("dangerous-tag")
  if (/expression\s*\(/i.test(out)) bad.push("css-expression")
  return bad
}

let failures = 0
for (const p of payloads) {
  const out = sanitizeHtml(p)
  const bad = sanitizerFailures(out)
  if (bad.length) failures++
  console.log(`${bad.length ? "FAIL" : "PASS"} | ${bad.join(",") || "clean"} | in=${JSON.stringify(p).slice(0, 66)} | out=${JSON.stringify(out).slice(0, 80)}`)
}

const inlinePayloads = [
  `<script>alert(1)</script>`,
  `<img src=x onerror=alert(1)>`,
  `<svg/onload=alert(1)>`,
  `**bold** ==mark== \`code\``,
  `& < > " '`,
]
for (const p of inlinePayloads) {
  const out = inlineFmt(p)
  // inlineFmt escapes < and > first, so only an unescaped tag is dangerous.
  const stripped = out.replace(/&lt;/g, "").replace(/&gt;/g, "")
  const bad = /<\s*(?!\/?(?:strong|mark|code)\b)[a-z]/i.test(stripped)
  if (bad) failures++
  console.log(`${bad ? "FAIL" : "PASS"} | inlineFmt | in=${JSON.stringify(p)} | out=${JSON.stringify(out)}`)
}

console.log(`\nfailures=${failures}`)
process.exit(failures === 0 ? 0 : 1)
