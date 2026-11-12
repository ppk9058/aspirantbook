import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  canAccessPaidPaper,
  checkPaperAccess,
  hasActivePass,
  isPaperPaid,
} from "@/lib/pyqs/pyq-access"
import { extractPyqStorageKey } from "@/lib/pyqs/pyq-storage-key"
import { checkTestAccess } from "@/lib/auth/entitlements"
import { prisma } from "@/lib/prisma"

describe("canAccessPaidPaper: pure access decision logic", () => {
  it("allows free paper for unauthenticated guest", () => {
    const res = canAccessPaidPaper({
      userId: null,
      role: null,
      paper: { accessType: "FREE" },
    })
    assert.deepEqual(res, { allowed: true, reason: "FREE" })
  })

  it("allows free paper for student learner", () => {
    const res = canAccessPaidPaper({
      userId: "student-1",
      role: "STUDENT",
      paper: { accessType: "FREE" },
    })
    assert.deepEqual(res, { allowed: true, reason: "FREE" })
  })

  it("denies unauthenticated guest on PAID paper with LOGIN_REQUIRED", () => {
    const res = canAccessPaidPaper({
      userId: null,
      role: null,
      paper: { accessType: "PAID" },
    })
    assert.deepEqual(res, { allowed: false, reason: "LOGIN_REQUIRED" })
  })

  it("denies unauthenticated guest on PASS_ONLY paper with LOGIN_REQUIRED", () => {
    const res = canAccessPaidPaper({
      userId: undefined,
      role: undefined,
      paper: { accessType: "PASS_ONLY" },
    })
    assert.deepEqual(res, { allowed: false, reason: "LOGIN_REQUIRED" })
  })

  it("allows ADMIN on paid paper with ADMIN reason", () => {
    const res = canAccessPaidPaper({
      userId: "admin-1",
      role: "ADMIN",
      paper: { accessType: "PAID" },
    })
    assert.deepEqual(res, { allowed: true, reason: "ADMIN" })
  })

  it("allows SUPER_ADMIN on paid paper (normalized to ADMIN)", () => {
    const res = canAccessPaidPaper({
      userId: "superadmin-1",
      role: "SUPER_ADMIN",
      paper: { accessType: "PAID" },
    })
    assert.deepEqual(res, { allowed: true, reason: "ADMIN" })
  })

  it("allows creator TEACHER on paid paper with OWNER reason", () => {
    const res = canAccessPaidPaper({
      userId: "teacher-creator",
      role: "TEACHER",
      paper: { accessType: "PAID", creatorId: "teacher-creator" },
    })
    assert.deepEqual(res, { allowed: true, reason: "OWNER" })
  })

  it("denies non-creator TEACHER on paid paper if without Pass", () => {
    const res = canAccessPaidPaper({
      userId: "teacher-other",
      role: "TEACHER",
      paper: { accessType: "PAID", creatorId: "teacher-creator" },
      hasPass: false,
    })
    assert.deepEqual(res, { allowed: false, reason: "PASS_REQUIRED" })
  })

  it("allows student with legacy PyqUnlock on paid paper with UNLOCKED reason", () => {
    const res = canAccessPaidPaper({
      userId: "student-1",
      role: "STUDENT",
      paper: { accessType: "PAID" },
      hasUnlock: true,
      hasPass: false,
    })
    assert.deepEqual(res, { allowed: true, reason: "UNLOCKED" })
  })

  it("allows student with active Pass on paid paper with PASS reason", () => {
    const res = canAccessPaidPaper({
      userId: "student-1",
      role: "STUDENT",
      paper: { accessType: "PAID" },
      hasPass: true,
      hasUnlock: false,
    })
    assert.deepEqual(res, { allowed: true, reason: "PASS" })
  })

  it("denies student without Pass or unlock on paid paper with PASS_REQUIRED reason", () => {
    const res = canAccessPaidPaper({
      userId: "student-1",
      role: "STUDENT",
      paper: { accessType: "PAID" },
      hasPass: false,
      hasUnlock: false,
    })
    assert.deepEqual(res, { allowed: false, reason: "PASS_REQUIRED" })
  })

  it("denies student without Pass or unlock on PASS_ONLY paper with PASS_REQUIRED reason", () => {
    const res = canAccessPaidPaper({
      userId: "student-1",
      role: "STUDENT",
      paper: { accessType: "PASS_ONLY" },
      hasPass: false,
      hasUnlock: false,
    })
    assert.deepEqual(res, { allowed: false, reason: "PASS_REQUIRED" })
  })

  it("isPaperPaid correctly classifies PAID and PASS_ONLY", () => {
    assert.equal(isPaperPaid("PAID"), true)
    assert.equal(isPaperPaid("paid"), true)
    assert.equal(isPaperPaid("PASS_ONLY"), true)
    assert.equal(isPaperPaid("pass_only"), true)
    assert.equal(isPaperPaid("FREE"), false)
    assert.equal(isPaperPaid("free"), false)
    assert.equal(isPaperPaid(null), false)
    assert.equal(isPaperPaid(undefined), false)
  })
})

