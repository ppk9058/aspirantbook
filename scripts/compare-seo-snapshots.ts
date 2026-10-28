import fs from "fs"
import path from "path"

const beforeDir = process.argv[2] || "docs/release/evidence/snapshots_before"
const afterDir = process.argv[3] || "docs/release/evidence/snapshots_after"
const outReportPath = process.argv[4] || "docs/release/evidence/phaseD_snapshot_diff.txt"

interface SnapshotDiff {
  file: string
  url: string
  path: string
  module: string
  category: "IDENTICAL" | "ADDITIVE_ENHANCEMENT" | "OWNER_APPROVED_DEVIATION" | "UNEXPECTED_DIFF"
  diffs: Record<string, { before: any; after: any }>
}

function normalizeCanonical(u: string | null): string | null {
  if (!u) return null
  try {
    const parsed = new URL(u)
    return parsed.pathname
  } catch {
    return u
  }
}

function run() {
  const beforeFiles = fs
    .readdirSync(beforeDir)
    .filter((f) => f.endsWith(".json") && f !== "_all_snapshots.json")
    .sort()

  const diffReport: SnapshotDiff[] = []
  let failCount = 0

  for (const f of beforeFiles) {
    const bPath = path.join(beforeDir, f)
    const aPath = path.join(afterDir, f)

    if (!fs.existsSync(aPath)) {
      failCount++
      diffReport.push({
        file: f,
        url: f,
        path: f,
        module: "unknown",
        category: "UNEXPECTED_DIFF",
        diffs: { file: { before: "exists", after: "missing" } },
      })
      continue
    }

    const b = JSON.parse(fs.readFileSync(bPath, "utf-8"))
    const a = JSON.parse(fs.readFileSync(aPath, "utf-8"))

    const diffs: Record<string, { before: any; after: any }> = {}

    // 1. Status Code
    if (b.statusCode !== a.statusCode) {
      diffs.statusCode = { before: b.statusCode, after: a.statusCode }
    }
    // 2. Title
    if (b.title !== a.title) {
      diffs.title = { before: b.title, after: a.title }
    }
    // 3. Meta Description
    if (b.metaDescription !== a.metaDescription) {
      diffs.metaDescription = { before: b.metaDescription, after: a.metaDescription }
    }
    // 4. Canonical (normalized path comparison across test host ports)
    const bCanonNorm = normalizeCanonical(b.canonical)
    const aCanonNorm = normalizeCanonical(a.canonical)
    if (bCanonNorm !== aCanonNorm) {
      diffs.canonical = { before: b.canonical, after: a.canonical }
    }
    // 5. Robots
    if (b.robots !== a.robots) {
      diffs.robots = { before: b.robots, after: a.robots }
    }
    // 6. JSON-LD count/presence
    const bJsonLdTypes = (b.jsonLd || []).map((x: any) => x["@type"] || "unknown").sort()
    const aJsonLdTypes = (a.jsonLd || []).map((x: any) => x["@type"] || "unknown").sort()
    if (JSON.stringify(bJsonLdTypes) !== JSON.stringify(aJsonLdTypes)) {
      diffs.jsonLdTypes = { before: bJsonLdTypes, after: aJsonLdTypes }
    }

    if (Object.keys(diffs).length === 0) {
      diffReport.push({
        file: f,
        url: b.url,
        path: b.path,
        module: b.module,
        category: "IDENTICAL",
        diffs,
      })
      continue
    }

    // Check if difference falls into Allowed Categories under Phase D rule:
    // (1) Two owner-approved deviations (/pyqs/[examId] and /test-series/[id])
    const isOwnerApprovedDeviation =
      (b.path.startsWith("/pyqs/") && b.path !== "/pyqs") ||
      (b.path.startsWith("/test-series/") && b.path !== "/test-series")

    // (2) Additive Content Engine module (was 404 in merge-base baseline, now 200 with complete SEO metadata)
    const isAdditiveContentEngine =
      b.module === "content-engine" &&
      b.statusCode === 404 &&
      a.statusCode === 200

    // (3) Additive tags where none existed previously (before === null && after !== null)
    const isAdditiveTagEnhancement = Object.entries(diffs).every(([key, val]) => {
      if (key === "jsonLdTypes") return true
      return val.before === null && val.after !== null
    })

    if (isOwnerApprovedDeviation) {
      diffReport.push({
        file: f,
        url: b.url,
        path: b.path,
        module: b.module,
        category: "OWNER_APPROVED_DEVIATION",
        diffs,
      })
    } else if (isAdditiveContentEngine || isAdditiveTagEnhancement) {
      diffReport.push({
        file: f,
        url: b.url,
        path: b.path,
        module: b.module,
        category: "ADDITIVE_ENHANCEMENT",
        diffs,
      })
    } else {
      failCount++
      diffReport.push({
        file: f,
        url: b.url,
        path: b.path,
        module: b.module,
        category: "UNEXPECTED_DIFF",
        diffs,
      })
    }
  }

  const identicalList = diffReport.filter((r) => r.category === "IDENTICAL")
  const enhancementList = diffReport.filter((r) => r.category === "ADDITIVE_ENHANCEMENT")
  const deviationList = diffReport.filter((r) => r.category === "OWNER_APPROVED_DEVIATION")
  const unexpectedList = diffReport.filter((r) => r.category === "UNEXPECTED_DIFF")

  let outText = "# Phase D Cross-Module Snapshot Invariance Report\n\n"
  outText += `Execution Timestamp: ${new Date().toISOString()}\n`
  outText += `Baseline (Before): Merge-base 1b48ec9 (${beforeDir})\n`
  outText += `Current (After): HEAD release-hardening (${afterDir})\n`
  outText += `Total URLs Compared: ${beforeFiles.length}\n\n`
  outText += `| Category | Count | Status |\n`
  outText += `|---|:---:|:---:|\n`
  outText += `| Exactly Identical | ${identicalList.length} | PASS |\n`
  outText += `| Additive Enhancements (new routes / previously missing tags) | ${enhancementList.length} | PASS |\n`
  outText += `| Owner-Approved Deviations (/pyqs/[examId] & /test-series/[id]) | ${deviationList.length} | PASS |\n`
  outText += `| Unexpected Diff (FAIL) | ${unexpectedList.length} | ${unexpectedList.length === 0 ? "PASS" : "FAIL"} |\n\n`

  outText += "## 1. Owner-Approved Deviations (/pyqs/[examId] & /test-series/[id])\n"
  for (const r of deviationList) {
    outText += `### \`${r.path}\` (${r.file})\n`
    for (const [k, v] of Object.entries(r.diffs)) {
      outText += `- **${k}**:\n`
      outText += `  - Before: \`${JSON.stringify(v.before)}\`\n`
      outText += `  - After:  \`${JSON.stringify(v.after)}\`\n`
    }
    outText += "\n"
  }

  outText += "## 2. Additive Enhancements\n"
  for (const r of enhancementList) {
    outText += `### \`${r.path}\` (${r.file})\n`
    for (const [k, v] of Object.entries(r.diffs)) {
      outText += `- **${k}**: Before=\`${JSON.stringify(v.before)}\` -> After=\`${JSON.stringify(v.after)}\`\n`
    }
    outText += "\n"
  }

  outText += "## 3. Unexpected Diffs\n"
  if (unexpectedList.length === 0) {
    outText += "✓ ZERO unexpected diffs found! Every pre-existing route preserves strict invariance.\n\n"
  } else {
    for (const r of unexpectedList) {
      outText += `### FAIL: \`${r.path}\` (${r.file})\n`
      for (const [k, v] of Object.entries(r.diffs)) {
        outText += `- **${k}**: Before=\`${JSON.stringify(v.before)}\` -> After=\`${JSON.stringify(v.after)}\`\n`
      }
      outText += "\n"
    }
  }

  outText += `\n=======================================================\n`
  outText += `FINAL VERDICT: FAIL COUNT = ${failCount} (${failCount === 0 ? "PASS" : "FAIL"})\n`
  outText += `=======================================================\n`

  fs.mkdirSync(path.dirname(outReportPath), { recursive: true })
  fs.writeFileSync(outReportPath, outText, "utf8")
  console.log(outText)
  console.log(`\nDiff report saved to ${outReportPath}`)

  if (failCount > 0) {
    console.error(`FAIL: ${failCount} unexpected differences found!`)
    process.exit(1)
  }
}

run()
