import { prisma } from "@/lib/prisma";

export async function logAuditEvent(params: {
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  details?: any;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || "SYSTEM",
        action: params.action,
        targetId: params.targetId || null,
        metadata: params.details ? params.details : undefined,
        ip: params.ip || null,
      },
    });
  } catch (err) {
    // Fail safe: audit log failure should never abort a critical business transaction
    console.warn("[logAuditEvent] Failed to persist audit log entry:", err);
  }
}
