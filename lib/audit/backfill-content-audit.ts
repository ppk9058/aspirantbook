import fs from "node:fs/promises"

import { prisma } from "@/lib/prisma"
import { buildAuditDedupeKey } from "@/lib/audit/audit-event-key"
import type {
    AuditAction,
    AuditEntityType,
    ContentAuditEvent,
} from "@/lib/actions/admin/audit-types"

/**
 * B5: one-time backfill of the legacy `.content-audit/audit-events.jsonl` file
 * into the AuditEvent table.
 *
 * Idempotent by construction: each line is stored under a hash of its own
 * content (`dedupeKey`), and `skipDuplicates` makes a second run a no-op. Lines
 * that are not valid JSON, or that are missing the entity/action fields, are
 * reported and skipped rather than aborting the whole file.
 */
export interface BackfillResult {
    read: number
    inserted: number
    skipped: number
    invalid: number
}

export async function backfillContentAuditFromJsonl(filePath: string): Promise<BackfillResult> {
    const result: BackfillResult = { read: 0, inserted: 0, skipped: 0, invalid: 0 }

    let content: string
    try {
        content = await fs.readFile(filePath, "utf-8")
    } catch (err: any) {
        if (err?.code === "ENOENT") return result
        throw err
    }

    const lines = content.split("\n").map((line) => line.trim()).filter(Boolean)
    const rows: Array<{
        dedupeKey: string
        entityId: string
        entityType: string
        action: string
        userId: string | null
        userEmail: string | null
        details: any
        createdAt: Date
    }> = []
    const seen = new Set<string>()

    for (const line of lines) {
        result.read += 1
        let parsed: ContentAuditEvent
        try {
            parsed = JSON.parse(line) as ContentAuditEvent
        } catch {
            result.invalid += 1
            continue
        }
        if (!parsed?.entityId || !parsed?.entityType || !parsed?.action || !parsed?.timestamp) {
            result.invalid += 1
            continue
        }

        const createdAt = new Date(parsed.timestamp)
        if (Number.isNaN(createdAt.getTime())) {
            result.invalid += 1
            continue
        }

        const dedupeKey = buildAuditDedupeKey({
            ...parsed,
            entityType: parsed.entityType as AuditEntityType,
            action: parsed.action as AuditAction,
        })
        if (seen.has(dedupeKey)) {
            result.skipped += 1
            continue
        }
        seen.add(dedupeKey)

        rows.push({
            dedupeKey,
            entityId: parsed.entityId,
            entityType: parsed.entityType,
            action: parsed.action,
            userId: parsed.userId ?? null,
            userEmail: parsed.userEmail ?? null,
            details: parsed.details ?? {},
            createdAt,
        })
    }

    // createMany with skipDuplicates makes the backfill safe to re-run.
    const created = await prisma.auditEvent.createMany({
        data: rows,
        skipDuplicates: true,
    })
    result.inserted = created.count
    result.skipped += rows.length - created.count

    return result
}
