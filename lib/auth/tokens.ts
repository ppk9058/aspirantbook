import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes
const VERIFY_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

export function hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex")
}

export function generateCryptoToken(): string {
    return crypto.randomBytes(32).toString("hex")
}

/**
 * Creates a signed, single-use password reset token with SHA-256 hash storage.
 * Invalidates any prior active tokens for that email.
 */
export async function createPasswordResetToken(email: string): Promise<string> {
    const normalizedEmail = email.trim().toLowerCase()
    const rawToken = generateCryptoToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

    // Invalidate existing unused tokens for this email
    await prisma.passwordResetToken.updateMany({
        where: { email: normalizedEmail, used: false },
        data: { used: true },
    }).catch(() => {})

    await prisma.passwordResetToken.create({
        data: {
            email: normalizedEmail,
            tokenHash,
            expiresAt,
            used: false,
        },
    })

    return rawToken
}

export interface VerifyTokenResult {
    valid: boolean
    email?: string
    reason?: "expired" | "used" | "not_found"
}

export async function verifyPasswordResetToken(rawToken: string): Promise<VerifyTokenResult> {
    if (!rawToken || typeof rawToken !== "string" || rawToken.length < 16) {
        return { valid: false, reason: "not_found" }
    }

    const tokenHash = hashToken(rawToken)
    const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
    })

    if (!record) {
        return { valid: false, reason: "not_found" }
    }

    if (record.used) {
        return { valid: false, reason: "used" }
    }

    if (record.expiresAt < new Date()) {
        return { valid: false, reason: "expired" }
    }

    return { valid: true, email: record.email }
}

export async function consumePasswordResetToken(rawToken: string): Promise<boolean> {
    const tokenHash = hashToken(rawToken)
    try {
        await prisma.passwordResetToken.update({
            where: { tokenHash },
            data: { used: true },
        })
        return true
    } catch {
        return false
    }
}

/**
 * Creates an email verification token with 24h expiry.
 */
export async function createEmailVerificationToken(email: string): Promise<string> {
    const normalizedEmail = email.trim().toLowerCase()
    const rawToken = generateCryptoToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_MS)

    await prisma.emailVerificationToken.updateMany({
        where: { email: normalizedEmail, used: false },
        data: { used: true },
    }).catch(() => {})

    await prisma.emailVerificationToken.create({
        data: {
            email: normalizedEmail,
            tokenHash,
            expiresAt,
            used: false,
        },
    })

    return rawToken
}

export async function verifyAndConsumeEmailVerificationToken(rawToken: string): Promise<VerifyTokenResult> {
    if (!rawToken || typeof rawToken !== "string") {
        return { valid: false, reason: "not_found" }
    }

    const tokenHash = hashToken(rawToken)
    const record = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
    })

    if (!record) {
        return { valid: false, reason: "not_found" }
    }

    if (record.used) {
        return { valid: false, reason: "used" }
    }

    if (record.expiresAt < new Date()) {
        return { valid: false, reason: "expired" }
    }

    // Mark used and verify user
    await prisma.emailVerificationToken.update({
        where: { tokenHash },
        data: { used: true },
    })

    await prisma.user.updateMany({
        where: { email: record.email },
        data: { emailVerified: new Date() },
    })

    return { valid: true, email: record.email }
}

export async function sendVerificationEmail(email: string, baseUrl: string): Promise<boolean> {
    const token = await createEmailVerificationToken(email)
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`

    const res = await sendEmail({
        to: email,
        subject: "Verify your email address - TrillionSkill",
        text: `Please verify your email address by visiting: ${verifyUrl}`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Verify your TrillionSkill Account</h2>
            <p>Thank you for registering. Please click the button below to verify your email address:</p>
            <p style="margin: 30px 0;">
                <a href="${verifyUrl}" style="background-color: #1448d8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
            </p>
            <p style="color: #666; font-size: 12px;">This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.</p>
        </div>
        `,
    })

    return res.success
}

export async function sendPasswordResetEmail(email: string, baseUrl: string): Promise<boolean> {
    const token = await createPasswordResetToken(email)
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    const res = await sendEmail({
        to: email,
        subject: "Reset your TrillionSkill password",
        text: `Reset your password by visiting: ${resetUrl}`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to choose a new password:</p>
            <p style="margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #1448d8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
            </p>
            <p style="color: #666; font-size: 12px;">This link will expire in 30 minutes and can only be used once. If you did not request a password reset, please ignore this email.</p>
        </div>
        `,
    })

    return res.success
}

export async function sendPasswordChangedEmail(email: string): Promise<boolean> {
    const res = await sendEmail({
        to: email,
        subject: "Your TrillionSkill password was changed",
        text: `Your password has been successfully updated. If you did not make this change, please contact support immediately.`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Changed Successfully</h2>
            <p>This is a confirmation that your password has been successfully updated.</p>
            <p>All previous sessions on other devices have been invalidated for your security.</p>
            <p style="color: #666; font-size: 12px;">If you did not make this change, please contact support or reset your password immediately.</p>
        </div>
        `,
    })

    return res.success
}
