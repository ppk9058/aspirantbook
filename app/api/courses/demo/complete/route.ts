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

    // 2. Add course to Student's My Batches (Enrollment with watched/completed state)
    const enrollment = await prisma.enrollment.upsert({
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

    // 3. Increment course enrollment count
    await prisma.course.update({
      where: { id: course.id },
      data: { enrollmentCount: { increment: 1 } },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Demo completed! Added to your My Batches watched section.",
      courseTitle: course.title,
      courseSlug: course.slug,
      enrollmentId: enrollment.id,
      redirectUrl: "/my-learning",
      couponCode: "DEMO30",
      couponDiscount: 30,
    })
  } catch (error) {
    console.error("Error completing demo session:", error)
    return NextResponse.json({ error: "Failed to mark demo completed." }, { status: 500 })
  }
}
