"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function publishCourse(courseId: string) {
    const session = await auth()

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        throw new Error("Unauthorized")
    }

    // Update course status to PUBLISHED
    const course = await prisma.course.update({
        where: { id: courseId },
        data: {
            status: "PUBLISHED",
            isPublished: true,
        },
    })

    // Revalidate pages to show the new course
    revalidatePath("/courses")
    revalidatePath("/admin/courses")
    revalidatePath(`/admin/courses/${courseId}/edit`)
    if (course.slug) {
        revalidatePath(`/courses/${course.slug}`)
    }

    return { success: true, status: "PUBLISHED", course }
}

export async function unpublishCourse(courseId: string) {
    const session = await auth()

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        throw new Error("Unauthorized")
    }

    const course = await prisma.course.update({
        where: { id: courseId },
        data: {
            status: "DRAFT",
            isPublished: false,
        },
    })

    revalidatePath("/courses")
    revalidatePath("/admin/courses")
    revalidatePath(`/admin/courses/${courseId}/edit`)
    if (course.slug) {
        revalidatePath(`/courses/${course.slug}`)
    }

    return { success: true, status: "DRAFT", course }
}
