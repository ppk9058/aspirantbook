/**
 * Centralized Audit Logging Service for aspirantbook
 * Tracks sensitive administrative, teacher, and payment operations for accountability.
 */

export interface AuditLogEntry {
  id: string
  actorId: string
  actorName: string
  actorRole: string
  action: string
  resource: string
  timestamp: string
  metadata?: Record<string, any>
  ipAddress?: string
}

// In-memory audit log store with initial seeded activity
const AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "audit-1",
    actorId: "admin-1",
    actorName: "Super Admin",
    actorRole: "ADMIN",
    action: "course.publish",
    resource: "course:physics-mechanics-6",
    timestamp: "2026-09-10 05:30 AM",
    metadata: { title: "Motion and Distances", status: "PUBLISHED" },
  },
  {
    id: "audit-2",
    actorId: "teacher-1",
    actorName: "Dr. Arvind Sharma",
    actorRole: "TEACHER",
    action: "class.schedule",
    resource: "class:half-yearly-6",
    timestamp: "2026-09-10 05:45 AM",
    metadata: { scheduledStartTime: "Today, 05:00 PM", durationMinutes: 60 },
  },
  {
    id: "audit-3",
    actorId: "teacher-1",
    actorName: "Dr. Arvind Sharma",
    actorRole: "TEACHER",
    action: "chat.disable",
    resource: "classroom:half-yearly-6",
    timestamp: "2026-09-10 06:15 AM",
    metadata: { reason: "Derivation segment focus" },
  },
  {
    id: "audit-4",
    actorId: "student-104",
    actorName: "Rohan Patel",
    actorRole: "STUDENT",
    action: "payment.success",
    resource: "batch:champs-6",
    timestamp: "2026-09-10 06:20 AM",
    metadata: { amount: 3999, gateway: "Razorpay", orderId: "order_998124" },
  },
]

export async function logAuditAction(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
  const newLog: AuditLogEntry = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" }),
    ...entry,
  }
  AUDIT_LOGS.unshift(newLog)
  if (AUDIT_LOGS.length > 500) AUDIT_LOGS.pop()
  return newLog
}

export async function logAuditEvent(params: {
  userId: string
  userName: string
  userRole: string
  action: string
  target: string
  details?: Record<string, any>
}): Promise<AuditLogEntry> {
  return logAuditAction({
    actorId: params.userId,
    actorName: params.userName,
    actorRole: params.userRole,
    action: params.action,
    resource: params.target,
    metadata: params.details,
  })
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLogEntry[]> {
  return AUDIT_LOGS.slice(0, limit)
}
