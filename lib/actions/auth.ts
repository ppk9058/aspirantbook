"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { validatePasswordPolicy } from "@/lib/auth/password-policy"
import {
    sendVerificationEmail,
    verifyAndConsumeEmailVerificationToken,
    sendPasswordResetEmail,
    verifyPasswordResetToken,
    consumePasswordResetToken,
    sendPasswordChangedEmail,
} from "@/lib/auth/tokens"
import { checkRateLimit } from "@/lib/rate-limit"

const RegisterSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phoneNumber: z
        .string()
        .regex(/^[0-9]{10}$/, "Phone must be a valid 10-digit number")
        .optional()
        .or(z.literal("")),
    selectedGoal: z.string().optional().or(z.literal("")),
})

export async function register(prevState: any, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validatedFields = RegisterSchema.safeParse(rawData)

    if (!validatedFields.success) {
        const firstError = validatedFields.error.errors[0]?.message || "Invalid fields"
        return { error: firstError }
    }

    const { email, password, name, phoneNumber, selectedGoal } = validatedFields.data

    // 1. Password policy verification
    const passwordPolicy = validatePasswordPolicy(password)
    if (!passwordPolicy.valid) {
        return { error: passwordPolicy.error }
    }

    // 2. IP Rate limiting
    let clientIp = "127.0.0.1"
    try {
        const { headers } = await import("next/headers")
        const h = await headers()
        clientIp =
            h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            h.get("x-real-ip")?.trim() ||
            "127.0.0.1"
    } catch {
        clientIp = "127.0.0.1"
    }

    const maxAttempts = process.env.APP_ENV === "test" ? 200 : 10
    const rateLimit = await checkRateLimit(`register:${clientIp}`, maxAttempts, 3600)
    if (!rateLimit.allowed) {
        return { error: "Too many registration attempts from this network. Please try again later." }
    }

    const normalizedEmail = email.trim().toLowerCase()
    const cleanPhone = phoneNumber && phoneNumber.trim().length === 10 ? phoneNumber.trim() : null

    try {
        // 3. Duplicate account checks (case-insensitive email, unique phone)
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizedEmail },
                    ...(cleanPhone ? [{ phoneNumber: cleanPhone }] : []),
                ],
            },
            select: { id: true, email: true, phoneNumber: true },
        })

        if (existing) {
            if (cleanPhone && existing.phoneNumber === cleanPhone) {
                return { error: "An account with this phone number already exists." }
            }
            return { error: "An account with this email already exists. Please sign in instead." }
        }

        // 4. Secure Bcrypt hashing (cost 12)
        const hashedPassword = await bcrypt.hash(password, 12)

        // 5. Create user record
        await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                phoneNumber: cleanPhone,
                selectedGoal: selectedGoal || null,
                role: "FREE",
                isActive: true,
                sessionVersion: 1,
                emailVerified: null,
            },
        })

        // 6. Send verification email (logged to dev outbox in dev/test)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://127.0.0.1:3045"
        await sendVerificationEmail(normalizedEmail, appUrl).catch((err) => {
            console.error("[Register] Failed to send verification email:", err)
        })

        return { success: "Account created! A verification link has been sent to your email. Please check your inbox." }
    } catch (error) {
        console.error("Registration error:", error)
        return { error: "Unable to complete registration. Please try again later." }
    }
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
    try {
        await signIn("credentials", {
            ...Object.fromEntries(formData),
            redirect: false,
        })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Invalid credentials."
                default:
                    return "Something went wrong."
            }
        }
        throw error
    }
    // Redirect based on actual user role and sync cookie
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    let target = "/dashboard"
    try {
        const { cookies } = await import("next/headers")
        const cookieStore = await cookies()
        const user = await prisma.user.findUnique({ where: { email }, select: { role: true } })

        if (user?.role === "ADMIN") {
            target = "/admin"
            cookieStore.set("ts_demo_role", "ADMIN", { path: "/", maxAge: 60 * 60 * 24 * 7 })
        } else if (user?.role === "TEACHER") {
            target = "/teacher"
            cookieStore.set("ts_demo_role", "TEACHER", { path: "/", maxAge: 60 * 60 * 24 * 7 })
        } else {
            target = "/dashboard"
            cookieStore.set("ts_demo_role", "STUDENT", { path: "/", maxAge: 60 * 60 * 24 * 7 })
        }
    } catch {
        target = "/dashboard"
    }
    revalidatePath("/", "layout")
    redirect(target)
}

export async function verifyEmailAction(token: string) {
    if (!token || typeof token !== "string") {
        return { success: false, error: "Invalid verification link." }
    }
    const result = await verifyAndConsumeEmailVerificationToken(token)
    if (!result.valid) {
        if (result.reason === "expired") {
            return { success: false, error: "This verification link has expired. Please request a new one." }
        }
        if (result.reason === "used") {
            return { success: false, error: "This verification link has already been used." }
        }
        return { success: false, error: "Invalid verification link." }
    }
    return { success: true, email: result.email }
}

