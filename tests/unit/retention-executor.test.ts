import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import {
  RETENTION_ACCOUNT_RECOVERY_DAYS,
  RETENTION_DOUBT_ATTACHMENT_DAYS,
  RETENTION_EXAM_ANSWERS_INDEFINITE,
  RETENTION_FINANCIAL_YEARS,
} from "@/lib/config/retention";
import {
  executeDataDeletion,
  purgeExpiredDoubtAttachments,
} from "@/lib/data-deletion/retention-executor";

const CANONICAL_TEST_DB =
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test?schema=public";
process.env.DATABASE_URL = process.env.DATABASE_URL || CANONICAL_TEST_DB;
process.env.DIRECT_URL = process.env.DIRECT_URL || CANONICAL_TEST_DB;

describe("R12-K: Data deletion and retention executor on real Postgres", () => {
  const createdUserIds: string[] = [];
  const createdDoubtIds: string[] = [];
  const createdRequestIds: string[] = [];
  const createdPaymentIds: string[] = [];

  after(async () => {
    // Cleanup created test records
    if (createdDoubtIds.length > 0) {
      await prisma.doubt.deleteMany({ where: { id: { in: createdDoubtIds } } }).catch(() => {});
    }
    if (createdPaymentIds.length > 0) {
      await prisma.payment.deleteMany({ where: { id: { in: createdPaymentIds } } }).catch(() => {});
    }
    if (createdRequestIds.length > 0) {
      await prisma.dataDeletionRequest.deleteMany({ where: { id: { in: createdRequestIds } } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await prisma.devicePushToken.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await prisma.deviceSession.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }
  });

  it("K-R12-01: Retention configuration exports named constants", () => {
    assert.equal(RETENTION_ACCOUNT_RECOVERY_DAYS, 30);
    assert.equal(RETENTION_EXAM_ANSWERS_INDEFINITE, true);
    assert.equal(RETENTION_FINANCIAL_YEARS, 8);
    assert.equal(RETENTION_DOUBT_ATTACHMENT_DAYS, 90);
  });

  it("K-R12-02: Dry-run mode by default changes nothing in the database", async () => {
    const user = await prisma.user.create({
      data: {
        email: `k_test_dryrun_${Date.now()}@example.com`,
        name: "Dryrun Test User",
        phoneNumber: `999${Math.floor(1000000 + Math.random() * 9000000)}`,
        isActive: true,
      },
    });
    createdUserIds.push(user.id);

    // Request is COMPLETED and older than 30 days
    const oldDate = new Date(Date.now() - 35 * 86400000);
    const req = await prisma.dataDeletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        status: "COMPLETED",
        requestedAt: oldDate,
        processedAt: oldDate,
      },
    });
    createdRequestIds.push(req.id);

    // Dry-run execution
    const res = await executeDataDeletion({
      dryRun: true,
      confirm: false,
      actorId: "test_admin",
      requestId: req.id,
    });

    assert.equal(res.dryRun, true);
    assert.ok(res.eligibleUserIds.includes(user.id));
    assert.equal(res.anonymizedUserIds.length, 0);

    // Verify user was NOT modified
    const checkUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(checkUser?.isActive, true);
    assert.equal(checkUser?.name, "Dryrun Test User");
    assert.equal(checkUser?.email, user.email);
  });

  it("K-R12-03: Respects 30-day recovery window: requests under 30 days old are not eligible", async () => {
    const user = await prisma.user.create({
      data: {
        email: `k_test_recent_${Date.now()}@example.com`,
        name: "Recent Request User",
        isActive: true,
      },
    });
    createdUserIds.push(user.id);

    // Request is COMPLETED but only 5 days old (well within 30-day window)
    const recentDate = new Date(Date.now() - 5 * 86400000);
    const req = await prisma.dataDeletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        status: "COMPLETED",
        requestedAt: recentDate,
        processedAt: recentDate,
      },
    });
    createdRequestIds.push(req.id);

    const res = await executeDataDeletion({
      dryRun: false,
      confirm: true,
      actorId: "test_admin",
      requestId: req.id,
    });

    assert.equal(res.eligibleUserIds.length, 0, "Requests within recovery window must not be eligible");
    assert.equal(res.anonymizedUserIds.length, 0);

    // Verify user is untouched
    const checkUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(checkUser?.isActive, true);
    assert.equal(checkUser?.name, "Recent Request User");
  });

  it("K-R12-04 & K-R12-05 & K-R12-06: Irreversible PII wipe anonymizes target user, leaves payments and other users untouched", async () => {
    // Target user to be wiped
    const targetUser = await prisma.user.create({
      data: {
        email: `k_test_target_${Date.now()}@example.com`,
        name: "Target PII User",
        phoneNumber: `988${Math.floor(1000000 + Math.random() * 9000000)}`,
        password: "hashedPassword123",
        image: "https://example.com/avatar.jpg",
        isActive: true,
        sessionVersion: 1,
      },
    });
    createdUserIds.push(targetUser.id);

    // Other user who should remain completely untouched
    const otherUser = await prisma.user.create({
      data: {
        email: `k_test_other_${Date.now()}@example.com`,
        name: "Other Untouched User",
        phoneNumber: `977${Math.floor(1000000 + Math.random() * 9000000)}`,
        isActive: true,
      },
    });
    createdUserIds.push(otherUser.id);

    // Payment record for target user - MUST REMAIN UNTOUCHED
    const payment = await prisma.payment.create({
      data: {
        userId: targetUser.id,
        amount: 499,
        currency: "INR",
        status: "COMPLETED",
        paymentProvider: "RAZORPAY",
        externalId: `pay_test_${Date.now()}`,
      },
    });
    createdPaymentIds.push(payment.id);

    // Push token and session for target user
    await prisma.devicePushToken.create({
      data: {
        userId: targetUser.id,
        token: `push_tok_${Date.now()}`,
        platform: "android",
      },
    });
    await prisma.deviceSession.create({
      data: {
        userId: targetUser.id,
        refreshTokenHash: `hash_${Date.now()}`,
        familyId: `fam_${Date.now()}`,
        platform: "android",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    // Request is COMPLETED and 35 days old
    const oldDate = new Date(Date.now() - 35 * 86400000);
    const req = await prisma.dataDeletionRequest.create({
      data: {
        userId: targetUser.id,
        email: targetUser.email,
        status: "COMPLETED",
        requestedAt: oldDate,
        processedAt: oldDate,
      },
    });
    createdRequestIds.push(req.id);

    // Execute with confirm
    const res = await executeDataDeletion({
      dryRun: false,
      confirm: true,
      actorId: "admin_exec",
      requestId: req.id,
    });

    assert.equal(res.dryRun, false);
    assert.ok(res.anonymizedUserIds.includes(targetUser.id));

    // Verify target user is anonymized
    const wipedUser = await prisma.user.findUnique({ where: { id: targetUser.id } });
    assert.equal(wipedUser?.isActive, false);
    assert.equal(wipedUser?.name, "Deleted User");
    assert.equal(wipedUser?.email, `deleted-${targetUser.id}@anonymized.trillionskill.local`);
    assert.equal(wipedUser?.phoneNumber, null);
    assert.equal(wipedUser?.password, null);
    assert.equal(wipedUser?.image, null);
    assert.equal(wipedUser?.sessionVersion, 2, "sessionVersion must be incremented");

    // Verify sessions revoked and push tokens deleted
    const pushCount = await prisma.devicePushToken.count({ where: { userId: targetUser.id } });
    assert.equal(pushCount, 0, "Push tokens must be deleted");
    const activeSessions = await prisma.deviceSession.count({
      where: { userId: targetUser.id, revokedAt: null },
    });
    assert.equal(activeSessions, 0, "All sessions must be revoked");

    // Verify payment is UNTOUCHED
    const checkPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    assert.ok(checkPayment, "Payment record must NOT be deleted");
    assert.equal(checkPayment?.userId, targetUser.id);
    assert.equal(Number(checkPayment?.amount), 499);

    // Verify other user is UNTOUCHED
    const checkOther = await prisma.user.findUnique({ where: { id: otherUser.id } });
    assert.equal(checkOther?.isActive, true);
    assert.equal(checkOther?.name, "Other Untouched User");
  });

  it("K-R12-07: Writes exactly one AuditLog row per action", async () => {
    const user = await prisma.user.create({
      data: {
        email: `k_test_audit_${Date.now()}@example.com`,
        name: "Audit User",
        isActive: true,
      },
    });
    createdUserIds.push(user.id);

    const oldDate = new Date(Date.now() - 35 * 86400000);
    const req = await prisma.dataDeletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        status: "COMPLETED",
        requestedAt: oldDate,
        processedAt: oldDate,
      },
    });
    createdRequestIds.push(req.id);

    const auditBefore = await prisma.auditLog.count({
      where: { action: "DATA_DELETION_PII_WIPE" },
    });

    await executeDataDeletion({
      dryRun: false,
      confirm: true,
      actorId: "super_admin_1",
      requestId: req.id,
    });

    const auditAfter = await prisma.auditLog.count({
      where: { action: "DATA_DELETION_PII_WIPE" },
    });
    assert.equal(auditAfter, auditBefore + 1, "Must write exactly one AuditLog row");
  });

  it("K-R12-08: Idempotent: second execution on the same user is a no-op", async () => {
    const user = await prisma.user.create({
      data: {
        email: `k_test_idemp_${Date.now()}@example.com`,
        name: "Idempotent User",
        isActive: true,
      },
    });
    createdUserIds.push(user.id);

    const oldDate = new Date(Date.now() - 35 * 86400000);
    const req = await prisma.dataDeletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        status: "COMPLETED",
        requestedAt: oldDate,
        processedAt: oldDate,
      },
    });
    createdRequestIds.push(req.id);

    // First execution
    const res1 = await executeDataDeletion({
      dryRun: false,
      confirm: true,
      actorId: "admin",
      requestId: req.id,
    });
    assert.equal(res1.anonymizedUserIds.length, 1);

    // Second execution
    const res2 = await executeDataDeletion({
      dryRun: false,
      confirm: true,
      actorId: "admin",
      requestId: req.id,
    });
    assert.equal(res2.anonymizedUserIds.length, 0, "Second run must be a no-op");
  });

  it("K-R12-09: Purge doubt attachments: dry-run makes no changes, confirm purges doubts older than 90 days", async () => {
    const oldDate = new Date(Date.now() - 95 * 86400000);
    const recentDate = new Date(Date.now() - 10 * 86400000);

    const oldDoubt = await prisma.doubt.create({
      data: {
        studentName: "Old Doubt Student",
        subject: "Physics",
        questionText: "Old question with attachment",
        attachmentName: "diagram.png",
        attachmentUrl: "https://s3.example.com/diagram.png",
        attachmentType: "image/png",
        attachmentSize: "1024",
        createdAt: oldDate,
      },
    });
    createdDoubtIds.push(oldDoubt.id);

    const recentDoubt = await prisma.doubt.create({
      data: {
        studentName: "Recent Doubt Student",
        subject: "Chemistry",
        questionText: "Recent question with attachment",
        attachmentName: "formula.png",
        attachmentUrl: "https://s3.example.com/formula.png",
        attachmentType: "image/png",
        attachmentSize: "2048",
        createdAt: recentDate,
      },
    });
    createdDoubtIds.push(recentDoubt.id);

    // Dry-run
    const dryRes = await purgeExpiredDoubtAttachments({
      dryRun: true,
      confirm: false,
      actorId: "admin",
    });
    assert.equal(dryRes.dryRun, true);
    assert.ok(dryRes.eligibleDoubtIds.includes(oldDoubt.id));
    assert.ok(!dryRes.eligibleDoubtIds.includes(recentDoubt.id));
    assert.equal(dryRes.purgedCount, 0);

    // Check old doubt still has attachment after dry-run
    const checkOldDoubt1 = await prisma.doubt.findUnique({ where: { id: oldDoubt.id } });
    assert.equal(checkOldDoubt1?.attachmentUrl, "https://s3.example.com/diagram.png");

    // Real purge
    const purgeRes = await purgeExpiredDoubtAttachments({
      dryRun: false,
      confirm: true,
      actorId: "admin",
    });
    assert.equal(purgeRes.dryRun, false);
    assert.ok(purgeRes.purgedDoubtIds.includes(oldDoubt.id));
    assert.ok(!purgeRes.purgedDoubtIds.includes(recentDoubt.id));

    // Old doubt attachments cleared
    const checkOldDoubt2 = await prisma.doubt.findUnique({ where: { id: oldDoubt.id } });
    assert.equal(checkOldDoubt2?.attachmentUrl, null);
    assert.equal(checkOldDoubt2?.attachmentName, null);

    // Recent doubt attachment remains intact
    const checkRecentDoubt = await prisma.doubt.findUnique({ where: { id: recentDoubt.id } });
    assert.equal(checkRecentDoubt?.attachmentUrl, "https://s3.example.com/formula.png");
  });
});