describe("extractPyqStorageKey: object key extraction and validation", () => {
  it("extracts key from virtual-hosted R2/S3 URL", () => {
    const url = "https://aspirantbook-uploads.r2.cloudflarestorage.com/pyq-private/paper-2024.pdf"
    assert.equal(extractPyqStorageKey(url), "pyq-private/paper-2024.pdf")
  })

  it("extracts key from path-style S3 URL", () => {
    const url = "https://s3.us-east-1.amazonaws.com/my-bucket/pyq-private/nested/paper-2024.pdf"
    assert.equal(extractPyqStorageKey(url), "pyq-private/nested/paper-2024.pdf")
  })

  it("extracts key from already relative key", () => {
    assert.equal(extractPyqStorageKey("pyq-private/paper-2024.pdf"), "pyq-private/paper-2024.pdf")
    assert.equal(extractPyqStorageKey("/pyq-private/paper-2024.pdf"), "pyq-private/paper-2024.pdf")
  })

  it("decodes URI-encoded characters in storage URL", () => {
    const url = "https://bucket.host/pyq-private/BPSC%2069th%20Prelims.pdf"
    assert.equal(extractPyqStorageKey(url), "pyq-private/BPSC 69th Prelims.pdf")
  })

  it("rejects path traversal attempts with ..", () => {
    assert.equal(extractPyqStorageKey("https://bucket.host/pyq-private/../secret.env"), null)
    assert.equal(extractPyqStorageKey("pyq-private/../../etc/passwd"), null)
  })

  it("rejects backslashes", () => {
    assert.equal(extractPyqStorageKey("pyq-private\\malicious.pdf"), null)
    assert.equal(extractPyqStorageKey("https://bucket.host/pyq-private\\malicious.pdf"), null)
  })

  it("rejects empty segments with double slashes", () => {
    assert.equal(extractPyqStorageKey("pyq-private//empty.pdf"), null)
  })

  it("rejects URLs without pyq-private segment", () => {
    assert.equal(extractPyqStorageKey("https://bucket.host/public-uploads/document.pdf"), null)
    assert.equal(extractPyqStorageKey("general/document.pdf"), null)
  })

  it("rejects empty filename after pyq-private/", () => {
    assert.equal(extractPyqStorageKey("pyq-private/"), null)
    assert.equal(extractPyqStorageKey("https://bucket.host/pyq-private/"), null)
  })

  it("rejects null, undefined, empty, or non-string input", () => {
    assert.equal(extractPyqStorageKey(null), null)
    assert.equal(extractPyqStorageKey(undefined), null)
    assert.equal(extractPyqStorageKey(""), null)
    assert.equal(extractPyqStorageKey("   "), null)
  })
})

describe("hasActivePass: pass entitlement check against database", () => {
  const origUserFindUnique = prisma.user.findUnique
  const origSubscriptionFindFirst = prisma.subscription.findFirst

  afterEach(() => {
    ;(prisma.user as any).findUnique = origUserFindUnique
    ;(prisma.subscription as any).findFirst = origSubscriptionFindFirst
  })

  it("returns true when user has role PREMIUM in database", async () => {
    ;(prisma.user as any).findUnique = async () => ({ role: "PREMIUM" })
    const result = await hasActivePass("premium-user-1")
    assert.equal(result, true)
  })

  it("returns true when user has role ADMIN in database", async () => {
    ;(prisma.user as any).findUnique = async () => ({ role: "ADMIN" })
    const result = await hasActivePass("admin-user-1")
    assert.equal(result, true)
  })

  it("returns false when no user row and no subscription row exist", async () => {
    ;(prisma.user as any).findUnique = async () => null
    ;(prisma.subscription as any).findFirst = async () => null
    const result = await hasActivePass("ghost-user-1")
    assert.equal(result, false)
  })

  it("captures query arguments to prisma.subscription.findFirst correctly", async () => {
    let capturedArgs: any = null
    ;(prisma.user as any).findUnique = async () => ({ role: "STUDENT" })
    ;(prisma.subscription as any).findFirst = async (args: any) => {
      capturedArgs = args
      return { id: "sub-1" }
    }

    const result = await hasActivePass("student-with-sub")
    assert.equal(result, true)
    assert.ok(capturedArgs, "prisma.subscription.findFirst must be called")
    assert.equal(capturedArgs.where?.userId, "student-with-sub")
    assert.equal(capturedArgs.where?.status, "ACTIVE")
    assert.ok(
      capturedArgs.where?.endDate?.gt instanceof Date,
      "endDate.gt must be an instance of Date"
    )
    assert.deepEqual(capturedArgs.where?.plan, { not: "FREE" })
  })

  it("returns false when prisma throws an error", async () => {
    ;(prisma.user as any).findUnique = async () => {
      throw new Error("Simulated database connection failure")
    }
    const result = await hasActivePass("failing-user-1")
    assert.equal(result, false)
  })
})

