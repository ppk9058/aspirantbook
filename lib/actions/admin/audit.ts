"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { buildAuditDedupeKey } from "@/lib/audit/audit-event-key"
import type {
    AuditAction,
    AuditEntityType,
    ContentAuditEvent,
} from "./audit-types"

export type { AuditAction, AuditEntityType, ContentAuditEvent } from "./audit-types"

/**
 * B5: the content audit trail lives in the AuditEvent table.
 *
 * It used to be appended to `.content-audit/audit-events.jsonl` with
 * fs.appendFileSync and read back synchronously, which only works on a single
 * writable machine: on serverless the file is read-only and each instance would
 * write its own copy, so the trail an admin reviewed was never the whole story.
 *
 * The event identity is a hash of its content, so replaying the same event
 * (including the one-time jsonl backfill) is idempotent.
 */
/**
 * Records a content audit trail entry for content lifecycle operations.
 */
export async function logContentAudit({
    entityId,
    entityType,
    action,
    details = {},
}: {
    entityId: string
    entityType: AuditEntityType
    action: AuditAction
    details?: Record<string, any>
}) {
    try {
        let session = null
        try {
            session = await auth()
        } catch {
            // Called outside a Next.js request context (scripts, tests).
        }

        const event: ContentAuditEvent = {
            entityId,
            entityType,
            action,
            userId: session?.user?.id || "system",
            userEmail: session?.user?.email || "anonymous",
            timestamp: new Date().toISOString(),
            details,
        }

        await prisma.auditEvent.create({
            data: {
                dedupeKey: buildAuditDedupeKey(event),
                entityId: event.entityId,
                entityType: event.entityType,
                action: event.action,
                userId: event.userId ?? null,
                userEmail: event.userEmail ?? null,
                details: (details ?? {}) as any,
            },
        })

        console.log(`[CONTENT_AUDIT] ${action} ${entityType} ${entityId} by ${event.userEmail}`)
        return { success: true as const }
    } catch (err) {
        console.error("Failed to write content audit event:", err)
        return { success: false as const }
    }
}

export interface GetAuditEventsOptions {
    limit?: number
    offset?: number
    entityType?: AuditEntityType
    entityId?: string
}

const MAX_AUDIT_PAGE_SIZE = 200

/**
 * Retrieves content audit events, newest first, with real pagination.
 *
 * The old reader loaded the entire file into memory and sliced the last N
 * lines; this reads one page from the database.
 */
export async function getRecentAuditEvents(
    limitOrOptions: number | GetAuditEventsOptions = 20,
    offset = 0
): Promise<ContentAuditEvent[]> {
    const options: GetAuditEventsOptions =
        typeof limitOrOptions === "number" ? { limit: limitOrOptions, offset } : limitOrOptions

    const take = Math.min(Math.max(1, options.limit ?? 20), MAX_AUDIT_PAGE_SIZE)
    const skip = Math.max(0, options.offset ?? 0)

    try {
        const rows = await prisma.auditEvent.findMany({
            where: {
                ...(options.entityType ? { entityType: options.entityType } : {}),
                ...(options.entityId ? { entityId: options.entityId } : {}),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take,
            skip,
        })

        return rows.map((row) => ({
            entityId: row.entityId,
            entityType: row.entityType as AuditEntityType,
            action: row.action as AuditAction,
            userId: row.userId ?? undefined,
            userEmail: row.userEmail ?? undefined,
            timestamp: row.createdAt.toISOString(),
            details: (row.details ?? {}) as Record<string, any>,
        }))
    } catch (err) {
        console.error("Failed to read audit events:", err)
        return []
    }
}

/** Total number of stored audit events, for pagination controls. */
export async function countAuditEvents(options: Omit<GetAuditEventsOptions, "limit" | "offset"> = {}) {
    return prisma.auditEvent.count({
        where: {
            ...(options.entityType ? { entityType: options.entityType } : {}),
            ...(options.entityId ? { entityId: options.entityId } : {}),
        },
    })
}
