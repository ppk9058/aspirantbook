import fs from "fs"
import path from "path"

const beforeDir = "docs/seo/evidence/snapshots_before"
const afterDir = "docs/seo/evidence/snapshots_after"

function run() {
  const beforeFiles = fs.readdirSync(beforeDir).filter((f) => f.endsWith(".json") && f !== "_all_snapshots.json")

  const diffReport: Array<{
    file: string
    url: string
    status: "IDENTICAL" | "ENHANCED" | "DEVIATION"
    diffs: Record<string, { before: any; after: any }>
  }> = []

  let identicalCount = 0
  let enhancedCount = 0
  let deviationCount = 0

  for (const f of beforeFiles) {
    const bPath = path.join(beforeDir, f)
    const aPath = path.join(afterDir, f)

    if (!fs.existsSync(aPath)) {
      console.error(`Missing after snapshot for ${f}`)
      continue
    }

    const b = JSON.parse(fs.readFileSync(bPath, "utf-8"))
    const a = JSON.parse(fs.readFileSync(aPath, "utf-8"))

    const diffs: Record<string, { before: any; after: any }> = {}

    // Check title
    if (b.title !== a.title) {
      diffs.title = { before: b.title, after: a.title }
    }
    // Check canonical
    if (b.canonical !== a.canonical) {
      diffs.canonical = { before: b.canonical, after: a.canonical }
    }
    // Check robots
    if (b.robots !== a.robots) {
      diffs.robots = { before: b.robots, after: a.robots }
    }
    // Check description
    if (b.metaDescription !== a.metaDescription) {
      diffs.metaDescription = { before: b.metaDescription, after: a.metaDescription }
    }

    if (Object.keys(diffs).length === 0) {
      identicalCount++
      diffReport.push({ file: f, url: b.url, status: "IDENTICAL", diffs })
    } else {
      // If previously null and now populated, it's an intended enhancement
      const isEnhancement = Object.values(diffs).every(
        (d) => d.before === null && d.after !== null
      )

      if (isEnhancement) {
        enhancedCount++
        diffReport.push({ file: f, url: b.url, status: "ENHANCED", diffs })
      } else {
        deviationCount++
        diffReport.push({ file: f, url: b.url, status: "DEVIATION", diffs })
      }
    }
  }

  console.log(`Comparison summary:
Total URLs: ${beforeFiles.length}
Identical: ${identicalCount}
Intended Enhancements (previously missing metadata added): ${enhancedCount}
Deviations: ${deviationCount}`)

  fs.writeFileSync(
    "docs/seo/evidence/snapshot_diff_report.json",
    JSON.stringify(diffReport, null, 2)
  )

  if (deviationCount > 0) {
    console.log("Deviations found:")
    for (const d of diffReport.filter((r) => r.status === "DEVIATION")) {
      console.log(`- ${d.url} (${d.file}):`, d.diffs)
    }
  }
}

run()
