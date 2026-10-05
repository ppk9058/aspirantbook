import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizePhoneToE164, formatUtcToIst, isSlotExpired } from "@/lib/demo/slot-utils"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const body = await req.json()
    const { courseId, courseSlug, slotId, phoneNumber, utmSource, utmCampaign } = body

    // 1. Phone Number Validation & Normalization
    const rawPhone = phoneNumber || (session?.user as any)?.phoneNumber || ""
    const normalizedPhone = normalizePhoneToE164(rawPhone)
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit Indian mobile number." },
        { status: 400 }
      )
    }
    const raw10Digits = normalizedPhone.slice(-10)

    // 2. Resolve Course
    let course = null
    if (courseId) {
      course = await prisma.course.findUnique({ where: { id: courseId } })
    }
    if (!course && courseSlug) {
      course = await prisma.course.findUnique({ where: { slug: courseSlug } })
    }
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 })
    }

    // 3. Resolve Demo Slot
    let slot = null
    if (slotId) {
      slot = await prisma.demoSlot.findFirst({
        where: { id: slotId, courseId: course.id },
      })
    }

    // If slotId not provided or slot not found, find the earliest upcoming active slot
    if (!slot) {
      const now = new Date()
      slot = await prisma.demoSlot.findFirst({
        where: {
          courseId: course.id,
          status: { in: ["SCHEDULED", "LIVE"] },
          startTime: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        },
        orderBy: { startTime: "asc" },
      })
    }

    if (!slot) {
      return NextResponse.json(
        { error: "No available demo slot found for this course. Please contact faculty support." },
        { status: 404 }
      )
    }

    // Check if slot has expired or was cancelled
    if (slot.status === "CANCELLED" || slot.status === "ENDED") {
      return NextResponse.json(
        { error: `This demo slot is no longer available (Status: ${slot.status}). Please choose another slot.` },
        { status: 400 }
      )
    }

    if (isSlotExpired(slot.startTime, slot.durationMinutes) && slot.status !== "LIVE") {
      return NextResponse.json(
        { error: "The selected demo slot has already passed. Please choose a future slot." },
        { status: 400 }
      )
    }

    // Check Audience Capacity
    const currentBookingsCount = await prisma.demoBooking.count({
      where: { slotId: slot.id },
    })
    if (currentBookingsCount >= (slot.maxAudience || 100)) {
      return NextResponse.json(
        { error: "This demo slot has reached its maximum audience capacity. Please choose another slot." },
        { status: 400 }
      )
    }

    // 4. Resolve Student (Session or Find/Create by phone)
    let studentId = session?.user?.id
    let studentName = session?.user?.name || "Student"

    if (!studentId) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: raw10Digits },
            { phoneNumber: normalizedPhone },
          ],
        },
      })

      if (existingUser) {
        studentId = existingUser.id
        studentName = existingUser.name || `Student (${raw10Digits.slice(-4)})`
      } else {
        const syntheticEmail = `mobile_${raw10Digits}@aspirantbook.local`
        const newUser = await prisma.user.create({
          data: {
            phoneNumber: raw10Digits,
            email: syntheticEmail,
            name: `Student (${raw10Digits.slice(-4)})`,
            role: "FREE",
          },
        })
        studentId = newUser.id
        studentName = newUser.name || "Student"
      }
    }

    // Format IST labels
    const ist = formatUtcToIst(slot.startTime)
    const baseUrl = process.env.NEXTAUTH_URL || "https://trillionskill.com"
    const demoUrl = `${baseUrl}/courses/${course.slug}/demo`

    // 5. Duplicate Prevention: Check if already booked for this slot
    const existingBooking = await prisma.demoBooking.findUnique({
      where: {
        studentId_slotId: {
          studentId,
          slotId: slot.id,
        },
      },
    })

    if (existingBooking) {
      return NextResponse.json({
        success: true,
        alreadyBooked: true,
        message: "You are already booked for this demo class!",
        bookingId: existingBooking.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        slotId: slot.id,
        slotDate: ist.dateLabel,
        slotTime: ist.timeLabel,
        fullTimeLabel: ist.fullLabel,
        phoneNumber: normalizedPhone,
        demoUrl,
        agoraChannelName: slot.agoraChannelName,
      })
    }

    // 6. Create DemoBooking in Database
    const booking = await prisma.demoBooking.create({
      data: {
        studentId,
        mobile: normalizedPhone,
        slotId: slot.id,
        courseId: course.id,
        status: "BOOKED",
        utmSource: utmSource ? String(utmSource).slice(0, 100) : null,
        utmCampaign: utmCampaign ? String(utmCampaign).slice(0, 100) : null,
      },
    })

    // Backward compatibility: also sync to legacy CourseDemoBooking
    try {
      await prisma.courseDemoBooking.create({
        data: {
          userId: studentId,
          courseId: course.id,
          phoneNumber: raw10Digits,
          slotDate: ist.dateLabel,
          slotTime: ist.timeLabel,
          status: "SCHEDULED",
        },
      })
    } catch (e) {
      // Legacy table failure should never fail the main booking
    }

    // 7. Compose & Queue WhatsApp Message Log (PENDING_TEMPLATE until approved)
    const whatsappPayload = {
      studentName,
      courseName: course.title,
      slotTimeIst: ist.fullLabel,
      demoUrl,
    }

    const whatsappMessage = `*Free Demo Class Confirmed!* 🎓\n\n` +
      `Hello ${studentName}! Your Free Live Demo for *${course.title}* is confirmed for *${ist.fullLabel}*.\n\n` +
      `🔗 *Your Live Class Link:* ${demoUrl}\n\n` +
      `✨ *Special Demo Benefit:* Join on time to unlock special enrollment discounts for full course enrollment.\n\n` +
      `_Team TrillionSkill_`

    await prisma.whatsAppMessageLog.create({
      data: {
        bookingId: booking.id,
        recipientPhone: normalizedPhone,
        templateName: "demo_class_confirmation_v1",
        variablesJson: JSON.stringify(whatsappPayload),
        status: "PENDING_TEMPLATE",
      },
    })

    const encodedText = encodeURIComponent(whatsappMessage)
    const whatsappDirectLink = `https://wa.me/91${raw10Digits}?text=${encodedText}`

    return NextResponse.json({
      success: true,
      alreadyBooked: false,
      bookingId: booking.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      slotId: slot.id,
      slotDate: ist.dateLabel,
      slotTime: ist.timeLabel,
      fullTimeLabel: ist.fullLabel,
      phoneNumber: normalizedPhone,
      demoUrl,
      agoraChannelName: slot.agoraChannelName,
      whatsappMessage,
      whatsappDirectLink,
    })
  } catch (error: any) {
    console.error("Error booking demo slot:", error)
    return NextResponse.json(
      { error: "Failed to schedule demo class. Please try again." },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")
    const courseId = searchParams.get("courseId")

    if (!session?.user?.id) {
      return NextResponse.json({ booked: false })
    }

    // Check if user has an active booking in DemoBooking
    const booking = await prisma.demoBooking.findFirst({
      where: {
        studentId: session.user.id,
        ...(courseId ? { courseId } : {}),
        ...(slug ? { course: { slug } } : {}),
      },
      include: {
        slot: true,
        course: { select: { id: true, slug: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!booking) {
      return NextResponse.json({ booked: false })
    }

    const ist = booking.slot ? formatUtcToIst(booking.slot.startTime) : null

    return NextResponse.json({
      booked: true,
      bookingId: booking.id,
      status: booking.status,
      slotId: booking.slotId,
      agoraChannelName: booking.slot?.agoraChannelName,
      slotStatus: booking.slot?.status,
      slotDate: ist?.dateLabel,
      slotTime: ist?.timeLabel,
      fullTimeLabel: ist?.fullLabel,
      utmSource: booking.utmSource,
      utmCampaign: booking.utmCampaign,
    })
  } catch (error) {
    return NextResponse.json({ booked: false })
  }
}
