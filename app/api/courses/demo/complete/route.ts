import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const body = await req.json()
    const { slug, courseId } = body

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    if (!courseId && !slug) {
      return NextResponse.json({ error: "Missing required courseId or slug." }, { status: 400 })
    }

    const userId = session.user.id

    // Resolve course
    let course = null
    if (courseId) {
      course = await prisma.course.findUnique({ where: { id: courseId } })
    }
    if (!course && slug) {
      course = await prisma.course.findUnique({ where: { slug } })
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 })
    }

    // 1. Mark demo booking as COMPLETED for this user
    await prisma.courseDemoBooking.updateMany({
      where: {
        userId,
        courseId: course.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    }).catch(() => {})

    // 2. Add course to Student's My Batches only if free course
    let enrollment = null
    const isFree = !course.isPremium && (!course.price || course.price === 0)
    if (isFree) {
      enrollment = await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
        create: {
          userId,
          courseId: course.id,
          enrolledAt: new Date(),
          completedAt: new Date(), // Marks demo watched
        },
        update: {
          completedAt: new Date(),
        },
      })
    }

    // 3. Resolve active coupon dynamically if configured on the course
    let couponCode: string | null = null
    let couponDiscount: number | null = null

    try {
      const activeCoupon = await prisma.coupon.findFirst({
        where: {
          isActive: true,
          OR: [
            { courseId: course.id },
            { courseId: null },
          ],
          validUntil: { gt: new Date() },
        },
        orderBy: { discountValue: "desc" },
      })

      if (activeCoupon) {
        couponCode = activeCoupon.code
        couponDiscount = activeCoupon.discountValue
      }
    } catch (e) {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: "Demo completed! Added to your My Batches watched section.",
      courseTitle: course.title,
      courseSlug: course.slug,
      enrollmentId: enrollment?.id || null,
      redirectUrl: "/my-learning",
      couponCode,
      couponDiscount,
    })
  } catch (error) {
    console.error("Error completing demo session:", error)
    return NextResponse.json({ error: "Failed to mark demo completed." }, { status: 500 })
  }
}
