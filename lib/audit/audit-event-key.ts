import crypto from "crypto"

import type { AuditAction, AuditEntityType } from "@/lib/actions/admin/audit-types"

/**
 * B5: stable identity for an audit event, derived from its content.
 *
 * Used when writing a new event and when replaying the legacy jsonl file, so a
 * backfill can run any number of times without duplicating rows.
 */
export interface AuditEventKeyInput {
    entityId: string
    entityType: AuditEntityType
    action: AuditAction
    userId?: string
    userEmail?: string
    timestamp: string
    details?: unknown
}

export function buildAuditDedupeKey(event: AuditEventKeyInput): string {
    const payload = [
        event.timestamp,
        event.entityType,
        event.entityId,
        event.action,
        event.userId || "",
        event.userEmail || "",
        JSON.stringify(event.details ?? {}),
    ].join("|")
    return crypto.createHash("sha256").update(payload).digest("hex")
}