export async function resendVerificationEmailAction(prevState: any, formData: FormData) {
    const rawEmail = formData.get("email") as string
    if (!rawEmail || typeof rawEmail !== "string") {
        return { error: "Please enter your email address." }
    }

    const email = rawEmail.trim().toLowerCase()

    // Rate limiting: max 3 per hour per email/IP
    let clientIp = "127.0.0.1"
    try {
        const { headers } = await import("next/headers")
        const h = await headers()
        clientIp =
            h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            h.get("x-real-ip")?.trim() ||
            "127.0.0.1"
    } catch {
        clientIp = "127.0.0.1"
    }

    const ipLimit = await checkRateLimit(`resend-verify-ip:${clientIp}`, 5, 3600)
    const emailLimit = await checkRateLimit(`resend-verify-email:${email}`, 3, 3600)

    if (!ipLimit.allowed || !emailLimit.allowed) {
        return { error: "Too many verification requests. Please try again in an hour." }
    }

    // Generic safe response to prevent email enumeration
    const genericSuccess = "If an account with this email exists and is unverified, a new verification link has been sent."

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, emailVerified: true },
        })

        if (!user || user.emailVerified) {
            return { success: genericSuccess }
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://127.0.0.1:3045"
        await sendVerificationEmail(email, appUrl)

        return { success: genericSuccess }
    } catch (error) {
        console.error("[ResendVerification] Error:", error)
        return { error: "Unable to process your request. Please try again later." }
    }
}

export async function requestPasswordResetAction(prevState: any, formData: FormData) {
    const rawEmail = formData.get("email") as string
    if (!rawEmail || typeof rawEmail !== "string") {
        return { error: "Please enter your email address." }
    }

    const email = rawEmail.trim().toLowerCase()
    const emailValidation = z.string().email().safeParse(email)
    if (!emailValidation.success) {
        return { error: "Please enter a valid email address." }
    }

    // Rate limiting: 3 per hour per email, 5 per hour per IP (higher in test mode)
    let clientIp = "127.0.0.1"
    try {
        const { headers } = await import("next/headers")
        const h = await headers()
        clientIp =
            h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            h.get("x-real-ip")?.trim() ||
            "127.0.0.1"
    } catch {
        clientIp = "127.0.0.1"
    }

    const isTest = process.env.APP_ENV === "test"
    const maxIp = isTest ? 100 : 5
    const maxEmail = isTest ? 50 : 3

    const ipLimit = await checkRateLimit(`forgot-ip:${clientIp}`, maxIp, 3600)
    const emailLimit = await checkRateLimit(`forgot-email:${email}`, maxEmail, 3600)

    if (!ipLimit.allowed || !emailLimit.allowed) {
        return { error: "Too many password reset requests. Please try again in an hour." }
    }

    // Safe uniform response to prevent user enumeration
    const genericSuccess = "If an account with that email exists, we have sent a password reset link to your inbox."

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, isActive: true },
        })

        if (!user || user.isActive === false) {
            return { success: genericSuccess }
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://127.0.0.1:3045"
        await sendPasswordResetEmail(email, appUrl)

        return { success: genericSuccess }
    } catch (error) {
        console.error("[ForgotPassword] Error:", error)
        return { error: "Unable to process your request. Please try again later." }
    }
}

export async function resetPasswordAction(prevState: any, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const token = (rawData.token as string)?.trim()
    const password = rawData.password as string
    const confirmPassword = rawData.confirmPassword as string

    if (!token) {
        return { error: "Invalid or missing password reset token." }
    }

    if (!password || !confirmPassword) {
        return { error: "Please enter and confirm your new password." }
    }

    if (password !== confirmPassword) {
        return { error: "Passwords do not match." }
    }

    // Password policy check
    const policyResult = validatePasswordPolicy(password)
    if (!policyResult.valid) {
        return { error: policyResult.error }
    }

    try {
        // Validate reset token
        const tokenResult = await verifyPasswordResetToken(token)
        if (!tokenResult.valid || !tokenResult.email) {
            if (tokenResult.reason === "expired") {
                return { error: "This password reset link has expired. Please request a new one." }
            }
            if (tokenResult.reason === "used") {
                return { error: "This password reset link has already been used. Please request a new one." }
            }
            return { error: "Invalid or expired password reset link." }
        }

        // Hash new password with bcrypt cost 12
        const hashedPassword = await bcrypt.hash(password, 12)

        // Update password and increment sessionVersion (invalidates all sessions everywhere)
        await prisma.user.updateMany({
            where: { email: tokenResult.email },
            data: {
                password: hashedPassword,
                sessionVersion: { increment: 1 },
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        })

        // Consume token so it cannot be used again
        await consumePasswordResetToken(token)

        // Dispatch security notification email
        await sendPasswordChangedEmail(tokenResult.email).catch((err) => {
            console.error("[ResetPassword] Notification error:", err)
        })

        return { success: "Your password has been reset successfully! Redirecting to login..." }
    } catch (error) {
        console.error("[ResetPassword] Error:", error)
        return { error: "Unable to reset password. Please try again later." }
    }
}

export async function logoutAllDevicesAction() {
    let session: any = null
    try {
        session = await auth()
    } catch {
        return { error: "Unauthorized" }
    }

    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { sessionVersion: { increment: 1 } },
        })
        return { success: true }
    } catch (err) {
        console.error("[LogoutAllDevices] Error:", err)
        return { error: "Failed to log out from all devices." }
    }
}



