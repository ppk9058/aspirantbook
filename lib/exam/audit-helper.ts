import { prisma } from "@/lib/prisma"
import { logContentAudit, AuditAction, AuditEntityType } from "@/lib/actions/admin/audit"

export interface MutationAuthResult {
  authorized: boolean
  error?: string
  status?: number
  userId?: string
  role?: string
}

/**
 * Enforces strict authorization for mutations (create, edit, delete, archive, restore, detach, duplicate, bulk, export).
 * ts_demo_role cookie fallback is STRICTLY forbidden in production.
 */
export function verifyMutationAuth({
  session,
  demoRole,
  createdById,
}: {
  session: any
  demoRole?: string | null
  createdById?: string | null
}): MutationAuthResult {
  const isProd = process.env.NODE_ENV === "production"

  // 1. Session check
  let userId = session?.user?.id
  let role = session?.user?.role

  if (!userId || !role) {
    if (isProd) {
      return { authorized: false, error: "Unauthorized: Active session required", status: 401 }
    }
    // Dev only fallback if explicitly provided
    if (demoRole && (demoRole === "ADMIN" || demoRole === "TEACHER")) {
      userId = `demo-${demoRole.toLowerCase()}`
      role = demoRole
    } else {
      return { authorized: false, error: "Unauthorized: Active session required", status: 401 }
    }
  }

  // 2. Role check
  if (role !== "ADMIN" && role !== "TEACHER") {
    return {
      authorized: false,
      error: "Forbidden: Admin or Teacher role required",
      status: 403,
    }
  }

  // 3. Ownership check for teachers
  if (role === "TEACHER" && createdById && createdById !== userId) {
    return {
      authorized: false,
      error: "Forbidden: You do not have permission to modify content created by another author",
      status: 403,
    }
  }

  return { authorized: true, userId, role }
}

/**
 * Writes dual audit logs:
 * 1. File-based content audit log (.content-audit/audit-events.jsonl)
 * 2. Database audit log (prisma.auditLog)
 */
export async function writeDualAuditLog({
  actorId,
  action,
  targetId,
  entityType,
  details,
  ip,
}: {
  actorId: string
  action: AuditAction | string
  targetId: string
  entityType: AuditEntityType
  details?: Record<string, any>
  ip?: string
}) {
  try {
    // 1. Content Audit Log
    await logContentAudit({
      entityId: targetId,
      entityType,
      action: action as AuditAction,
      details,
    })

    // 2. Database Audit Log
    await prisma.auditLog.create({
      data: {
        actorId,
        action: `${entityType}_${action}`,
        targetId,
        metadata: details || undefined,
        ip: ip || "127.0.0.1",
      },
    })
  } catch (err) {
    console.error("[AUDIT_WRITE_ERROR]", err)
  }
}

/**
 * Validates that a child test strictly belongs to the specified package.
 * Prevents Insecure Direct Object Reference (IDOR) attacks across packages.
 */
export function verifyTestBelongsToPackage({
  testSeriesId,
  packageId,
}: {
  testSeriesId?: string | null
  packageId: string
}): { valid: boolean; status?: number; error?: string } {
  if (!testSeriesId || testSeriesId !== packageId) {
    return {
      valid: false,
      status: 403,
      error: "Forbidden: Test does not belong to the specified package (IDOR protected)",
    }
  }
  return { valid: true, status: 200 }
}

/**
 * Determines whether a package or test can be permanently hard deleted or must be soft deleted (archived).
 * If student attempts, active enrollments, or verified purchases exist, returns "archive" to preserve history.
 */
export function decideDeleteAction({
  attemptsCount = 0,
  enrollmentsCount = 0,
  paymentsCount = 0,
}: {
  attemptsCount?: number
  enrollmentsCount?: number
  paymentsCount?: number
}): "archive" | "hard_delete" {
  if (attemptsCount > 0 || enrollmentsCount > 0 || paymentsCount > 0) {
    return "archive"
  }
  return "hard_delete"
}

