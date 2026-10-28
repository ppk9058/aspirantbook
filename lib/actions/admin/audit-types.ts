/**
 * B5: shared types for the content audit trail.
 *
 * Kept out of `audit.ts` so that the server-action module only exports async
 * functions, and so scripts/tests can import the types without pulling in
 * `next-auth`.
 */

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