describe("checkPaperAccess: paper access orchestration with database lookups", () => {
  const origUserFindUnique = prisma.user.findUnique
  const origSubscriptionFindFirst = prisma.subscription.findFirst
  const origPyqUnlockFindUnique = prisma.pyqUnlock.findUnique

  afterEach(() => {
    ;(prisma.user as any).findUnique = origUserFindUnique
    ;(prisma.subscription as any).findFirst = origSubscriptionFindFirst
    ;(prisma.pyqUnlock as any).findUnique = origPyqUnlockFindUnique
  })

  it("allows user with legacy PyqUnlock record (no pass) with reason UNLOCKED", async () => {
    ;(prisma.user as any).findUnique = async () => ({ role: "STUDENT" })
    ;(prisma.subscription as any).findFirst = async () => null
    ;(prisma.pyqUnlock as any).findUnique = async () => ({ id: "unlock-1" })

    const result = await checkPaperAccess({
      userId: "student-1",
      role: "STUDENT",
      paper: { id: "paper-1", accessType: "PAID", creatorId: "creator-1" },
    })
    assert.deepEqual(result, { allowed: true, reason: "UNLOCKED" })
  })

  it("allows creator TEACHER with reason OWNER without checking pass or unlock", async () => {
    ;(prisma.user as any).findUnique = async () => ({ role: "TEACHER" })
    ;(prisma.subscription as any).findFirst = async () => null
    ;(prisma.pyqUnlock as any).findUnique = async () => null

    const result = await checkPaperAccess({
      userId: "teacher-creator-1",
      role: "TEACHER",
      paper: { id: "paper-1", accessType: "PAID", creatorId: "teacher-creator-1" },
    })
    assert.deepEqual(result, { allowed: true, reason: "OWNER" })
  })

  it("denies non-creator TEACHER without pass or unlock with reason PASS_REQUIRED", async () => {
    ;(prisma.user as any).findUnique = async () => ({ role: "TEACHER" })
    ;(prisma.subscription as any).findFirst = async () => null
    ;(prisma.pyqUnlock as any).findUnique = async () => null

    const result = await checkPaperAccess({
      userId: "teacher-other-1",
      role: "TEACHER",
      paper: { id: "paper-1", accessType: "PAID", creatorId: "teacher-creator-1" },
    })
    assert.deepEqual(result, { allowed: false, reason: "PASS_REQUIRED" })
  })

  it("never queries database for FREE paper", async () => {
    let userQueried = false
    let subQueried = false
    let unlockQueried = false

    ;(prisma.user as any).findUnique = async () => {
      userQueried = true
      return { role: "STUDENT" }
    }
    ;(prisma.subscription as any).findFirst = async () => {
      subQueried = true
      return null
    }
    ;(prisma.pyqUnlock as any).findUnique = async () => {
      unlockQueried = true
      return null
    }

    const result = await checkPaperAccess({
      userId: "student-1",
      role: "STUDENT",
      paper: { id: "paper-free-1", accessType: "FREE", creatorId: "teacher-1" },
    })

    assert.deepEqual(result, { allowed: true, reason: "FREE" })
    assert.equal(userQueried, false, "prisma.user must not be queried for FREE paper")
    assert.equal(subQueried, false, "prisma.subscription must not be queried for FREE paper")
    assert.equal(unlockQueried, false, "prisma.pyqUnlock must not be queried for FREE paper")
  })
})

