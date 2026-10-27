import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import LiveDemoRoomClient from "@/components/course/LiveDemoRoomClient"
import { formatUtcToIst } from "@/lib/demo/slot-utils"
import { Calendar, Clock, Video, Lock, ArrowRight } from "lucide-react"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [session, course] = await Promise.all([
    auth(),
    prisma.course.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { id: true, title: true, status: true, isPublished: true }
    }),
  ])
  const userRole = session?.user?.role
  const userId = session?.user?.id

  if (!course || !isCourseVisibleToUser(course, userRole, userId)) {
    notFound()
  }

  return { title: `Live Demo - ${course.title}` }
}

export default async function CourseDemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ slot?: string; testMode?: string }>
}) {
  const { slug } = await params
  const { slot: slotIdParam, testMode: testModeParam } = await searchParams
  const [session, course] = await Promise.all([
    auth(),
    prisma.course.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        price: true,
        originalPrice: true,
        discountPercent: true,
        technology: true,
        metadataJson: true,
        status: true,
        isPublished: true,
      },
    }),
  ])

  const isTeacherOrAdmin = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"
  const isTestMode = testModeParam === "true" && isTeacherOrAdmin

  if (!course || !isCourseVisibleToUser(course, session?.user?.role, session?.user?.id)) {
    notFound()
  }

  // 2. Resolve Slot
  let slot = null
  if (slotIdParam) {
    slot = await prisma.demoSlot.findUnique({
      where: { id: slotIdParam },
      include: { _count: { select: { bookings: true } } },
    })
  }

  if (!slot) {
    // Auto-resolve current live or earliest upcoming slot
    slot = await prisma.demoSlot.findFirst({
      where: {
        courseId: course.id,
        status: { in: ["LIVE", "SCHEDULED"] },
      },
      orderBy: [{ status: "desc" }, { startTime: "asc" }],
      include: { _count: { select: { bookings: true } } },
    })
  }

  // 3. Student Booking Verification
  let booking = null
  let bookingRequired = false

  if (!isTeacherOrAdmin && !isTestMode) {
    if (!session?.user?.id) {
      // Must be logged in to enter room
      bookingRequired = true
    } else if (slot) {
      booking = await prisma.demoBooking.findUnique({
        where: {
          studentId_slotId: {
            studentId: session.user.id,
            slotId: slot.id,
          },
        },
      })
      if (!booking) {
        bookingRequired = true
      }
    } else {
      bookingRequired = true
    }
  }

  // If slot not found at all
  if (!slot) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#051322] text-white">
        <div className="max-w-md w-full p-6 text-center space-y-4 rounded-3xl bg-[#081a2f] border border-white/10">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold">Live Demo - No Session Scheduled</h2>
          <p className="text-xs text-gray-400">
            There are currently no active or scheduled live demo sessions for <strong>{course.title}</strong>.
          </p>
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            <span>Back to Course Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  // If booking required and user hasn't booked this slot
  if (bookingRequired) {
    const ist = formatUtcToIst(slot.startTime)
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#051322] text-white">
        <div className="max-w-md w-full p-7 text-center space-y-5 rounded-3xl bg-[#081a2f] border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
              Registration Required
            </span>
            <h2 className="text-2xl font-black text-white leading-tight">
              Book Your Free Demo Slot
            </h2>
            <p className="text-xs text-gray-300">
              Access to this live session for <strong>{course.title}</strong> requires a scheduled demo booking.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Class Topic:</span>
              <span className="font-bold text-white truncate max-w-[200px]">{slot.topic}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Faculty:</span>
              <span className="font-bold text-white">{slot.facultyName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Scheduled Time:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {ist.fullLabel}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href={`/courses/${course.slug}?scheduleDemo=true&slot=${slot.id}`}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Schedule Free Demo for this Slot</span>
            </Link>
            <Link
              href={`/courses/${course.slug}`}
              className="w-full py-2.5 px-4 text-xs font-bold text-gray-400 hover:text-white transition-colors block"
            >
              Return to Course Details
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const userRole = session?.user?.role || "STUDENT"

  return (
    <LiveDemoRoomClient
      course={course}
      slotId={slot.id}
      initialSlot={slot}
      bookingId={booking?.id || null}
      userRole={userRole}
      isTestMode={isTestMode}
    />
  )
}
