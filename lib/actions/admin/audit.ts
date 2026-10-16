"use server"

import { auth } from "@/auth"
import fs from "fs"
import path from "path"

export type AuditAction =
    | "CREATE"
    | "UPDATE"
    | "PUBLISH"
    | "UNPUBLISH"
    | "DELETE"
    | "DUPLICATE"
    | "REORDER"
    | "RESTORE_VERSION"

export type AuditEntityType =
    | "COURSE"
    | "CHAPTER"
    | "LESSON"
    | "ARTICLE"
    | "EXAM_SERIES"
    | "EXAM_TEST"
    | "PYQ_PAPER"
    | "CURRENT_AFFAIRS"

export interface ContentAuditEvent {
    entityId: string
    entityType: AuditEntityType
    action: AuditAction
    userId?: string
    userEmail?: string
    timestamp: string
    details?: Record<string, any>
}

const AUDIT_DIR = path.join(process.cwd(), ".content-audit")
const AUDIT_FILE = path.join(AUDIT_DIR, "audit-events.jsonl")

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
            // Called outside Next.js request context
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

        // Ensure audit directory exists
        if (!fs.existsSync(AUDIT_DIR)) {
            fs.mkdirSync(AUDIT_DIR, { recursive: true })
        }

        fs.appendFileSync(AUDIT_FILE, JSON.stringify(event) + "\n", "utf-8")
        console.log(`[CONTENT_AUDIT] ${action} ${entityType} ${entityId} by ${event.userEmail}`)
        return { success: true }
    } catch (err) {
        console.warn("Failed to write content audit event:", err)
        return { success: false }
    }
}

/**
 * Retrieves the latest content audit events for system diagnostics and history.
 */
export async function getRecentAuditEvents(limit = 20): Promise<ContentAuditEvent[]> {
    try {
        if (!fs.existsSync(AUDIT_FILE)) {
            return []
        }
        const content = fs.readFileSync(AUDIT_FILE, "utf-8")
        const lines = content.trim().split("\n").filter(Boolean)
        const events = lines
            .slice(-limit)
            .map((line) => {
                try {
                    return JSON.parse(line) as ContentAuditEvent
                } catch {
                    return null
                }
            })
            .filter((e): e is ContentAuditEvent => e !== null)
            .reverse()

        return events
    } catch (err) {
        console.warn("Failed to read audit events:", err)
        return []
    }
}
