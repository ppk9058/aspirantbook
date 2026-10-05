import { prisma } from "../lib/prisma"

const TARGET_SERIES_IDS = [
  "created-by-teacher-test-route-1791104792939",
  "created-by-teacher-test-route-1791104829004",
  "cuid_series_audit_1791147947390",
  "created-by-teacher-test-route-1791127289612",
  "created-by-teacher-test-route-1791141717360",
  "created-by-teacher-test-route-1791144201018",
  "created-by-teacher-test-route-1791194151824",
]

export async function unpublishSeries(mode: "apply" | "rollback" | "report") {
  console.log(`=== UNPUBLISH TEST SERIES (Mode: ${mode}) ===`)

  // Check state before
  const beforeRows = await prisma.examSeries.findMany({
    where: { id: { in: TARGET_SERIES_IDS } },
    select: { id: true, slug: true, title: true, isPublished: true, updatedAt: true },
  })
  console.log(`Found ${beforeRows.length} target series before operation:`)
  console.table(beforeRows)

  if (mode === "report") {
    console.log("Report-only mode. No changes made.")
    return
  }

  const targetPublished = mode === "rollback" // true if rollback, false if apply
  console.log(`Setting isPublished = ${targetPublished} in a single transaction...`)

  const result = await prisma.$transaction(async (tx) => {
    return tx.examSeries.updateMany({
      where: { id: { in: TARGET_SERIES_IDS } },
      data: { isPublished: targetPublished },
    })
  })

  console.log(`Rows updated: ${result.count}`)

  // Check state after
  const afterRows = await prisma.examSeries.findMany({
    where: { id: { in: TARGET_SERIES_IDS } },
    select: { id: true, slug: true, title: true, isPublished: true, updatedAt: true },
  })
  console.log("Target series state AFTER operation:")
  console.table(afterRows)
}

// Only execute when run directly from CLI
if (require.main === module || process.argv[1]?.endsWith("unpublish-test-series-2026-10-05.ts")) {
  const arg = process.argv[2]
  if (arg === "--apply") {
    unpublishSeries("apply").then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
  } else if (arg === "--rollback") {
    unpublishSeries("rollback").then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
  } else {
    unpublishSeries("report").then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
  }
}
