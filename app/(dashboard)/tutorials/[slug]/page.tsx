import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

export default async function TutorialSlugPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const session = await auth()
    const userRole = session?.user?.role
    const userId = session?.user?.id

    const course = await prisma.course.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
        select: { id: true, slug: true, status: true, isPublished: true },
    })

    if (!course || !isCourseVisibleToUser(course, userRole, userId)) {
        notFound()
    }

    // Redirect to the canonical course tutorial overview (/courses/[slug])
    redirect(`/courses/${course.slug || course.id}`)
}
