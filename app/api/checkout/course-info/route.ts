import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBatchBySlug } from "@/lib/batches-service"
import { auth } from "@/auth"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"
import { resolveCourseAlias } from "@/lib/courses/slug-aliases"


export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        const userRole = session?.user?.role
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id") || searchParams.get("courseId") || searchParams.get("slug") || searchParams.get("batchId")

        if (!id) {
            return NextResponse.json({ error: "Missing course or batch identifier" }, { status: 400 })
        }

        const resolvedTarget = resolveCourseAlias(id)

        // 1. Try finding in DB
        const course = await prisma.course.findFirst({
            where: {
                OR: [
                    { id: resolvedTarget },
                    { slug: resolvedTarget },
                    { id },
                    { slug: id },
                ],
            },
            include: {
                chapters: {
                    select: {
                        lessons: {
                            select: { id: true },
                        },
                    },
                },
            },
        })

        if (course) {
            if (!isCourseVisibleToUser(course, userRole)) {
                return NextResponse.json({ error: "Course not found" }, { status: 404 })
            }

            const totalLessons = course.chapters.reduce(
                (acc, ch) => acc + (ch.lessons?.length || 0),
                0
            )

            const priceNum = course.price ?? (course.isPremium ? 1999 : 0)
            const isFree = !course.isPremium && (priceNum === 0 || course.price === 0)

            return NextResponse.json({
                success: true,
                type: "course",
                course: {
                    id: course.id,
                    title: course.title,
                    slug: course.slug,
                    description: course.description,
                    thumbnailUrl: course.thumbnailUrl,
                    price: priceNum,
                    originalPrice: course.originalPrice || (isFree ? 1500 : Math.round(priceNum * 1.5)),
                    discountPercent: course.discountPercent || (isFree ? 100 : 35),
                    isFree,
                    isPremium: course.isPremium,
                    totalLessons,
                },
            })
        }

        // 2. Try finding in Batches service
        const batch = await getBatchBySlug(resolvedTarget) || await getBatchBySlug(id)
        if (batch) {
            const priceClean = parseInt(batch.price?.replace(/[^\d]/g, "") || "0", 10)
            const isFree = batch.price?.toLowerCase().includes("free") || priceClean === 0

            return NextResponse.json({
                success: true,
                type: "batch",
                course: {
                    id: batch.id,
                    title: batch.title,
                    slug: batch.slug,
                    description: batch.targetText || "Comprehensive Batch Preparation",
                    thumbnailUrl: batch.image,
                    price: isFree ? 0 : priceClean,
                    originalPrice: batch.originalPrice ? parseInt(batch.originalPrice.replace(/[^\d]/g, "") || "0", 10) : (isFree ? 1500 : priceClean * 1.5),
                    discountPercent: batch.discount ? parseInt(batch.discount.replace(/[^\d]/g, "") || "0", 10) : (isFree ? 100 : 30),
                    isFree,
                    isPremium: !isFree,
                    totalLessons: 20,
                },
            })
        }

        return NextResponse.json({ error: "Course or batch not found" }, { status: 404 })
    } catch (error) {
        console.error("Error fetching course info for checkout:", error)
        return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 })
    }
}
