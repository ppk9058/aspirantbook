/**
 * B5 backfill: copy the legacy .content-audit/audit-events.jsonl trail into the
 * AuditEvent table.
 *
 * Safe to run more than once (events are keyed by a hash of their content).
 *
 * Usage:
 *   npx tsx scripts/backfill-audit-events.ts [--file <path>] [--dry-run]
 */
import path from "node:path"

import { backfillContentAuditFromJsonl } from "@/lib/audit/backfill-content-audit"

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const file =
    arg("--file") || path.join(process.cwd(), ".content-audit", "audit-events.jsonl")

  if (process.argv.includes("--dry-run")) {
    console.log(`[backfill-audit-events] dry run: would read ${file}`)
    return
  }

  const result = await backfillContentAuditFromJsonl(file)
  console.log(
    `[backfill-audit-events] ${file}: read=${result.read} inserted=${result.inserted} ` +
      `skipped=${result.skipped} invalid=${result.invalid}`
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill-audit-events] failed:", err)
    process.exit(1)
  })
