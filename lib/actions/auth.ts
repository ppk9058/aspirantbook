"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { redirect } from "next/navigation"

const RegisterSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function register(prevState: any, formData: FormData) {
    const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData.entries()))

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { email, password, name } = validatedFields.data

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return { error: "Email already in use" }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        console.log("Creating user:", email)
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "FREE", // Default role
            },
        })
        console.log("User created successfully")

        return { success: "Account created! Please log in." }
    } catch (error) {
        console.error("Registration error:", error)
        return { error: "Something went wrong" }
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
    const email = formData.get("email") as string
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
    redirect(target)
}
