import { execSync } from "child_process"
import fs from "fs"

interface MutationDefinition {
  id: number
  description: string
  filePath: string
  targetStr: string
  replacement: string
  testCommand: string
}

const mutations: MutationDefinition[] = [
  {
    id: 1,
    description: "Quality Gates: Disable missing-answer failure check",
    filePath: "lib/modules/content-engine/quality-gates.ts",
    targetStr: "if (item.a < 0) {",
    replacement: "if (false) {",
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 2,
    description: "Quality Gates: Weaken few-options threshold (< 4 to < 2)",
    filePath: "lib/modules/content-engine/quality-gates.ts",
    targetStr: "if (item.o.length < 4) {",
    replacement: "if (item.o.length < 2) {",
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 3,
    description: "Quality Gates: Weaken thin-explanation threshold (< 80 to < 10)",
    filePath: "lib/modules/content-engine/quality-gates.ts",
    targetStr: "if (effectiveExp.length < 80) {",
    replacement: "if (effectiveExp.length < 10) {",
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 4,
    description: "Quality Gates: Disable no-source failure check",
    filePath: "lib/modules/content-engine/quality-gates.ts",
    targetStr: "if (!item.src || !item.src.trim()) {",
    replacement: "if (false) {",
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 5,
    description: "Quality Gates: Disable uncategorized failure check",
    filePath: "lib/modules/content-engine/quality-gates.ts",
    targetStr: 'if (!item.top || item.top === "General" || !item.sub || item.sub === "Uncategorized") {',
    replacement: "if (false) {",
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 6,
    description: "Quality Gates: Weaken duplicate similarity threshold from 0.8 to 0.999",
    filePath: "lib/modules/content-engine/quality-gates.ts",
    targetStr: "if (sim >= 0.8) {",
    replacement: "if (sim >= 0.999) {",
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 7,
    description: "Quality Gates: Disable strict unverified check",
    filePath: "lib/modules/content-engine/quality-gates.ts",
    targetStr: "if (options.strict && !item.isVerified) {",
    replacement: "if (false) {",
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 8,
    description: "Classifier: Disable nukta stripping in nz()",
    filePath: "lib/modules/content-engine/classifier.ts",
    targetStr: '.replace(/[\\u093C\\u200c\\u200d\\u0951-\\u0954]/g, "")',
    replacement: '// nukta stripped removed',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 9,
    description: "Classifier: Disable chandrabindu to anusvara conversion in nz()",
    filePath: "lib/modules/content-engine/classifier.ts",
    targetStr: '.replace(/\\u0901/g, "\\u0902")',
    replacement: '// chandrabindu removed',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 10,
    description: "Classifier: Disable nasal halant conversion in nz()",
    filePath: "lib/modules/content-engine/classifier.ts",
    targetStr: '.replace(/[ङञणनम]\\u094D(?=[क-ह])/g, "\\u0902")',
    replacement: '// nasal halant removed',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 11,
    description: "Classifier: Disable bare nga to da OCR conversion in nz()",
    filePath: "lib/modules/content-engine/classifier.ts",
    targetStr: '.replace(/ङ(?!\\u094D)/g, "ड")',
    replacement: '// bare nga removed',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 12,
    description: "SEO Model: Disable unreviewed Hindi noindex robot tag",
    filePath: "lib/modules/content-engine/seo-model.ts",
    targetStr: 'const robots = isIndexable ? "index, follow" : "noindex, follow"',
    replacement: 'const robots = "index, follow"',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 13,
    description: "SEO Model: Disable < tag escaping in safeJsonLdStringify",
    filePath: "lib/modules/content-engine/seo-model.ts",
    targetStr: '.replace(/</g, "\\\\u003c")',
    replacement: '.replace(/</g, "<")',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 14,
    description: "Static Export: Leak unreviewed Hindi pages into static export",
    filePath: "lib/modules/content-engine/static-export.ts",
    targetStr: 'if (hiTr && hiTr.isReviewed) {',
    replacement: 'if (hiTr) {',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 15,
    description: "Static Export: Leak unpublished draft questions into static export",
    filePath: "lib/modules/content-engine/static-export.ts",
    targetStr: "const published = questions.filter((q) => q.isPublished && q.slug)",
    replacement: "const published = questions",
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 16,
    description: "Static Export: Break Primary mode canonical host resolution",
    filePath: "lib/modules/content-engine/static-export.ts",
    targetStr: 'customBaseUrl || (exportMode === "primary" ? defaultPrimary : defaultMirror)',
    replacement: 'defaultMirror',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 17,
    description: "Cross Reference: Disable self-reference cycle prevention",
    filePath: "lib/modules/content-engine/cross-ref.ts",
    targetStr: 'x.id !== i.id && +Number(x.no) === targetNo',
    replacement: '+Number(x.no) === targetNo',
    testCommand: "npx tsx --test tests/content-engine/mutations.test.ts",
  },
  {
    id: 18,
    description: "Parser: Disable OCR junk line filter",
    filePath: "lib/modules/content-engine/parser.ts",
    targetStr: "if (isOcrJunkLine(l)) {",
    replacement: "if (false) {",
    testCommand: "npx tsx --test tests/content-engine/parser-bugs.test.ts",
  },
  {
    id: 19,
    description: "Parser: Break decimal-led line handling",
    filePath: "lib/modules/content-engine/parser.ts",
    targetStr: "if (/^\\d{1,3}\\.\\d/.test(l)) {",
    replacement: "if (false && /^\\d{1,3}\\.\\d/.test(l)) {",
    testCommand: "npx tsx --test tests/content-engine/parser-bugs.test.ts",
  },
  {
    id: 20,
    description: "Public Redirect: Break /q/[shortId] route handler",
    filePath: "app/q/[shortId]/route.ts",
    targetStr: 'return NextResponse.redirect(new URL("/question-answer", req.url), 302)',
    replacement: "return NextResponse.json({ ok: false }, { status: 500 })",
    testCommand: "npx tsx --test tests/content-engine/public-pages.test.ts",
  },
]

