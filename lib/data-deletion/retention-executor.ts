import { prisma } from "@/lib/prisma";
import {
  RETENTION_ACCOUNT_RECOVERY_DAYS,
  RETENTION_DOUBT_ATTACHMENT_DAYS,
} from "@/lib/config/retention";

export interface DataDeletionExecutionOptions {
  dryRun?: boolean;
  confirm?: boolean;
  actorId?: string;
  requestId?: string;
  now?: Date;
}

export interface DataDeletionExecutionResult {
  dryRun: boolean;
  eligibleRequestIds: string[];
  eligibleUserIds: string[];
  anonymizedUserIds: string[];
  auditLogId?: string;
}

export interface PurgeDoubtAttachmentsOptions {
  dryRun?: boolean;
  confirm?: boolean;
  actorId?: string;
  now?: Date;
}

export interface PurgeDoubtAttachmentsResult {
  dryRun: boolean;
  eligibleDoubtIds: string[];
  purgedDoubtIds: string[];
  purgedCount: number;
  auditLogId?: string;
}

/**
 * Admin-triggered processor for COMPLETED-approved deletion requests.
 * Enforces the 30-day recovery window, then irreversible PII wipe of the user.
 * Payments, Orders, Exam attempts remain untouched.
 * Defaults to dry-run unless confirm === true and dryRun === false.
 */
export async function executeDataDeletion(
  options: DataDeletionExecutionOptions = {}
): Promise<DataDeletionExecutionResult> {
  const isDryRun = options.dryRun !== false || options.confirm !== true;
  const now = options.now || new Date();
  const actorId = options.actorId || "SYSTEM";
  const cutoff = new Date(now.getTime() - RETENTION_ACCOUNT_RECOVERY_DAYS * 86400000);

  const whereClause: any = {
    status: "COMPLETED",
    requestedAt: { lte: cutoff },
  };

  if (options.requestId) {
    whereClause.id = options.requestId;
  }

  const eligibleRequests = await prisma.dataDeletionRequest.findMany({
    where: whereClause,
  });

  const eligibleRequestIds = eligibleRequests.map((r) => r.id);
  const eligibleUserIds = Array.from(
    new Set(eligibleRequests.map((r) => r.userId).filter(Boolean) as string[])
  );

  if (isDryRun) {
    return {
      dryRun: true,
      eligibleRequestIds,
      eligibleUserIds,
      anonymizedUserIds: [],
    };
  }

  const anonymizedUserIds: string[] = [];

  for (const userId of eligibleUserIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) continue;

    // Idempotency: if already anonymized, no-op
    const isAlreadyAnonymized =
      user.isActive === false &&
      user.email.startsWith(`deleted-${userId}@`);

    if (isAlreadyAnonymized) {
      continue;
    }

    const previousEmail = user.email;

    await prisma.$transaction(async (tx) => {
      // 1. Revoke active device sessions
      await tx.deviceSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });

      // 2. Delete push notification device tokens
      await tx.devicePushToken.deleteMany({
        where: { userId },
      });

      // 3. Decouple OAuth provider credentials
      await tx.account.deleteMany({
        where: { userId },
      });

      // 4. Delete password reset and email verification tokens
      await tx.passwordResetToken.deleteMany({
        where: { email: previousEmail },
      });
      await tx.emailVerificationToken.deleteMany({
        where: { email: previousEmail },
      });

      // 5. Deactivate user and anonymize personal identifiers
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted-${userId}@anonymized.trillionskill.local`,
          name: "Deleted User",
          phoneNumber: null,
          password: null,
          image: null,
          selectedGoal: null,
          selectedSubGoal: null,
          sessionVersion: { increment: 1 },
        },
      });
    });

    anonymizedUserIds.push(userId);
  }

  // Exactly one AuditLog row per action
  const auditLog = await prisma.auditLog.create({
    data: {
      actorId,
      action: "DATA_DELETION_PII_WIPE",
      targetId: options.requestId || (eligibleUserIds.length === 1 ? eligibleUserIds[0] : "BULK"),
      metadata: {
        eligibleCount: eligibleUserIds.length,
        anonymizedCount: anonymizedUserIds.length,
        eligibleUserIds,
        anonymizedUserIds,
        executedAt: now.toISOString(),
      },
    },
  });

  return {
    dryRun: false,
    eligibleRequestIds,
    eligibleUserIds,
    anonymizedUserIds,
    auditLogId: auditLog.id,
  };
}

/**
 * Separate purge of doubt attachments older than the configured retention days.
 * Defaults to dry-run unless confirm === true and dryRun === false.
 */
export async function purgeExpiredDoubtAttachments(
  options: PurgeDoubtAttachmentsOptions = {}
): Promise<PurgeDoubtAttachmentsResult> {
  const isDryRun = options.dryRun !== false || options.confirm !== true;
  const now = options.now || new Date();
  const actorId = options.actorId || "SYSTEM";
  const cutoff = new Date(now.getTime() - RETENTION_DOUBT_ATTACHMENT_DAYS * 86400000);

  const eligibleDoubts = await prisma.doubt.findMany({
    where: {
      createdAt: { lte: cutoff },
      attachmentUrl: { not: null },
    },
    select: { id: true },
  });

  const eligibleDoubtIds = eligibleDoubts.map((d) => d.id);

  if (isDryRun) {
    return {
      dryRun: true,
      eligibleDoubtIds,
      purgedDoubtIds: [],
      purgedCount: 0,
    };
  }

  let purgedCount = 0;
  const purgedDoubtIds: string[] = [];

  if (eligibleDoubtIds.length > 0) {
    const updateRes = await prisma.doubt.updateMany({
      where: {
        id: { in: eligibleDoubtIds },
      },
      data: {
        attachmentUrl: null,
        attachmentName: null,
        attachmentType: null,
        attachmentSize: null,
      },
    });
    purgedCount = updateRes.count;
    purgedDoubtIds.push(...eligibleDoubtIds);
  }

  const auditLog = await prisma.auditLog.create({
    data: {
      actorId,
      action: "PURGE_DOUBT_ATTACHMENTS",
      targetId: eligibleDoubtIds.length === 1 ? eligibleDoubtIds[0] : "BULK",
      metadata: {
        purgedCount,
        purgedDoubtIds,
        cutoffDate: cutoff.toISOString(),
        executedAt: now.toISOString(),
      },
    },
  });

  return {
    dryRun: false,
    eligibleDoubtIds,
    purgedDoubtIds,
    purgedCount,
    auditLogId: auditLog.id,
  };
}