describe("checkTestAccess: integration gate for CBT tests linked to PYQ papers", () => {
  const origExamTestFindUnique = prisma.examTest.findUnique
  const origPyqPaperFindFirst = prisma.pyqPaper.findFirst
  const origUserFindUnique = prisma.user.findUnique
  const origSubscriptionFindFirst = prisma.subscription.findFirst
  const origPyqUnlockFindUnique = prisma.pyqUnlock.findUnique

  beforeEach(() => {
    // Default examTest mock: accessMode is FREE (the exact condition causing the earlier bypass)
    ;(prisma.examTest as any).findUnique = async () => ({
      id: "test-cbt-1",
      accessMode: "FREE",
      seriesId: "series-1",
      createdById: "teacher-creator",
      series: { isFree: true, isPro: false },
    })
  })

  afterEach(() => {
    ;(prisma.examTest as any).findUnique = origExamTestFindUnique
    ;(prisma.pyqPaper as any).findFirst = origPyqPaperFindFirst
    ;(prisma.user as any).findUnique = origUserFindUnique
    ;(prisma.subscription as any).findFirst = origSubscriptionFindFirst
    ;(prisma.pyqUnlock as any).findUnique = origPyqUnlockFindUnique
  })

  it("denies student without Pass on FREE-mode test linked to a PAID paper", async () => {
    // Linked PyqPaper is PAID
    ;(prisma.pyqPaper as any).findFirst = async () => ({
      id: "paper-paid-1",
      accessType: "PAID",
      creatorId: "teacher-creator",
    })

    // Student has no active Pass or unlock
    ;(prisma.user as any).findUnique = async () => ({ role: "STUDENT" })
    ;(prisma.subscription as any).findFirst = async () => null
    ;(prisma.pyqUnlock as any).findUnique = async () => null

    const result = await checkTestAccess("student-1", "test-cbt-1", "STUDENT")
    assert.equal(result.allowed, false)
    assert.equal(result.reason, "LOCKED")
    assert.equal(result.message, "This paper needs the AspirantBook Pass.")
  })

  it("allows student WITH active Pass on FREE-mode test linked to a PAID paper", async () => {
    ;(prisma.pyqPaper as any).findFirst = async () => ({
      id: "paper-paid-1",
      accessType: "PAID",
      creatorId: "teacher-creator",
    })

    // Student has active subscription
    ;(prisma.user as any).findUnique = async () => ({ role: "STUDENT" })
    ;(prisma.subscription as any).findFirst = async () => ({ id: "sub-active-1" })
    ;(prisma.pyqUnlock as any).findUnique = async () => null

    const result = await checkTestAccess("student-1", "test-cbt-1", "STUDENT")
    assert.equal(result.allowed, true)
    assert.equal(result.reason, "SUBSCRIPTION_ACTIVE")
  })

  it("allows user with role PREMIUM on FREE-mode test linked to a PAID paper", async () => {
    ;(prisma.pyqPaper as any).findFirst = async () => ({
      id: "paper-paid-1",
      accessType: "PAID",
      creatorId: "teacher-creator",
    })

    // User has role PREMIUM in database (hasActivePass resolves true without subscription row)
    ;(prisma.user as any).findUnique = async () => ({ role: "PREMIUM" })
    ;(prisma.subscription as any).findFirst = async () => null
    ;(prisma.pyqUnlock as any).findUnique = async () => null

    const result = await checkTestAccess("premium-user-1", "test-cbt-1", "STUDENT")
    assert.equal(result.allowed, true)
    assert.equal(result.reason, "SUBSCRIPTION_ACTIVE")
  })

  // Note: checkTestAccess evaluates `if (role === "ADMIN") return { allowed: true, reason: "ADMIN_OVERRIDE" }`
  // as an early return at the top of the function (lines 31-32), which covers ADMIN before any examTest
  // or PYQ paper query is executed.
  it("allows ADMIN on FREE-mode test linked to a PAID paper with ADMIN_OVERRIDE", async () => {
    ;(prisma.pyqPaper as any).findFirst = async () => ({
      id: "paper-paid-1",
      accessType: "PAID",
      creatorId: "teacher-creator",
    })

    const result = await checkTestAccess("admin-1", "test-cbt-1", "ADMIN")
    assert.equal(result.allowed, true)
    assert.equal(result.reason, "ADMIN_OVERRIDE")
  })

  it("allows student on FREE-mode test NOT linked to any PYQ paper (preserves existing behavior)", async () => {
    // No linked PyqPaper found
    ;(prisma.pyqPaper as any).findFirst = async () => null

    const result = await checkTestAccess("student-1", "test-cbt-1", "STUDENT")
    assert.equal(result.allowed, true)
    assert.equal(result.reason, "FREE")
  })

  it("allows student on FREE-mode test linked to a FREE PYQ paper", async () => {
    // Linked paper is FREE
    ;(prisma.pyqPaper as any).findFirst = async () => ({
      id: "paper-free-1",
      accessType: "FREE",
      creatorId: "teacher-creator",
    })

    const result = await checkTestAccess("student-1", "test-cbt-1", "STUDENT")
    assert.equal(result.allowed, true)
    assert.equal(result.reason, "FREE")
  })
})
