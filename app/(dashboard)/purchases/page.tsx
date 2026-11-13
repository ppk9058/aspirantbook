import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAllBatches } from "@/lib/batches-service"
import MyPurchasesClient from "@/components/student/MyPurchasesClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "My Purchases & Subscriptions | AspirantBook",
  description: "View all your enrolled Video Courses, Test Series, Batches, and Unlocked PYQs.",
}

export default async function MyPurchasesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // 1. Fetch user & enrolled courses from database
  let dbEnrollments: any[] = []

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            difficulty: true,
          },
        },
      },
    })
    dbEnrollments = enrollments
  } catch (e) {
    console.warn("DB offline or error loading enrollments on /purchases")
  }

  // 3. Fallback/Default courses if none enrolled in DB
  const defaultCourses =
    dbEnrollments.length > 0
      ? dbEnrollments
      : [
          {
            id: "enrolled-bpsc-1",
            title: "72nd BPSC - Prelims Current Affairs & Bihar Special",
            slug: "72nd-bpsc-prelims-current-affairs",
            difficulty: "INTERMEDIATE",
            thumbnailUrl: "/course-bpsc.svg",
            progress: 65,
          },
          {
            id: "enrolled-py-2",
            title: "Introduction to Python & Computational Problem Solving",
            slug: "intro-to-python",
            difficulty: "BEGINNER",
            thumbnailUrl: "/course-python.svg",
            progress: 30,
          },
        ]

  // 4. Active Test Series
  const defaultTestSeries = [
    {
      id: "ts-bpsc-72nd",
      title: "72nd BPSC CCE Prelims Mock Test Series 2026",
      subtitle: "Full-length 150-question CBT mocks with negative marking & Hindi/English bilingual papers.",
      category: "BPSC 72nd CBT",
      testCount: 25,
      validity: "Dec 2026",
    },
    {
      id: "ts-upsc-csat",
      title: "UPSC Prelims GS & CSAT All India Speed Tests",
      subtitle: "Strictly aligns with UPSC Civil Services Prelims trend analysis and school foundation.",
      category: "UPSC Civil Services",
      testCount: 18,
      validity: "May 2027",
    },
  ]

  // 5. Active Batches
  let activeBatches: any[] = []
  try {
    const allBatches = await getAllBatches()
    activeBatches = allBatches.slice(0, 2)
  } catch (e) {
    activeBatches = [
      {
        id: "batch-sankalp-bpsc",
        title: "BPSC 72nd Foundation Batch 2026 (Prelims + Mains)",
        slug: "bpsc-72nd-foundation",
        classTag: "State PCS",
        scheduleText: "Monday to Friday &bull; 06:00 PM - 08:30 PM",
        targetText: "Comprehensive coverage of GS Paper 1, GS Paper 2 & Essay with daily live classes.",
        teachers: [{ name: "Prof. S. R. Sharma" }],
      },
    ]
  }

  // 6. Active PYQs Unlocked
  const defaultPyqs = [
    {
      id: "pyq-bpsc-25yr",
      title: "BPSC 71st - 47th Past 25 Years Chapter-wise Solved Question Papers",
      examName: "BPSC CCE Prelims",
      year: "2026 Edition",
      description: "Official BPSC answer key verified solutions with high-res printable PDF archives.",
    },
    {
      id: "pyq-cbse-10-10yr",
      title: "CBSE Class 10th Past 10 Years Board Papers (All Delhi & Outside Delhi Sets)",
      examName: "CBSE Board Exams",
      year: "2026 Edition",
      description: "Step-by-step marking scheme solutions for Science, Maths, Social Science & English.",
    },
  ]

  const effectiveUser = {
    id: session.user.id,
    name: session.user.name || null,
    email: session.user.email || null,
    role: session.user.role || "STUDENT",
  }

  return (
    <MyPurchasesClient
      user={effectiveUser}
      enrolledCourses={defaultCourses}
      testSeries={defaultTestSeries}
      batches={activeBatches}
      pyqs={defaultPyqs}
    />
  )
}
