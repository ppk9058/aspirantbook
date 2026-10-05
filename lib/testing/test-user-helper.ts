import fs from "fs"
import path from "path"
import { prisma } from "../prisma"

const MANIFEST_PATH = path.join(process.cwd(), ".test-users-manifest.json")

function loadManifest(): string[] {
    try {
        if (fs.existsSync(MANIFEST_PATH)) {
            const raw = fs.readFileSync(MANIFEST_PATH, "utf8")
            return JSON.parse(raw)
        }
    } catch {}
    return []
}

function saveManifest(ids: string[]) {
    try {
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(ids, null, 2), "utf8")
    } catch (e) {
        console.warn("Could not save test user manifest:", e)
    }
}

export interface CreateTestUserOptions {
    prefix?: string
    role?: "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
    name?: string
    phoneNumber?: string
    email?: string
}

export async function createTestUser(options: CreateTestUserOptions = {}) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 7)
    const prefix = options.prefix || "test"

    const id = `u-${prefix}-${timestamp}-${random}`
    const email = options.email || `test_${prefix}_${timestamp}_${random}@example.test`
    const randomPhoneSuffix = Math.floor(1000 + Math.random() * 9000)
    const phoneNumber = options.phoneNumber || `9${String(timestamp).slice(-5)}${randomPhoneSuffix}`
    const role = options.role || "FREE"
    const name = options.name || `Test User ${prefix}`

    const user = await prisma.user.create({
        data: {
            id,
            email,
            phoneNumber,
            role,
            name,
        },
    })

    // Record in gitignored manifest
    const manifest = loadManifest()
    manifest.push(user.id)
    saveManifest(manifest)

    return user
}

export async function teardownTestUsers(specificUserIds?: string[]) {
    const manifest = loadManifest()
    const targetIds = specificUserIds && specificUserIds.length > 0 ? specificUserIds : manifest

    if (targetIds.length === 0) return { deletedCount: 0 }

    // Deletion in strict foreign-key order
    await prisma.couponRedemption.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.demoChatMessage.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.demoStageSession.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.courseDemoBooking.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.demoBooking.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { userId: { in: targetIds } } } }).catch(() => {})
    await prisma.examAttempt.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.examSeriesEnrollment.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.progress.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.userAchievement.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.submission.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.assessmentAttempt.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.review.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.notification.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.payment.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.enrollment.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.subscription.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})
    await prisma.account.deleteMany({ where: { userId: { in: targetIds } } }).catch(() => {})

    const res = await prisma.user.deleteMany({ where: { id: { in: targetIds } } }).catch(() => ({ count: 0 }))

    // Remove deleted from manifest
    const remaining = manifest.filter((id) => !targetIds.includes(id))
    saveManifest(remaining)

    return { deletedCount: res.count }
}
