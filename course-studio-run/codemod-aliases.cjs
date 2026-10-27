// One-shot codemod: replace the four duplicated COURSE_ALIASES maps with the
// shared lib/courses/slug-aliases.ts helper. Run once, then delete.
const fs = require("fs")

const files = [
  "app/api/auth/mobile-login/route.ts",
  "app/api/checkout/course-info/route.ts",
  "app/api/courses/enroll/route.ts",
  "app/api/verify-payment/razorpay/route.ts",
]

const blockRe = /const COURSE_ALIASES: Record<string, string> = \{[\s\S]*?\n\}\n/

for (const file of files) {
  let src = fs.readFileSync(file, "utf8")
  if (!blockRe.test(src)) {
    console.log("SKIP (no block):", file)
    continue
  }
  src = src.replace(blockRe, "")
  src = src.replace(/COURSE_ALIASES\[([A-Za-z0-9_]+)\] \|\| \1/g, "resolveCourseAlias($1)")
  // Add the import after the last top-level import line.
  const importLine = 'import { resolveCourseAlias } from "@/lib/courses/slug-aliases"\n'
  if (!src.includes(importLine)) {
    const lines = src.split("\n")
    let lastImport = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^import .* from ["'].*["']\s*$/.test(lines[i])) lastImport = i
    }
    lines.splice(lastImport + 1, 0, importLine.trimEnd())
    src = lines.join("\n")
  }
  fs.writeFileSync(file, src)
  console.log("PATCHED:", file)
}
