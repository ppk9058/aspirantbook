"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags"
import { toCourseAccessUser } from "@/lib/auth/course-access"
import { assertManagedCourseForAction } from "@/lib/auth/course-access-server"

export async function publishCourse(courseId: string) {
    const session = await auth()

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        throw new Error("Unauthorized")
    }

    // A8: teachers may only publish their own courses.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "publish")

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
    // B10: publishing changes the tagged course list, not just the route.
    safeRevalidateTags(CACHE_TAGS.courses)
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

    // A8: teachers may only unpublish their own courses.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "unpublish")

    const course = await prisma.course.update({
        where: { id: courseId },
        data: {
            status: "DRAFT",
            isPublished: false,
        },
    })

    revalidatePath("/courses")
    revalidatePath("/admin/courses")
    // B10: publishing changes the tagged course list, not just the route.
    safeRevalidateTags(CACHE_TAGS.courses)
    revalidatePath(`/admin/courses/${courseId}/edit`)
    if (course.slug) {
        revalidatePath(`/courses/${course.slug}`)
    }

    return { success: true, status: "DRAFT", course }
}
