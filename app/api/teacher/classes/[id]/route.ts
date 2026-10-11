import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Login required." }, { status: 401 })
    }

    const isTeacher = session.user.role === "TEACHER"
    const isAdmin = session.user.role === "ADMIN"
    if (!isTeacher && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Teacher or Admin required." }, { status: 403 })
    }

    const slot = await prisma.demoSlot.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        _count: { select: { bookings: true } },
      },
    })

    if (!slot) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 })
    }

    // Ownership check: TEACHER can only see their own slots. Legacy slots (createdById == null) are ADMIN only.
    if (!isAdmin && slot.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden. You do not own this class." }, { status: 403 })
    }

    return NextResponse.json({ success: true, slot })
  } catch (error) {
    console.error("Error fetching class:", error)
    return NextResponse.json({ error: "Failed to fetch class." }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Login required." }, { status: 401 })
    }

    const isTeacher = session.user.role === "TEACHER"
    const isAdmin = session.user.role === "ADMIN"
    if (!isTeacher && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Teacher or Admin required." }, { status: 403 })
    }

    const slot = await prisma.demoSlot.findUnique({
      where: { id },
      include: {
        _count: { select: { bookings: true } },
      },
    })

    if (!slot) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 })
    }

    // Ownership check: Teachers cannot edit another teacher's slot or legacy NULL slots.
    if (!isAdmin && slot.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden. You do not own this class." }, { status: 403 })
    }

    // Only SCHEDULED slots can be edited or cancelled. LIVE or ENDED/CANCELLED slots are blocked.
    if (slot.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: `Cannot modify a class that is ${slot.status}. Only SCHEDULED classes can be edited or cancelled.` },
        { status: 400 }
      )
    }

    const body = await req.json()

    // 1. Soft Cancel Action
    if (body.status === "CANCELLED" || body.action === "cancel") {
      const cancelledSlot = await prisma.demoSlot.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { course: true },
      })
      return NextResponse.json({ success: true, slot: cancelledSlot })
    }

    // 2. Edit Action
    const { topic, courseId, startTimeUtc, durationMinutes } = body
    const updateData: any = {}

    if (topic !== undefined) {
      if (!topic.trim()) {
        return NextResponse.json({ error: "Class topic is required." }, { status: 400 })
      }
      updateData.topic = topic.trim()
    }

    if (courseId !== undefined) {
      if (!courseId) {
        return NextResponse.json({ error: "Course is required." }, { status: 400 })
      }
      updateData.courseId = courseId
    }

    if (startTimeUtc !== undefined) {
      const start = new Date(startTimeUtc)
      if (isNaN(start.getTime()) || start.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Start time must be in the future." }, { status: 400 })
      }
      updateData.startTime = start
    }

    if (durationMinutes !== undefined) {
      updateData.durationMinutes = Number(durationMinutes)
    }

    const updatedSlot = await prisma.demoSlot.update({
      where: { id },
      data: updateData,
      include: { course: true },
    })

    return NextResponse.json({ success: true, slot: updatedSlot })
  } catch (error) {
    console.error("Error updating class:", error)
    return NextResponse.json({ error: "Failed to update class." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Login required." }, { status: 401 })
    }

    const isTeacher = session.user.role === "TEACHER"
    const isAdmin = session.user.role === "ADMIN"
    if (!isTeacher && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Teacher or Admin required." }, { status: 403 })
    }

    const slot = await prisma.demoSlot.findUnique({ where: { id } })
    if (!slot) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 })
    }

    // Ownership check
    if (!isAdmin && slot.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden. You do not own this class." }, { status: 403 })
    }

    // Only SCHEDULED slots can be cancelled
    if (slot.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: `Cannot cancel a class that is ${slot.status}. Only SCHEDULED classes can be cancelled.` },
        { status: 400 }
      )
    }

    // Soft cancel (do NOT hard delete)
    const cancelledSlot = await prisma.demoSlot.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ success: true, slot: cancelledSlot })
  } catch (error) {
    console.error("Error cancelling class:", error)
    return NextResponse.json({ error: "Failed to cancel class." }, { status: 500 })
  }
}