async function runMutations() {
  let log = "=== Phase E — Real Mutation Testing Suite ===\n"
  log += "Total Mutations Planned: " + mutations.length + "\n\n"
  log += "| Mutation # | Description | Target File | Test Turned RED? | Revert Turned GREEN? |\n"
  log += "|:---|:---|:---|:---|:---|\n"

  let passedCount = 0

  for (const m of mutations) {
    const originalContent = fs.readFileSync(m.filePath, "utf8")
    if (!originalContent.includes(m.targetStr)) {
      console.error(`Target not found in ${m.filePath} for mutation ${m.id}: "${m.targetStr}"`)
      continue
    }

    // Apply mutation
    const mutatedContent = originalContent.replace(m.targetStr, m.replacement)
    fs.writeFileSync(m.filePath, mutatedContent, "utf8")

    let redPassed = false

    try {
      execSync(m.testCommand, { stdio: "pipe", encoding: "utf8" })
      redPassed = false
    } catch {
      // Exit code !== 0 means test properly failed (RED)!
      redPassed = true
    }

    // Revert mutation
    fs.writeFileSync(m.filePath, originalContent, "utf8")

    // Verify GREEN after revert
    let greenPassed = false
    try {
      execSync(m.testCommand, { stdio: "pipe", encoding: "utf8" })
      greenPassed = true
    } catch {
      greenPassed = false
    }

    const status = redPassed && greenPassed ? "PASS" : "FAIL"
    if (status === "PASS") passedCount++

    console.log(`Mutation ${m.id} (${m.description}): RED=${redPassed}, GREEN=${greenPassed} -> ${status}`)
    log += `| ${m.id} | ${m.description} | \`${m.filePath}\` | **${redPassed ? "YES (RED)" : "NO"}** | **${greenPassed ? "YES (GREEN)" : "NO"}** |\n`
  }

  log += `\nTotal Real Mutations Verified: ${passedCount} / ${mutations.length} PASSED\n`
  fs.writeFileSync("docs/content-engine/evidence/phaseE_real_mutations.txt", log, "utf8")
  console.log(`\nMutation testing complete! ${passedCount} / ${mutations.length} mutations passed. Output saved to docs/content-engine/evidence/phaseE_real_mutations.txt`)
}

runMutations().catch(console.error)
